

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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Staff } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';

export default function StaffPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [staff, setStaff] = useState<Staff[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [staffData, setStaffData] = useState<Partial<Staff>>({});
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
  
  const hasMissingData = (member: any): boolean => {
    const requiredFields = ['role', 'email', 'phone'];
    return requiredFields.some(field => member[field] === undefined || member[field] === null || member[field] === '');
  };

  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
        const staffCol = collection(db, "clubs", clubId, "staff");
        const staffSnapshot = await getDocs(staffCol);

        const staffList = staffSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
                hasMissingData: hasMissingData(data)
            } as Staff;
        });
        
        setStaff(staffList);

    } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setStaffData(prev => ({ ...prev, [id]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', member?: Staff) => {
    setModalMode(mode);
    setStaffData(mode === 'edit' && member ? member : {});
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
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
      };

      if (modalMode === 'edit' && staffData.id) {
        const staffDocRef = doc(db, "clubs", clubId, "staff", staffData.id);
        await updateDoc(staffDocRef, dataToSave);
        
        // Also update the user's name if it changed
        const userQuery = query(collection(db, "clubs", clubId, "users"), where("email", "==", staffData.email));
        const userSnapshot = await getDocs(userQuery);
        if(!userSnapshot.empty){
            const userDocRef = userSnapshot.docs[0].ref;
            await updateDoc(userDocRef, { name: `${staffData.name} ${staffData.lastName}` });
        }

        toast({ title: "Miembro actualizado", description: `${staffData.name} ha sido actualizado.` });
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

  const handleDeleteStaff = async () => {
    if (!staffToDelete || !clubId) return;

    setIsDeleting(true);
    try {
        if (staffToDelete.avatar && !staffToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, staffToDelete.avatar);
            await deleteObject(imageRef).catch(e => console.warn("Could not delete image:", e));
        }

        const batch = writeBatch(db);

        // Delete from staff collection
        const staffDocRef = doc(db, "clubs", clubId, "staff", staffToDelete.id);
        batch.delete(staffDocRef);

        // Delete from users collection
        const userQuery = query(collection(db, "clubs", clubId, "users"), where("email", "==", staffToDelete.email));
        const userSnapshot = await getDocs(userQuery);
        if(!userSnapshot.empty) {
            batch.delete(userSnapshot.docs[0].ref);
        }

        await batch.commit();

        toast({ title: "Miembro eliminado", description: `${staffToDelete.name} ${staffToDelete.lastName} ha sido eliminado.`});
        fetchData(clubId);
    } catch (error) {
        console.error("Error deleting staff: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al miembro." });
    } finally {
        setIsDeleting(false);
        setStaffToDelete(null);
    }
  };

  if (loading && !staff.length) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff y Directiva</CardTitle>
              <CardDescription>
                Gestiona el personal administrativo y directivo de tu club.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
                        <AvatarFallback>{member.name?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                       <div className="flex items-center gap-2">
                        <span>{member.name} {member.lastName}</span>
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
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.email || 'N/A'}</TableCell>
                  <TableCell>{member.phone || 'N/A'}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenModal('edit', member)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setStaffToDelete(member)}>
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{staff.length}</strong> de <strong>{staff.length}</strong> miembros
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle>Editar Miembro</DialogTitle>
                <DialogDescription>
                    Modifica la información del miembro del staff.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                <div className="flex flex-col items-center gap-4 pt-5">
                    <Label>Foto</Label>
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={imagePreview || staffData.avatar} />
                        <AvatarFallback>
                            {(staffData.name || 'S').charAt(0)}
                            {(staffData.lastName || 'T').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     <Button asChild variant="outline" size="sm">
                        <label htmlFor="staff-image" className="cursor-pointer">
                            <Upload className="mr-2 h-3 w-3"/>
                            Subir
                        </label>
                    </Button>
                    <Input id="staff-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                
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
                             <Input id="email" type="email" value={staffData.email || ''} onChange={handleInputChange} readOnly/>
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="phone">Teléfono</Label>
                             <Input id="phone" type="tel" value={staffData.phone || ''} onChange={handleInputChange} />
                         </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveStaff} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al miembro {staffToDelete?.name} {staffToDelete?.lastName} (de la lista de staff y de la lista de usuarios).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
