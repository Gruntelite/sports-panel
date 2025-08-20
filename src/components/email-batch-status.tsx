
"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Loader2, RefreshCw, Send, CheckCircle, AlertCircle, Hourglass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EmailBatch = {
    id: string;
    createdAt: { seconds: number; nanoseconds: number; };
    status: 'pending' | 'processing' | 'completed' | 'failed';
    recipients: {
        id: string;
        status: 'pending' | 'sent' | 'failed';
    }[];
}

export function EmailBatchStatus() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [batches, setBatches] = useState<EmailBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { toast } = useToast();

    const fetchBatches = useCallback(async (currentClubId: string) => {
        if (!currentClubId) return;
        setRefreshing(true);
        try {
            const batchesQuery = query(
                collection(db, "clubs", currentClubId, "emailBatches"),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(batchesQuery);
            const fetchedBatches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EmailBatch));
            setBatches(fetchedBatches);
        } catch (error) {
            console.error("Error fetching email batches:", error);
            toast({
                variant: "destructive",
                title: "Error al Cargar Lotes",
                description: "No se pudieron cargar los lotes de envío de correos."
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const currentClubId = userDocSnap.data().clubId;
                    setClubId(currentClubId);
                    if (currentClubId) {
                       fetchBatches(currentClubId);
                    } else {
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [fetchBatches]);

    const getBatchStatus = (batch: EmailBatch) => {
        const sentCount = batch.recipients.filter(r => r.status === 'sent').length;
        const failedCount = batch.recipients.filter(r => r.status === 'failed').length;
        const total = batch.recipients.length;
        const progress = total > 0 ? ((sentCount + failedCount) / total) * 100 : 0;

        let statusText = "Pendiente";
        let StatusIcon = Hourglass;
        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";

        switch (batch.status) {
            case 'processing':
                statusText = "Procesando";
                StatusIcon = Loader2;
                badgeVariant = "default";
                break;
            case 'completed':
                statusText = "Completado";
                StatusIcon = CheckCircle;
                badgeVariant = "secondary";
                break;
            case 'failed':
                 statusText = "Fallido";
                 StatusIcon = AlertCircle;
                 badgeVariant = "destructive";
                 break;
            case 'pending':
            default:
                 statusText = "Pendiente";
                 StatusIcon = Hourglass;
                 badgeVariant = "outline";
                 break;
        }

        return { sentCount, failedCount, total, progress, statusText, StatusIcon, badgeVariant };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Estado de los Envíos</CardTitle>
                    <CardDescription>
                        Monitoriza el progreso de tus solicitudes de actualización de datos.
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => clubId && fetchBatches(clubId)} disabled={refreshing}>
                    {refreshing ? (
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Actualizar
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {batches.length > 0 ? (
                        batches.map(batch => {
                            const { sentCount, failedCount, total, progress, statusText, StatusIcon, badgeVariant } = getBatchStatus(batch);
                            return (
                                <div key={batch.id} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold">
                                                Lote de envío - {new Date(batch.createdAt.seconds * 1000).toLocaleString('es-ES')}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                {sentCount} de {total} enviados ({failedCount > 0 ? `${failedCount} fallidos` : '0 fallidos'})
                                            </p>
                                        </div>
                                         <Badge variant={badgeVariant} className={batch.status === 'processing' ? "animate-pulse" : ""}>
                                            <StatusIcon className={`mr-2 h-4 w-4 ${batch.status === 'processing' ? 'animate-spin' : ''}`} />
                                            {statusText}
                                        </Badge>
                                    </div>
                                    <Progress value={progress} />
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <Send className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay lotes de envío</h3>
                            <p className="mt-1 text-sm text-gray-500">Cuando envíes una solicitud de actualización, su estado aparecerá aquí.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
