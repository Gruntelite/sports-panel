
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  PlusCircle,
  MoreHorizontal,
  Loader2,
  Upload,
  User,
  Contact,
  AlertCircle,
  Briefcase,
  Users,
  Save,
  Send,
  Columns,
  Calendar,
  Check,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc } from "firebase/firestore";
import type { Staff, Socio, CustomFieldDef } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { requestDataUpdateAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MemberDetailModal } from "@/components/member-detail-modal";
import { ScrollArea } from "@/components/ui/scroll-area";

const staffFields = [{ id: 'name', label: 'Nombre' }, { id: 'role', label: 'Cargo' }, { id: 'email', label: 'Email' }, { id: 'phone', label: 'Teléfono' }, { id: 'payment', label: 'Pago' }];
const socioFields = [{ id: 'name', label: 'Nombre' }, { id: 'socioNumber', label: 'Nº Socio' }, { id: 'email', label: 'Email' }, { id: 'phone', label: 'Teléfono' }, { id: 'dni', label: 'NIF' }, { id: 'fee', label: 'Cuota' }];
const MONTHS = [
    { label: "Enero", value: 0 }, { label: "Febrero", value: 1 }, { label: "Marzo", value: 2 },
    { label: "Abril", value: 3 }, { label: "Mayo", value: 4 }, { label: "Junio", value: 5 },
    { label: "Julio", value: 6 }, { label: "Agosto", value: 7 }, { label: "Septiembre", value: 8 },
    { label: "Octubre", value: 9 }, { label: "Noviembre", value: 10 }, { label: "Diciembre", value: 11 }
];


export default function StaffPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalType, setModalType] = useState<'staff' | 'socio'>('staff');
  const [viewingMember, setViewingMember] = useState<{member: Staff | Socio, type: 'staff' | 'socio'} | null>(null);

  const [staffData, setStaffData] = useState<Partial<Staff>>({});
  const [socioData, setSocioData] = useState<Partial<Socio>>({});

  const [itemToDelete, setItemToDelete] = useState<Staff | Socio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [visibleStaffColumns, setVisibleStaffColumns] = useState<Set<string>>(new Set(['name', 'role', 'email', 'payment']));
  const [visibleSocioColumns, setVisibleSocioColumns] = useState<Set<string>>(new Set(['name', 'socioNumber', 'email', 'fee']));

  const staffCustomFields = customFields.filter(f => f.appliesTo.includes('staff'));
  const allPossibleStaffColumns = [...staffFields, ...staffCustomFields];

  const socioCustomFields = customFields.filter(f => f.appliesTo.includes('socio'));
  const allPossibleSocioColumns = [...socioFields, ...socioCustomFields];

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
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const hasMissingStaffData = (member: any): boolean => {
    const requiredFields = ['role', 'email', 'phone'];
    return requiredFields.some(field => member[field] === undefined || member[field] === null || member[field] === '');
  };

  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            setCustomFields(settingsSnap.data().customFields || []);
        }

        const staffCol = collection(db, "clubs", clubId, "staff");
        const staffSnapshot = await getDocs(staffCol);
        const staffList = staffSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
                hasMissingData: hasMissingStaffData(data)
            } as Staff;
        });
        setStaff(staffList);

        const sociosCol = collection(db, "clubs", clubId, "socios");
        const sociosSnapshot = await getDocs(sociosCol);
        const sociosList = sociosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socio));
        setSocios(sociosList);

    } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    const data = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    if (modalType === 'staff') {
      setStaffData(prev => ({ ...prev, [id]: data }));
    } else {
      setSocioData(prev => ({ ...prev, [id]: data }));
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    if (modalType === 'staff') {
        setStaffData(prev => ({ ...prev, customFields: { ...prev.customFields, [fieldId]: value } }));
    } else {
        setSocioData(prev => ({ ...prev, customFields: { ...prev.customFields, [fieldId]: value } }));
    }
  };

  const handleCheckboxChange = (id: keyof Socio, checked: boolean) => {
    if (modalType === 'socio') {
      setSocioData(prev => ({ ...prev, [id]: checked }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleSelectChange = (id: keyof (Staff | Socio), value: string) => {
    if (modalType === 'staff') {
      setStaffData(prev => ({ ...prev, [id as keyof Staff]: value }));
    } else {
      setSocioData(prev => ({...prev, [id as keyof Socio]: value as 'monthly' | 'annual' }));
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', type: 'staff' | 'socio', member?: Staff | Socio) => {
    setModalMode(mode);
    setModalType(type);
    if(type === 'staff') {
      setStaffData(mode === 'edit' && member ? (member as Staff) : { paymentFrequency: 'monthly', excludedMonths: [], customFields: {} });
      setSocioData({ paymentType: 'monthly', fee: 0, excludedMonths: [], customFields: {} });
    } else {
      setSocioData(mode === 'edit' && member ? (member as Socio) : { paymentType: 'monthly', fee: 0, excludedMonths: [], customFields: {} });
      setStaffData({ paymentFrequency: 'monthly', excludedMonths: [], customFields: {} });
    }
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSave = async () => {
    if (modalType === 'staff') await handleSaveStaff();
    else await handleSaveSocio();
  }

  const handleSaveStaff = async () => {
    if (!staffData.name || !staffData.lastName || !staffData.role || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre, apellidos y cargo son obligatorios." });
        return;
    }

    setLoading(true);
    try {
      let imageUrl = staffData.avatar;

      if (newImage) {
        if (staffData.avatar && !staffData.avatar.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, staffData.avatar);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                console.warn("Could not delete old image:", storageError);
            }
        }
        const imageRef = ref(storage, `staff-avatars/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const dataToSave = {
        ...staffData,
        avatar: imageUrl || staffData.avatar || `https://placehold.co/40x40.png?text=${(staffData.name || '').charAt(0)}`,
        payment: (staffData.payment === '' || staffData.payment === undefined || staffData.payment === null) ? null : Number(staffData.payment),
      };

      if (modalMode === 'edit' && staffData.id) {
        const staffDocRef = doc(db, "clubs", clubId, "staff", staffData.id);
        await updateDoc(staffDocRef, dataToSave);
        toast({ title: "Miembro actualizado", description: `${staffData.name} ha sido actualizado.` });
      } else {
         await addDoc(collection(db, "clubs", clubId, "staff"), dataToSave);
         toast({ title: "Miembro añadido", description: `${staffData.name} ha sido añadido.` });
      }
      
      setIsModalOpen(false);
      setStaffData({});
      fetchData(clubId);
    } catch (error) {
        console.error("Error saving staff: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el miembro." });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveSocio = async () => {
    if (!socioData.name || !socioData.lastName || !socioData.email || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre, apellidos y email son obligatorios." });
        return;
    }

    setLoading(true);
    try {
      let imageUrl = socioData.avatar;

      if (newImage) {
        if (socioData.avatar && !socioData.avatar.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, socioData.avatar);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                console.warn("Could not delete old image:", storageError);
            }
        }
        const imageRef = ref(storage, `socio-avatars/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const dataToSave = {
        ...socioData,
        avatar: imageUrl || socioData.avatar || `https://placehold.co/40x40.png?text=${(socioData.name || '').charAt(0)}`,
      };

      if (modalMode === 'edit' && socioData.id) {
        const socioDocRef = doc(db, "clubs", clubId, "socios", socioData.id);
        await updateDoc(socioDocRef, dataToSave);
        toast({ title: "Socio actualizado", description: `${socioData.name} ha sido actualizado.` });
      } else {
        await addDoc(collection(db, "clubs", clubId, "socios"), dataToSave);
        toast({ title: "Socio añadido", description: `${socioData.name} ha sido añadido.` });
      }
      
      setIsModalOpen(false);
      setSocioData({});
      fetchData(clubId);
    } catch (error) {
        console.error("Error saving socio: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el socio." });
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!itemToDelete || !clubId) return;

    setIsDeleting(true);
    const itemType = 'role' in itemToDelete ? 'staff' : 'socio';
    const collectionName = itemType === 'staff' ? 'staff' : 'socios';

    try {
        if (itemToDelete.avatar && !itemToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, itemToDelete.avatar);
            await deleteObject(imageRef).catch(e => console.warn("Could not delete image:", e));
        }

        const batch = writeBatch(db);
        const itemDocRef = doc(db, "clubs", clubId, collectionName, itemToDelete.id);
        batch.delete(itemDocRef);
        
        await batch.commit();

        toast({ title: "Miembro eliminado", description: `${itemToDelete.name} ${itemToDelete.lastName} ha sido eliminado.`});
        fetchData(clubId);
    } catch (error) {
        console.error("Error deleting item: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al miembro." });
    } finally {
        setIsDeleting(false);
        setItemToDelete(null);
    }
  };

  const handleRequestUpdate = async (memberId: string, memberType: 'staff') => {
    if (!clubId) return;
    const result = await requestDataUpdateAction({ clubId, members: [], memberType: "coach", fields: [] });
    if (result.success) {
      toast({ title: "Solicitud Enviada", description: "Se ha enviado un correo para la actualización de datos." });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };
  
  const toggleStaffColumnVisibility = (columnId: string) => {
    setVisibleStaffColumns(prev => {
        const newSet = new Set(prev);
        if (newSet.has(columnId)) newSet.delete(columnId);
        else newSet.add(columnId);
        return newSet;
    });
  };

  const toggleSocioColumnVisibility = (columnId: string) => {
    setVisibleSocioColumns(prev => {
        const newSet = new Set(prev);
        if (newSet.has(columnId)) newSet.delete(columnId);
        else newSet.add(columnId);
        return newSet;
    });
  };

  const getStaffCellContent = (member: Staff, columnId: string) => {
    const customFieldDef = staffCustomFields.find(f => f.id === columnId);
    if (customFieldDef) {
      return member.customFields?.[columnId] || 'N/A';
    }

    const value = member[columnId as keyof Staff];
     if (columnId === 'name') return `${member.name} ${member.lastName}`;
     if (columnId === 'payment') return `${member.payment || 0}€ / ${member.paymentFrequency === 'monthly' ? 'mes' : 'año'}`;
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
  }

  const getSocioCellContent = (member: Socio, columnId: string) => {
    const customFieldDef = socioCustomFields.find(f => f.id === columnId);
    if (customFieldDef) {
      return member.customFields?.[columnId] || 'N/A';
    }
    if (columnId === 'name') return `${member.name} ${member.lastName}`;
    if (columnId === 'fee') return `${member.fee}€ / ${member.paymentType === 'monthly' ? 'mes' : 'año'}`;
    const value = member[columnId as keyof Socio];
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
  }

  if (loading && staff.length === 0 && socios.length === 0) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  const currentData = modalType === 'staff' ? staffData : socioData;
  const currentCustomFields = customFields.filter(f => f.appliesTo.includes(modalType));

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Socios y Directiva</h1>
        <p className="text-muted-foreground">
          Gestiona el personal administrativo, directivo y los socios de tu club.
        </p>
      </div>

       <Tabs defaultValue="staff" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff">Staff y Directiva</TabsTrigger>
          <TabsTrigger value="socios">Socios</TabsTrigger>
        </TabsList>
        <TabsContent value="staff">
            <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>Staff y Directiva</CardTitle>
                      <CardDescription>
                        Personal administrativo y directivo del club.
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 gap-1 w-full sm:w-auto">
                                <Columns className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                  Columnas
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <ScrollArea className="h-[400px]">
                                <DropdownMenuLabel>Mostrar/Ocultar Columnas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {staffFields.map(field => (
                                    <DropdownMenuCheckboxItem
                                      key={field.id}
                                      className="capitalize"
                                      checked={visibleStaffColumns.has(field.id)}
                                      onCheckedChange={() => toggleStaffColumnVisibility(field.id)}
                                      onSelect={(e) => e.preventDefault()}
                                      disabled={field.id === 'name'}
                                    >
                                      {field.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {staffCustomFields.length > 0 && <DropdownMenuSeparator />}
                                {staffCustomFields.map(field => (
                                    <DropdownMenuCheckboxItem
                                      key={field.id}
                                      className="capitalize"
                                      checked={visibleStaffColumns.has(field.id)}
                                      onCheckedChange={() => toggleStaffColumnVisibility(field.id)}
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      {field.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                              </ScrollArea>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button onClick={() => handleOpenModal('add', 'staff')} className="h-9 w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Miembro
                          </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {allPossibleStaffColumns.map(field => (
                              <TableHead 
                                key={field.id} 
                                className={cn(
                                  "min-w-[150px]",
                                  !visibleStaffColumns.has(field.id) && 'hidden md:table-cell',
                                  field.id !== 'name' && field.id !== 'role' && 'hidden sm:table-cell'
                                )}
                              >
                                {(field as CustomFieldDef).name || (field as {label: string}).label}
                              </TableHead>
                          ))}
                          <TableHead>
                            <span className="sr-only">Acciones</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staff.map(member => (
                          <TableRow key={member.id}>
                            {allPossibleStaffColumns.map(field => (
                                <TableCell 
                                  key={field.id} 
                                  className={cn(
                                    "min-w-[150px]",
                                    !visibleStaffColumns.has(field.id) && 'hidden md:table-cell',
                                    field.id !== 'name' && field.id !== 'role' && 'hidden sm:table-cell',
                                    field.id === 'name' && 'font-medium'
                                  )}
                                >
                                      {field.id === 'name' ? (
                                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingMember({member, type: 'staff'})}>
                                            <Avatar className="h-9 w-9">
                                              <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
                                              <AvatarFallback>{member.name?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-2">
                                              <span className="hover:underline">{getStaffCellContent(member, field.id)}</span>
                                              {member.hasMissingData && (
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Faltan datos por rellenar</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                              )}
                                            </div>
                                          </div>
                                      ) : (
                                          getStaffCellContent(member, field.id)
                                      )}
                                  </TableCell>
                            ))}
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Alternar menú</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setViewingMember({member, type: 'staff'})}><Eye className="mr-2 h-4 w-4"/>Ver Ficha</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenModal('edit', 'staff', member)}>Editar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRequestUpdate(member.id, 'staff')}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Solicitar Actualización
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(member)}>
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="socios">
          <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>Socios</CardTitle>
                      <CardDescription>
                        Miembros del club que no son jugadores ni staff.
                      </CardDescription>
                    </div>
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 gap-1 w-full sm:w-auto">
                                <Columns className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                  Columnas
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <ScrollArea className="h-[400px]">
                                <DropdownMenuLabel>Mostrar/Ocultar Columnas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {socioFields.map(field => (
                                    <DropdownMenuCheckboxItem
                                      key={field.id}
                                      className="capitalize"
                                      checked={visibleSocioColumns.has(field.id)}
                                      onCheckedChange={() => toggleSocioColumnVisibility(field.id)}
                                      onSelect={(e) => e.preventDefault()}
                                      disabled={field.id === 'name'}
                                    >
                                      {field.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {socioCustomFields.length > 0 && <DropdownMenuSeparator />}
                                {socioCustomFields.map(field => (
                                    <DropdownMenuCheckboxItem
                                      key={field.id}
                                      className="capitalize"
                                      checked={visibleSocioColumns.has(field.id)}
                                      onCheckedChange={() => toggleSocioColumnVisibility(field.id)}
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      {field.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                              </ScrollArea>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        <Button onClick={() => handleOpenModal('add', 'socio')} className="h-9 w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Socio
                        </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {allPossibleSocioColumns.map(field => (
                              <TableHead 
                                key={field.id}
                                className={cn(
                                  "min-w-[150px]",
                                  !visibleSocioColumns.has(field.id) && 'hidden md:table-cell',
                                  field.id !== 'name' && field.id !== 'email' && 'hidden sm:table-cell'
                                )}
                              >
                                {(field as CustomFieldDef).name || (field as {label: string}).label}
                              </TableHead>
                          ))}
                          <TableHead>
                            <span className="sr-only">Acciones</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {socios.map(socio => (
                          <TableRow key={socio.id}>
                            {allPossibleSocioColumns.map(field => (
                                <TableCell 
                                  key={field.id}
                                  className={cn(
                                    "min-w-[150px]",
                                    !visibleSocioColumns.has(field.id) && 'hidden md:table-cell',
                                    field.id !== 'name' && field.id !== 'email' && 'hidden sm:table-cell',
                                    field.id === 'name' && 'font-medium'
                                  )}
                                >
                                      {field.id === 'name' ? (
                                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingMember({member: socio, type: 'socio'})}>
                                            <Avatar className="h-9 w-9">
                                              <AvatarImage src={socio.avatar} alt={socio.name} data-ai-hint="foto persona" />
                                              <AvatarFallback>{socio.name?.charAt(0)}{socio.lastName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="hover:underline">{getSocioCellContent(socio, field.id)}</span>
                                          </div>
                                      ) : (
                                          getSocioCellContent(socio, field.id)
                                      )}
                                  </TableCell>
                            ))}
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Alternar menú</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setViewingMember({member: socio, type: 'socio'})}><Eye className="mr-2 h-4 w-4"/>Ver Ficha</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenModal('edit', 'socio', socio)}>Editar</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(socio)}>
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      </div>
      
      {viewingMember && (
        <MemberDetailModal 
            member={viewingMember.member} 
            memberType={viewingMember.type}
            customFieldDefs={customFields.filter(f => f.appliesTo.includes(viewingMember.type))}
            onClose={() => setViewingMember(null)}
            onEdit={() => {
                handleOpenModal('edit', viewingMember.type, viewingMember.member);
                setViewingMember(null);
            }}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? 'Añadir Nuevo' : 'Editar'} {modalType === 'staff' ? 'Miembro de Staff' : 'Socio'}</DialogTitle>
                <DialogDescription>
                    Modifica la información del miembro.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                <div className="flex flex-col items-center gap-4 pt-5">
                    <Label>Foto</Label>
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={imagePreview || currentData?.avatar} />
                        <AvatarFallback>
                            {(currentData?.name || 'S').charAt(0)}
                            {(currentData?.lastName || 'T').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     <Button asChild variant="outline" size="sm">
                        <label htmlFor="member-image" className="cursor-pointer">
                            <Upload className="mr-2 h-3 w-3"/>
                            Subir
                        </label>
                    </Button>
                    <Input id="member-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                
                {modalType === 'staff' ? (
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="name">Nombre</Label>
                              <Input id="name" autoComplete="off" value={staffData.name || ''} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="lastName">Apellidos</Label>
                              <Input id="lastName" autoComplete="off" value={staffData.lastName || ''} onChange={handleInputChange} />
                          </div>
                      </div>
                       <div className="space-y-2">
                           <Label htmlFor="role">Cargo</Label>
                           <Input id="role" placeholder="p.ej., Coordinador, Directivo" value={staffData.role || ''} onChange={handleInputChange} />
                       </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label htmlFor="email">Email</Label>
                               <Input id="email" type="email" value={staffData.email || ''} onChange={handleInputChange} />
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor="phone">Teléfono</Label>
                               <Input id="phone" type="tel" value={staffData.phone || ''} onChange={handleInputChange} />
                           </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="payment">Pago (€)</Label>
                            <Input id="payment" type="number" value={staffData.payment || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentFrequency">Frecuencia de Pago</Label>
                            <Select value={staffData.paymentFrequency} onValueChange={(value) => handleSelectChange('paymentFrequency', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="annual">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                      </div>
                      {staffData.paymentFrequency === 'monthly' && (
                        <div className="space-y-2">
                            <Label>Meses sin pago</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start font-normal">
                                        <Calendar className="mr-2 h-4 w-4"/>
                                        {staffData.excludedMonths && staffData.excludedMonths.length > 0
                                            ? `${staffData.excludedMonths.length} mese(s) seleccionado(s)`
                                            : "Seleccionar meses..."}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0">
                                    <Command>
                                        <CommandList>
                                            <CommandGroup>
                                                {MONTHS.map(month => (
                                                    <CommandItem
                                                        key={month.value}
                                                        onSelect={() => {
                                                            const newSelection = new Set(staffData.excludedMonths || []);
                                                            if (newSelection.has(month.value)) {
                                                                newSelection.delete(month.value);
                                                            } else {
                                                                newSelection.add(month.value);
                                                            }
                                                            setStaffData(prev => ({ ...prev, excludedMonths: Array.from(newSelection) }));
                                                        }}
                                                    >
                                                         <Check className={cn("mr-2 h-4 w-4", staffData.excludedMonths?.includes(month.value) ? "opacity-100" : "opacity-0")} />
                                                        {month.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="name">Nombre</Label>
                              <Input id="name" autoComplete="off" value={socioData.name || ''} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="lastName">Apellidos</Label>
                              <Input id="lastName" autoComplete="off" value={socioData.lastName || ''} onChange={handleInputChange} />
                          </div>
                      </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={socioData.email || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" type="tel" value={socioData.phone || ''} onChange={handleInputChange} />
                        </div>
                      </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label htmlFor="dni">NIF</Label>
                              <Input id="dni" value={socioData.dni || ''} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="socioNumber">Número de Socio</Label>
                              <Input id="socioNumber" value={socioData.socioNumber || ''} onChange={handleInputChange} />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="paymentType">Tipo de Cuota</Label>
                            <Select value={socioData.paymentType} onValueChange={(value) => handleSelectChange('paymentType', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="annual">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fee">Importe Cuota (€)</Label>
                            <Input id="fee" type="number" value={socioData.fee || ''} onChange={handleInputChange} />
                        </div>
                      </div>
                      {socioData.paymentType === 'monthly' && (
                        <div className="space-y-2">
                            <Label>Meses sin cuota</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start font-normal">
                                        <Calendar className="mr-2 h-4 w-4"/>
                                        {socioData.excludedMonths && socioData.excludedMonths.length > 0
                                            ? `${socioData.excludedMonths.length} mese(s) seleccionado(s)`
                                            : "Seleccionar meses..."}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0">
                                    <Command>
                                        <CommandList>
                                            <CommandGroup>
                                                {MONTHS.map(month => (
                                                    <CommandItem
                                                        key={month.value}
                                                        onSelect={() => {
                                                            const newSelection = new Set(socioData.excludedMonths || []);
                                                            if (newSelection.has(month.value)) {
                                                                newSelection.delete(month.value);
                                                            } else {
                                                                newSelection.add(month.value);
                                                            }
                                                            setSocioData(prev => ({ ...prev, excludedMonths: Array.from(newSelection) }));
                                                        }}
                                                    >
                                                         <Check className={cn("mr-2 h-4 w-4", socioData.excludedMonths?.includes(month.value) ? "opacity-100" : "opacity-0")} />
                                                        {month.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                      )}
                  </div>
                )}
                 {currentCustomFields.length > 0 && <Separator />}
                 <div className="space-y-4">
                     {currentCustomFields.map(field => (
                        <div key={field.id} className="space-y-2">
                            <Label htmlFor={field.id}>{field.name}</Label>
                            <Input
                                id={field.id}
                                type={field.type}
                                value={currentData.customFields?.[field.id] || ''}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            />
                        </div>
                    ))}
                 </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al miembro {itemToDelete?.name} {itemToDelete?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
