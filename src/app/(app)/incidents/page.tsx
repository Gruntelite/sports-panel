
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
  DialogTrigger,
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
import { auth, db, storage } from "@/lib/firebase";
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
  Timestamp,
} from "firebase/firestore";
import type { Incident, Protocol } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
  Download,
  Upload,
  FileText,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from "uuid";


function IncidentsTab() {
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
   )
}


function ProtocolsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [protocolNameToSave, setProtocolNameToSave] = useState("");
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null);

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const protocolsQuery = query(collection(db, "clubs", currentClubId, "protocols"), orderBy("createdAt", "desc"));
      const protocolsSnapshot = await getDocs(protocolsQuery);
      const protocolsList = protocolsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Protocol)
      );
      setProtocols(protocolsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los protocolos.",
      });
    }
    setLoading(false);
  };
  
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


  const handleFileUpload = async () => {
    if (!clubId) {
        toast({ variant: "destructive", title: "Error de Autenticación", description: "Debes estar autenticado para subir archivos."});
        return;
    }
    if (!fileToUpload || !protocolNameToSave.trim()) {
      toast({ variant: "destructive", title: "Faltan datos", description: "El nombre del protocolo y el archivo son obligatorios."});
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileToUpload.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: "Archivo demasiado grande", description: "El tamaño máximo del archivo es 10 MB."});
        return;
    }

    setSaving(true);
    
    try {
      const filePath = `club-protocols/${clubId}/${uuidv4()}-${fileToUpload.name}`;
      const fileRef = ref(storage, filePath);
      
      await uploadBytes(fileRef, fileToUpload);
      
      const url = await getDownloadURL(fileRef);
      
      const newProtocolData: Omit<Protocol, "id"> = {
        name: protocolNameToSave.trim(),
        url,
        path: filePath,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "clubs", clubId, "protocols"), newProtocolData);

      toast({
        title: "¡Protocolo Subido!",
        description: `${protocolNameToSave} se ha guardado correctamente.`,
      });
      
      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setProtocolNameToSave("");
      
      if(clubId) fetchData(clubId);

    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({ variant: "destructive", title: "Error de Subida", description: "No se pudo subir el archivo." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProtocol = async () => {
    if (!clubId || !protocolToDelete) return;
    setSaving(true);

    try {
      const fileRef = ref(storage, protocolToDelete.path);
      await deleteObject(fileRef);

      await deleteDoc(doc(db, "clubs", clubId, "protocols", protocolToDelete.id!));
      
      toast({
        title: "Protocolo Eliminado",
        description: `${protocolToDelete.name} ha sido eliminado.`,
      });

      setProtocolToDelete(null);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting protocol:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el protocolo.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Todos los Protocolos</CardTitle>
            <CardDescription>
              Documentos de actuación para todo el club.
            </CardDescription>
          </div>
          <Dialog
            open={isUploadModalOpen}
            onOpenChange={setIsUploadModalOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Subir Nuevo Protocolo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Nuevo Protocolo</DialogTitle>
                <DialogDescription>
                  Selecciona un archivo y ponle un nombre descriptivo para
                  identificarlo fácilmente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="protocol-name">Nombre del Protocolo *</Label>
                  <Input
                    id="protocol-name"
                    placeholder="p.ej., Protocolo de Lesiones Graves"
                    value={protocolNameToSave}
                    onChange={(e) => setProtocolNameToSave(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocol-file">Archivo *</Label>
                  <Input
                    id="protocol-file"
                    type="file"
                    onChange={(e) =>
                      setFileToUpload(e.target.files?.[0] || null)
                    }
                  />
                  <p className="text-xs text-muted-foreground">Tamaño máximo: 10 MB.</p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleFileUpload} disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Upload className="mr-2 h-4 w-4" />
                  Subir y Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Archivo</TableHead>
                  <TableHead>Fecha de Subida</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.length > 0 ? (
                  protocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                         <FileText className="h-4 w-4 text-muted-foreground"/>
                         {protocol.name}
                      </TableCell>
                      <TableCell>
                        {format(protocol.createdAt.toDate(), "d 'de' LLLL 'de' yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="icon" className="mr-2">
                          <a href={protocol.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => setProtocolToDelete(protocol)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Todavía no se ha subido ningún protocolo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!protocolToDelete}
        onOpenChange={(open) => !open && setProtocolToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo se eliminará
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProtocol}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export default function IncidentsAndProtocolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Incidencias y Protocolos</h1>
        <p className="text-muted-foreground">
          Gestiona incidencias y consulta los protocolos de actuación del club.
        </p>
      </div>

      <Tabs defaultValue="incidents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incidents">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Registro de Incidencias
          </TabsTrigger>
          <TabsTrigger value="protocols">
            <ClipboardList className="mr-2 h-4 w-4" />
            Protocolos del Club
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incidents" className="mt-6">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="protocols" className="mt-6">
          <ProtocolsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
