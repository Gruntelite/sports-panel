
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
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

async function validateToken(token: string): Promise<FileRequest | null> {
    try {
        const requestRef = doc(db, "fileRequests", token);
        const requestSnap = await getDoc(requestRef);
        
        if (requestSnap.exists() && requestSnap.data().status === 'pending') {
            return { id: requestSnap.id, ...requestSnap.data() } as FileRequest;
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
    const [submitting, setSubmitting] = useState(false);
    const [fileRequest, setFileRequest] = useState<FileRequest | null>(null);
    const [clubInfo, setClubInfo] = useState<{name: string, logoUrl: string | null} | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        const processToken = async () => {
            const request = await validateToken(token);
            setFileRequest(request);

            if (request) {
                const clubDocRef = doc(db, "clubs", request.clubId);
                const clubDocSnap = await getDoc(clubDocRef);
                if (clubDocSnap.exists()) {
                    const settingsRef = doc(db, "clubs", request.clubId, "settings", "config");
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

    const handleFileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file || !token) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo." });
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("token", token);
        
        const result = await uploadFileFromTokenAction(formData);
        
        if (result.success) {
            toast({ title: "¡Archivo Subido!", description: "Gracias, hemos recibido tu archivo correctamente." });
            setIsSubmitted(true);
        } else {
            toast({ variant: "destructive", title: "Error al subir", description: result.error });
        }

        setSubmitting(false);
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!fileRequest) {
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
    
     if (isSubmitted) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <div className="mx-auto inline-block p-3 rounded-full mb-4">
                           <FileCheck2 className="h-12 w-12 text-green-500"/>
                        </div>
                        <CardTitle className="text-2xl">¡Archivo Recibido!</CardTitle>
                        <CardDescription>Gracias por tu colaboración. El club ha recibido tu archivo correctamente. Ya puedes cerrar esta página.</CardDescription>
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
                    <CardTitle className="text-2xl">Subida de Archivo</CardTitle>
                    <CardDescription>
                        Hola, {fileRequest.userName}. Sube aquí el documento: <span className="font-semibold text-foreground">{fileRequest.documentTitle}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {fileRequest.message && (
                        <Alert className="mb-6">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Mensaje del Club</AlertTitle>
                            <AlertDescription>
                                {fileRequest.message}
                            </AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleFileSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload">Selecciona tu archivo</Label>
                            <Input id="file-upload" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                             <p className="text-xs text-muted-foreground">Tamaño máximo: 10 MB.</p>
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting || !file}>
                            {submitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Subiendo...</>
                            ) : (
                                <><Upload className="mr-2 h-4 w-4"/> Subir Archivo</>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
