"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { FileRequest } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileCheck2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { uploadFileFromTokenAction } from "@/lib/upload-action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type UploadItem = {
    docTitle: string;
    file: File | null;
    isUploading: boolean;
    isSubmitted: boolean;
    requestId: string;
};

async function validateToken(token: string): Promise<FileRequest[] | null> {
    try {
        const q = query(collection(db, "fileRequests"), where("token", "==", token), where("status", "==", "pending"));
        const requestSnap = await getDocs(q);
        
        if (!requestSnap.empty) {
            return requestSnap.docs.map(d => ({ id: d.id, ...d.data() } as FileRequest));
        }
        return null;
    } catch (error) {
        console.error("Error validating token:", error);
        return null;
    }
}

export default function UploadFilePage() {
    const params = useParams();
    const token = params.token as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [fileRequests, setFileRequests] = useState<FileRequest[] | null>(null);
    const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
    const [clubInfo, setClubInfo] = useState<{name: string, logoUrl: string | null} | null>(null);
    const [isAllSubmitted, setIsAllSubmitted] = useState(false);
    const [userName, setUserName] = useState("");

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        const processToken = async () => {
            const requests = await validateToken(token);
            setFileRequests(requests);

            if (requests && requests.length > 0) {
                const firstRequest = requests[0];
                setUserName(firstRequest.userName);
                setUploadItems(requests.map(req => ({
                    docTitle: req.documentTitle,
                    file: null,
                    isUploading: false,
                    isSubmitted: false,
                    requestId: req.id,
                })));

                const clubDocRef = doc(db, "clubs", firstRequest.clubId);
                const clubDocSnap = await getDoc(clubDocRef);
                if (clubDocSnap.exists()) {
                    const settingsRef = doc(db, "clubs", firstRequest.clubId, "settings", "config");
                    const settingsSnap = await getDoc(settingsRef);
                    setClubInfo({
                        name: clubDocSnap.data().name || 'Club',
                        logoUrl: settingsSnap.exists() ? settingsSnap.data().logoUrl : null,
                    });
                }
            }
            setLoading(false);
        };
        
        processToken();

    }, [token]);
    
    useEffect(() => {
        if (uploadItems.length > 0 && uploadItems.every(item => item.isSubmitted)) {
            setIsAllSubmitted(true);
        }
    }, [uploadItems]);

    const handleFileChange = (index: number, file: File | null) => {
        setUploadItems(prev => prev.map((item, i) => i === index ? { ...item, file } : item));
    };

    const handleFileSubmit = async (index: number) => {
        const item = uploadItems[index];
        if (!item.file || !token) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo." });
            return;
        }

        setUploadItems(prev => prev.map((it, i) => i === index ? { ...it, isUploading: true } : it));
        
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("token", token);
        formData.append("requestId", item.requestId);
        
        const result = await uploadFileFromTokenAction(formData);
        
        if (result.success) {
            toast({ title: "¡Archivo Subido!", description: `El archivo ${item.docTitle} se ha subido correctamente.` });
            setUploadItems(prev => prev.map((it, i) => i === index ? { ...it, isSubmitted: true, isUploading: false } : it));
        } else {
            toast({ variant: "destructive", title: "Error al subir", description: result.error });
            setUploadItems(prev => prev.map((it, i) => i === index ? { ...it, isUploading: false } : it));
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!fileRequests) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <div className="mx-auto inline-block p-3 rounded-full mb-4">
                           <AlertTriangle className="h-12 w-12 text-destructive"/>
                        </div>
                        <CardTitle className="text-2xl">Enlace no válido o caducado</CardTitle>
                        <CardDescription>Este enlace para subir un archivo no es válido o ya ha sido utilizado. Por favor, solicita un nuevo enlace a tu club.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
     if (isAllSubmitted) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <div className="mx-auto inline-block p-3 rounded-full mb-4">
                           <FileCheck2 className="h-12 w-12 text-green-500"/>
                        </div>
                        <CardTitle className="text-2xl">¡Archivos Recibidos!</CardTitle>
                        <CardDescription>Gracias por tu colaboración. El club ha recibido tus archivos correctamente. Ya puedes cerrar esta página.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    

    return (
         <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                   {clubInfo?.logoUrl ? (
                        <Image src={clubInfo.logoUrl} alt={clubInfo.name} width={80} height={80} className="mx-auto rounded-md"/>
                    ) : (
                        <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
                           <Logo />
                        </div>
                    )}
                    <h2 className="text-xl font-semibold pt-2">{clubInfo?.name}</h2>
                    <CardTitle className="text-2xl">Subida de Archivos</CardTitle>
                    <CardDescription>
                        Hola, {userName}. Sube aquí la documentación solicitada.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {uploadItems.map((item, index) => (
                        <div key={item.requestId} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                            {item.isSubmitted && (
                                <div className="absolute inset-0 bg-green-500/10 rounded-lg flex items-center justify-center">
                                    <FileCheck2 className="h-16 w-16 text-green-500"/>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor={`file-upload-${index}`} className="font-semibold text-lg">{item.docTitle}</Label>
                                <Input 
                                    id={`file-upload-${index}`} 
                                    type="file" 
                                    onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                                    disabled={item.isUploading || item.isSubmitted}
                                />
                                <p className="text-xs text-muted-foreground">Tamaño máximo: 10 MB.</p>
                            </div>
                            <Button 
                                onClick={() => handleFileSubmit(index)} 
                                className="w-full" 
                                disabled={!item.file || item.isUploading || item.isSubmitted}
                            >
                                {item.isUploading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Subiendo...</>
                                ) : item.isSubmitted ? (
                                    <><FileCheck2 className="mr-2 h-4 w-4"/> Subido</>
                                ) : (
                                    <><Upload className="mr-2 h-4 w-4"/> Subir {item.docTitle}</>
                                )}
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
