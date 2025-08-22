
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import type { Incident } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function IncidentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [incidentData, setIncidentData] = useState<Partial<Incident>>({});
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchData(currentClubId);
          }
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "clubs", currentClubId, "incidents"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const incidentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(incidentsList);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las incidencias." });
    }
    setLoading(false);
  };
  
  const handleOpenModal = (mode: 'add' | 'edit', incident?: Incident) => {
    setModalMode(mode);
    setIncidentData(incident || { date: new Date().toISOString().split('T')[0], type: 'Comportamiento', status: 'Abierta', involved: [] });
    setIsModalOpen(true);
  };

  const handleSaveIncident = async () => {
    if (!clubId || !incidentData.type || !incidentData.date) {
      toast({ variant: "destructive", title: "Error", description: "Fecha y tipo son obligatorios." });
      return;
    }
    setSaving(true);
    
    try {
      if (modalMode === 'edit' && incidentData.id) {
        const incidentRef = doc(db, "clubs", clubId, "incidents", incidentData.id);
        await updateDoc(incidentRef, incidentData);
        toast({ title: "Incidencia actualizada", description: "Los detalles de la incidencia han sido guardados." });
      } else {
        await addDoc(collection(db, "clubs", clubId, "incidents"), incidentData);
        toast({ title: "Incidencia Creada", description: "La nueva incidencia ha sido registrada." });
      }
      setIsModalOpen(false);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error saving incident:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la incidencia." });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteIncident = async () => {
    if (!clubId || !incidentToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "clubs", clubId, "incidents", incidentToDelete.id));
      toast({ title: "Incidencia eliminada", description: "La incidencia ha sido eliminada." });
      setIncidentToDelete(null);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting incident:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la incidencia." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Registro de Incidencias</h1>
          <p className="text-muted-foreground">Gestiona y documenta todas las incidencias del club.</p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Historial de Incidencias</CardTitle>
            <Button onClick={() => handleOpenModal('add')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Incidencia
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Involucrados</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.length > 0 ? (
                    incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>{format(new Date(incident.date), "d 'de' LLLL, yyyy", { locale: es })}</TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{incident.involved.join(', ')}</TableCell>
                        <TableCell>
                          <Badge variant={incident.status === 'Resuelta' ? 'secondary' : incident.status === 'En Progreso' ? 'outline' : 'destructive'}>{incident.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenModal('edit', incident)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setIncidentToDelete(incident)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">No hay incidencias registradas.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Registrar Nueva Incidencia' : 'Editar Incidencia'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha de la Incidencia</Label>
                <Input id="date" type="date" value={incidentData.date?.split('T')[0] || ''} onChange={(e) => setIncidentData(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Incidencia</Label>
                <Select value={incidentData.type} onValueChange={(value) => setIncidentData(prev => ({ ...prev, type: value as Incident['type'] }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lesión">Lesión</SelectItem>
                    <SelectItem value="Comportamiento">Comportamiento</SelectItem>
                    <SelectItem value="Administrativa">Administrativa</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="involved">Personas Involucradas</Label>
              <Input id="involved" placeholder="Nombres separados por coma" value={incidentData.involved?.join(', ') || ''} onChange={(e) => setIncidentData(prev => ({ ...prev, involved: e.target.value.split(',').map(s => s.trim()) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" placeholder="Describe detalladamente lo ocurrido..." value={incidentData.description || ''} onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={incidentData.status} onValueChange={(value) => setIncidentData(prev => ({ ...prev, status: value as Incident['status'] }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar estado..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abierta">Abierta</SelectItem>
                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                    <SelectItem value="Resuelta">Resuelta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveIncident} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Incidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!incidentToDelete} onOpenChange={(open) => !open && setIncidentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente el registro de la incidencia.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncident} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
