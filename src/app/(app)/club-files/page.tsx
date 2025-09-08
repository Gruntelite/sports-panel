
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
  Tag,
  Search,
  Send,
  FolderOpen,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileRequestSender } from "@/components/file-request-sender";
import { RequestHistory } from "@/components/request-history";
import { Separator } from "@/components/ui/separator";

type Owner = {
    id: string;
    name: string;
    role?: string;
}

const docCategories = [
    { value: 'medico', label: 'Médico' },
    { value: 'identificacion', label: 'Identificación' },
    { value: 'autorizacion', label: 'Autorización' },
    { value: 'factura', label: 'Factura' },
    { value: 'otro', label: 'Otro' },
];

function DocumentsList() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [documentNameToSave, setDocumentNameToSave] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isOwnerPopoverOpen, setIsOwnerPopoverOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwnerId, setFilterOwnerId] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const docsQuery = query(collection(db, "clubs", currentClubId, "documents"), orderBy("createdAt", "desc"));
      const docsSnapshot = await getDocs(docsQuery);
      
      const docsListPromises = docsSnapshot.docs.map(async (docData) => {
          const doc = { id: docData.id, ...docData.data() } as Document;
          if (doc.path && !doc.url) {
              try {
                  const url = await getDownloadURL(ref(storage, doc.path));
                  doc.url = url;
              } catch (e) {
                  console.warn(`Could not get download URL for ${doc.path}`, e);
                  doc.url = '#'; // Assign a fallback URL
              }
          }
          return doc;
      });

      const docsList = await Promise.all(docsListPromises);

      setDocuments(docsList);
      
      const allOwners: Owner[] = [{ id: 'club', name: 'Club' }];
      
      const playersSnap = await getDocs(collection(db, "clubs", currentClubId, "players"));
      playersSnap.forEach(doc => {
          const data = doc.data() as Player;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}`, role: 'Jugador' });
      });
      
      const coachesSnap = await getDocs(collection(db, "clubs", currentClubId, "coaches"));
      coachesSnap.forEach(doc => {
          const data = doc.data() as Coach;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}`, role: 'Entrenador' });
      });

      const staffSnap = await getDocs(collection(db, "clubs", currentClubId, "staff"));
       staffSnap.forEach(doc => {
          const data = doc.data() as Staff;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}`, role: data.role });
      });

      const sortedOwners = allOwners.sort((a, b) => {
          if (a.id === 'club') return -1;
          if (b.id === 'club') return 1;
          return a.name.localeCompare(b.name);
      });

      setOwners(sortedOwners);

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
  }, [toast]);

  useEffect(() => {
    let filtered = documents;
    
    if (searchTerm) {
        filtered = filtered.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterOwnerId !== "all") {
        filtered = filtered.filter(doc => doc.ownerId === filterOwnerId);
    }
    if (filterCategory !== "all") {
        filtered = filtered.filter(doc => doc.category === filterCategory);
    }
    setFilteredDocuments(filtered);
  }, [searchTerm, filterOwnerId, filterCategory, documents]);


  const handleFileUpload = async () => {
    if (!clubId || !auth.currentUser) {
        toast({ variant: "destructive", title: "Error de Autenticación", description: "Debes estar autenticado para subir archivos."});
        return;
    }
    if (!fileToUpload || !documentNameToSave.trim() || !selectedCategory || !selectedOwner) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Todos los campos (nombre, categoría, propietario y archivo) son obligatorios."});
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileToUpload.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: "Archivo demasiado grande", description: "El tamaño máximo del archivo es 10 MB. Por favor, comprime el archivo si es más pesado."});
        return;
    }

    setSaving(true);
    const owner = selectedOwner;

    try {
      const filePath = `club-documents/${clubId}/${owner.id}/${uuidv4()}-${fileToUpload.name}`;
      const fileRef = ref(storage, filePath);
      
      await uploadBytes(fileRef, fileToUpload);
      
      const url = await getDownloadURL(fileRef);
      
      const newDocumentData: Omit<Document, "id" | "url"> = {
        name: documentNameToSave.trim(),
        path: filePath,
        createdAt: Timestamp.now(),
        ownerId: owner.id,
        ownerName: owner.name,
        category: selectedCategory,
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
      setSelectedCategory("");
      
      if(clubId) fetchData(clubId);

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
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <CardTitle>Todos los Documentos</CardTitle>
            <CardDescription>
              Archivos disponibles para todo el club.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Buscar por nombre..."
                      className="pl-8 w-full sm:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
               <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {docCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
               <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por propietario" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos los propietarios</SelectItem>
                      {owners.map(owner => (
                          <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Dialog
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
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
                      <Label htmlFor="doc-name">Nombre del Documento *</Label>
                      <Input
                        id="doc-name"
                        placeholder="p.ej., Normativa Interna 2024"
                        value={documentNameToSave}
                        onChange={(e) => setDocumentNameToSave(e.target.value)}
                      />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="doc-category">Categoría *</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger id="doc-category">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {docCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    <div className="space-y-2">
                      <Label>Asignar a Usuario *</Label>
                      <Popover open={isOwnerPopoverOpen} onOpenChange={setIsOwnerPopoverOpen}>
                          <PopoverTrigger asChild>
                          <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isOwnerPopoverOpen}
                              className="w-full justify-between"
                          >
                              {selectedOwner
                              ? selectedOwner.name
                              : "Selecciona un propietario..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder="Buscar usuario..." />
                               <CommandList>
                                  <CommandEmpty>No se encontró ningún usuario.</CommandEmpty>
                                  <CommandGroup>
                                  {owners.map((owner) => (
                                      <CommandItem
                                      key={owner.id}
                                      value={owner.name}
                                      onSelect={() => {
                                          setSelectedOwner(owner);
                                          setIsOwnerPopoverOpen(false);
                                      }}
                                      >
                                      <Check
                                          className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedOwner?.id === owner.id ? "opacity-100" : "opacity-0"
                                          )}
                                      />
                                      {owner.name}
                                      {owner.role && <span className="ml-2 text-xs text-muted-foreground">({owner.role})</span>}
                                      </CommandItem>
                                  ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                          </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-file">Archivo *</Label>
                      <Input
                        id="doc-file"
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Archivo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Fecha de Subida</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center justify-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground"/>
                          {doc.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{docCategories.find(c => c.value === doc.category)?.label || 'Sin Categoría'}</Badge>
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
                          <Button asChild variant="outline" size="icon" className="mr-2" disabled={!doc.url}>
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
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No hay documentos que coincidan con el filtro actual.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
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
}

export default function ClubFilesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          Archivos del Club
        </h1>
        <p className="text-muted-foreground">
          Gestiona documentos importantes como normativas, formularios o autorizaciones.
        </p>
      </div>
      <Tabs defaultValue="documents">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents"><FolderOpen className="mr-2 h-4 w-4"/>Ver Documentos</TabsTrigger>
          <TabsTrigger value="request"><Send className="mr-2 h-4 w-4"/>Solicitar Archivos</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-6">
            <DocumentsList/>
        </TabsContent>
        <TabsContent value="request" className="mt-6 space-y-6">
            <FileRequestSender />
            <Separator />
            <RequestHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
