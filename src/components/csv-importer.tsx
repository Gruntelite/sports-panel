
"use client";

import { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Loader2, Upload, Database, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from "@/lib/firebase";
import { importDataAction } from '@/lib/actions';
import { doc, getDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";


type ImporterProps = {
    importerType: 'players' | 'coaches' | 'staff' | 'socios';
    requiredColumns: { key: string, label: string }[];
    onImportSuccess: () => void;
}

export function CsvImporter({ importerType, requiredColumns, onImportSuccess }: ImporterProps) {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();
    const [clubId, setClubId] = useState<string | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    useEffect(() => {
        const fetchClubId = async () => {
            const user = auth.currentUser;
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setClubId(userDocSnap.data().clubId);
                }
            }
        };

        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                fetchClubId();
            }
        });
        
        return () => unsubscribe();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setIsParsing(true);
            setData([]); 
            setHeaders([]);
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setHeaders(results.meta.fields || []);
                    setData(results.data);
                    setIsParsing(false);
                },
                error: (error: any) => {
                    toast({ variant: 'destructive', title: "Error al leer el archivo", description: error.message });
                    setIsParsing(false);
                }
            });
        }
    };

    const handleImport = async () => {
        if (!clubId) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo identificar el club actual."});
             return;
        }
        setIsImporting(true);
        const result = await importDataAction({
            clubId: clubId,
            importerType,
            data
        });

        if (result.success) {
            toast({
                title: "¡Importación completada!",
                description: `Se han importado ${result.count} registros correctamente.`,
            });
            onImportSuccess();
            // Reset state
            setFile(null);
            setData([]);
            setHeaders([]);
            setIsPreviewModalOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: "Error en la importación",
                description: result.error
            });
        }
        setIsImporting(false);
    };

    const columnMismatch = useMemo(() => {
        if (headers.length === 0) return false;
        const requiredKeys = requiredColumns.map(c => c.key);
        // This checks if all required keys are present and in the correct order at the start of the file.
        // It allows extra columns at the end, which will be ignored.
        return !requiredKeys.every((key, i) => key === headers[i]);
    }, [headers, requiredColumns]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Importar {importerType}</CardTitle>
                <CardDescription>
                    Sube un archivo CSV para importar múltiples registros a la vez.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="space-y-2 flex-grow">
                        <label htmlFor="csv-upload" className="font-medium">Sube tu archivo CSV</label>
                        <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isParsing} className="max-w-md"/>
                    </div>

                    {isParsing && <div className="flex items-center gap-2 text-muted-foreground pt-8"><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</div>}
                    
                    {data.length > 0 && !isParsing && (
                        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="self-end">
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Ver Vista Previa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-7xl">
                                <DialogHeader>
                                    <DialogTitle>Vista Previa de la Importación</DialogTitle>
                                    <DialogDescription>
                                        Revisa los datos antes de importarlos. Hay {data.length} filas para importar.
                                    </DialogDescription>
                                </DialogHeader>
                                {columnMismatch && (
                                    <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-md flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 mt-0.5"/>
                                        <div>
                                            <h4 className="font-bold">Error en las Columnas</h4>
                                            <p className="text-sm">El archivo CSV no tiene las columnas correctas o no están en el orden adecuado. Por favor, revisa la guía de abajo y vuelve a subir el archivo.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="overflow-auto max-h-[60vh] border rounded-md">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-muted/95">
                                            <TableRow>
                                                {headers.map(header => <TableHead key={header} className="whitespace-nowrap">{requiredColumns.find(c => c.key === header)?.label || header}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.map((row, rowIndex) => (
                                                <TableRow key={rowIndex}>
                                                    {headers.map(header => <TableCell key={header} className="whitespace-nowrap">{String(row[header])}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <DialogFooter>
                                     <DialogClose asChild>
                                        <Button variant="secondary">Cerrar</Button>
                                    </DialogClose>
                                    <Button onClick={handleImport} disabled={isImporting || columnMismatch}>
                                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                        Confirmar e Importar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
