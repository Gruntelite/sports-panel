
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, writeBatch, doc } from "firebase/firestore";
import type { FileRequestBatch, FileRequest } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, FileClock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function RequestHistory() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<FileRequestBatch[]>([]);
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});
  const [clubId, setClubId] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<FileRequestBatch | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchClubId = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setClubId(userDoc.data().clubId);
        }
      }
      setLoading(false);
    };

    fetchClubId();
  }, []);

  useEffect(() => {
    if (!clubId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const batchesQuery = query(
          collection(db, "fileRequestBatches"),
          where("clubId", "==", clubId),
          orderBy("createdAt", "desc")
        );
        const batchesSnapshot = await getDocs(batchesQuery);
        const batchesData = batchesSnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as FileRequestBatch)
        );
        setBatches(batchesData);

        const counts: Record<string, number> = {};
        for (const batch of batchesData) {
          const requestsQuery = query(
            collection(db, "fileRequests"),
            where("batchId", "==", batch.id),
            where("status", "==", "completed")
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          counts[batch.id] = requestsSnapshot.size;
        }
        setCompletedCounts(counts);
      } catch (error) {
        console.error("Error fetching request history:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el historial de solicitudes.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [clubId, toast]);
  
  const handleDeleteBatch = async () => {
    if (!batchToDelete || !clubId) return;
    setDeleting(true);
    
    try {
        const batch = writeBatch(db);

        // Delete the batch document
        const batchRef = doc(db, "fileRequestBatches", batchToDelete.id);
        batch.delete(batchRef);
        
        // Find and delete all associated requests
        const requestsQuery = query(collection(db, 'fileRequests'), where('batchId', '==', batchToDelete.id));
        const requestsSnapshot = await getDocs(requestsQuery);
        requestsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        
        toast({ title: "Lote de solicitudes eliminado."});
        setBatches(prev => prev.filter(b => b.id !== batchToDelete.id));

    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el lote de solicitudes." });
    } finally {
        setDeleting(false);
        setBatchToDelete(null);
    }
  }


  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Historial de Solicitudes</CardTitle>
        <CardDescription>
          Aquí puedes ver el estado de las solicitudes de archivos que has enviado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
            <FileClock className="h-10 w-10 mb-2"/>
            <p>No has enviado ninguna solicitud de archivos todavía.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => {
              const completed = completedCounts[batch.id] || 0;
              const total = batch.totalSent;
              const progress = total > 0 ? (completed / total) * 100 : 0;
              return (
                <div key={batch.id} className="border p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{batch.documentTitle}</h3>
                      <p className="text-sm text-muted-foreground">
                        Solicitado el {format(batch.createdAt.toDate(), "d 'de' LLLL, yyyy", { locale: es })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setBatchToDelete(batch)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Progress value={progress} />
                  <p className="text-sm font-medium text-right">
                    {completed} de {total} completados
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el lote de solicitudes para "{batchToDelete?.documentTitle}" y todos sus registros asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
