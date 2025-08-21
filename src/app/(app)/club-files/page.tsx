
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
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import type { Document, Player, Coach, Staff } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  Trash2,
  Download,
  Upload,
  File as FileIcon,
  User as UserIcon,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Owner = {
    id: string;
    name: string;
}

export default function ClubFilesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [documentNameToSave, setDocumentNameToSave] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [isOwnerPopoverOpen, setIsOwnerPopoverOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "clubs", currentClubId, "documents"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const docsList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Document)
      );
      setDocuments(docsList);

      const allOwners: Owner[] = [{ id: 'club', name: 'Club' }];

      const playersSnap = await getDocs(collection(db, "clubs", currentClubId, "players"));
      playersSnap.forEach(doc => {
          const data = doc.data() as Player;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}` });
      });

      const coachesSnap = await getDocs(collection(db, "clubs", currentClubId, "coaches"));
      coachesSnap.forEach(doc => {
          const data = doc.data() as Coach;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}` });
      });

      const staffSnap = await getDocs(collection(db, "clubs", currentClubId, "staff"));
      staffSnap.forEach(doc => {
          const data = doc.data() as Staff;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}` });
      });

      setOwners(allOwners);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos.",
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
    if (!clubId || !auth.currentUser) {
        toast({ variant: "destructive", title: "Error de Autenticación", description: "Debes estar autenticado para subir archivos."});
        return;
    }
    if (!fileToUpload || !documentNameToSave.trim()) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Debes seleccionar un archivo y darle un nombre."});
      return;
    }

    setSaving(true);
    const owner = selectedOwner || { id: 'club', name: 'Club' };

    try {
      const filePath = `club-documents/${clubId}/${owner.id}/${uuidv4()}-${fileToUpload.name}`;
      const fileRef = ref(storage, filePath);
      
      await uploadBytes(fileRef, fileToUpload);
      
      const url = await getDownloadURL(fileRef);
      
      const newDocumentData: Omit<Document, "id"> = {
        name: documentNameToSave.trim(),
        url,
        path: filePath,
        createdAt: Timestamp.now(),
        ownerId: owner.id,
        ownerName: owner.name,
      };
      await addDoc(collection(db, "clubs", clubId, "documents"), newDocumentData);

      toast({
        title: "¡Archivo Subido!",
        description: `${documentNameToSave} se ha guardado correctamente.`,
      });
      
      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setDocumentNameToSave("");
      setSelectedOwner(null);
      
      fetchData(clubId);

    } catch (error: any) {
      console.error("Error uploading file:", error);
      let errorMessage = "No se pudo subir el archivo. Revisa tu conexión y los permisos de Firebase Storage.";
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Error de permisos. No estás autorizado para subir archivos a esta ubicación.";
      }
      toast({ variant: "destructive", title: "Error de Subida", description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!clubId || !docToDelete) return;
    setSaving(true);

    try {
      const fileRef = ref(storage, docToDelete.path);
      await deleteObject(fileRef);

      await deleteDoc(doc(db, "clubs", clubId, "documents", docToDelete.id!));
      
      toast({
        title: "Documento Eliminado",
        description: `${docToDelete.name} ha sido eliminado.`,
      });

      setDocToDelete(null);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el documento.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">
            Archivos del Club
          </h1>
          <p className="text-muted-foreground">
            Gestiona documentos importantes como normativas, formularios de
            inscripción o autorizaciones.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              <CardTitle>Todos los Documentos</CardTitle>
              <CardDescription>
                Archivos disponibles para todo el club.
              </CardDescription>
            </div>
            <Dialog
              open={isUploadModalOpen}
              onOpenChange={setIsUploadModalOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Subir Nuevo Archivo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir Nuevo Documento</DialogTitle>
                  <DialogDescription>
                    Selecciona un archivo y ponle un nombre descriptivo para
                    identificarlo fácilmente.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-name">Nombre del Documento</Label>
                    <Input
                      id="doc-name"
                      placeholder="p.ej., Normativa Interna 2024"
                      value={documentNameToSave}
                      onChange={(e) => setDocumentNameToSave(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Asignar a (Opcional)</Label>
                    <Popover open={isOwnerPopoverOpen} onOpenChange={setIsOwnerPopoverOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isOwnerPopoverOpen}
                            className="w-full justify-between"
                        >
                            {selectedOwner
                            ? owners.find((owner) => owner.id === selectedOwner.id)?.name
                            : "Club"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar propietario..." />
                             <CommandList>
                                <CommandEmpty>No se encontró ningún propietario.</CommandEmpty>
                                <CommandGroup>
                                {owners.map((owner) => (
                                    <CommandItem
                                    key={owner.id}
                                    value={owner.name}
                                    onSelect={() => {
                                        setSelectedOwner(owner.id === 'club' ? null : owner);
                                        setIsOwnerPopoverOpen(false);
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        (selectedOwner?.id === owner.id || (!selectedOwner && owner.id === 'club')) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {owner.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-file">Archivo</Label>
                    <Input
                      id="doc-file"
                      type="file"
                      onChange={(e) =>
                        setFileToUpload(e.target.files?.[0] || null)
                      }
                    />
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
                    <TableHead>Propietario</TableHead>
                    <TableHead>Fecha de Subida</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                           <FileIcon className="h-4 w-4 text-muted-foreground"/>
                           {doc.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            {doc.ownerName || "Club"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(doc.createdAt.toDate(), "d 'de' LLLL 'de' yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon" className="mr-2">
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => setDocToDelete(doc)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay documentos subidos todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
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
              onClick={handleDeleteDocument}
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

    