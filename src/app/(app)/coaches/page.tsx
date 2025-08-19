

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
  Shield,
  CircleDollarSign,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Coach } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";


export default function CoachesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [coachData, setCoachData] = useState<Partial<Coach>>({});
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const calculateAge = (birthDate: string | undefined): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDifference = today.getMonth() - birthDateObj.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
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
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const hasMissingData = (coach: any): boolean => {
    const requiredFields = [
      'birthDate', 'dni', 'address', 'city', 'postalCode', 'email',
      'phone', 'iban'
    ];
     if (coach.isOwnTutor) {
        // No need for tutor fields if coach is their own tutor
    } else {
        requiredFields.push('tutorName', 'tutorLastName', 'tutorDni');
    }
    return requiredFields.some(field => coach[field] === undefined || coach[field] === null || coach[field] === '');
  };

  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
      const teamsQuery = query(collection(db, "clubs", clubId, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);
      
      const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
      const coachesSnapshot = await getDocs(coachesQuery);
      const coachesList = coachesSnapshot.docs.map(doc => {
          const data = doc.data();
           const team = teamsList.find(t => t.id === data.teamId);
          return { 
              id: doc.id, 
              ...data,
              avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
              teamName: team ? team.name : "Sin equipo",
              hasMissingData: hasMissingData(data)
          } as Coach
      });
      setCoaches(coachesList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setCoachData(prev => ({ ...prev, [id]: type === 'number' ? Number(value) : value }));
  };

  const handleCheckboxChange = (id: keyof Coach, checked: boolean) => {
    setCoachData(prev => ({ ...prev, [id]: checked }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSelectChange = (id: keyof Coach, value: string) => {
    setCoachData(prev => ({ ...prev, [id]: value === 'unassigned' ? '' : value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setCoachData(prev => ({ ...prev, birthDate: format(date, "yyyy-MM-dd") }));
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', coach?: Coach) => {
    setModalMode(mode);
    setCoachData(mode === 'edit' && coach ? coach : {});
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSaveCoach = async () => {
    if (!coachData.name || !coachData.lastName || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre y apellidos son obligatorios." });
        return;
    }

    setLoading(true);
    try {
      let imageUrl = coachData.avatar;

      if (newImage) {
        if (coachData.avatar && !coachData.avatar.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, coachData.avatar);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                console.warn("Could not delete old image:", storageError);
            }
        }
        const imageRef = ref(storage, `coach-avatars/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const dataToSave = {
        ...coachData,
        avatar: imageUrl || coachData.avatar || `https://placehold.co/40x40.png?text=${(coachData.name || '').charAt(0)}`,
        monthlyPayment: (coachData.monthlyPayment === '' || coachData.monthlyPayment === undefined || coachData.monthlyPayment === null) ? null : Number(coachData.monthlyPayment),
      };

      if (modalMode === 'edit' && coachData.id) {
        const coachRef = doc(db, "clubs", clubId, "coaches", coachData.id);
        await updateDoc(coachRef, dataToSave);
        toast({ title: "Entrenador actualizado", description: `${coachData.name} ha sido actualizado.` });
      } else {
        await addDoc(collection(db, "clubs", clubId, "coaches"), dataToSave);
        toast({ title: "Entrenador añadido", description: `${coachData.name} ha sido añadido al club.` });
      }
      
      setIsModalOpen(false);
      setCoachData({});
      fetchData(clubId); // Refresh data
    } catch (error) {
        console.error("Error saving coach: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el entrenador." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoach = async () => {
    if (!coachToDelete || !clubId) return;

    setIsDeleting(true);
    try {
        if (coachToDelete.avatar && !coachToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, coachToDelete.avatar);
            await deleteObject(imageRef);
        }
        await deleteDoc(doc(db, "clubs", clubId, "coaches", coachToDelete.id));
        toast({ title: "Entrenador eliminado", description: `${coachToDelete.name} ${coachToDelete.lastName} ha sido eliminado.`});
        fetchData(clubId);
    } catch (error) {
        console.error("Error deleting coach: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al entrenador." });
    } finally {
        setIsDeleting(false);
        setCoachToDelete(null);
    }
  };

  if (loading && !coaches.length) {
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
              <CardTitle>Entrenadores</CardTitle>
              <CardDescription>
                Gestiona los entrenadores de tu club.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenModal('add')}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Añadir Entrenador
                  </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map(coach => (
                <TableRow key={coach.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={coach.avatar} alt={coach.name} data-ai-hint="foto persona" />
                        <AvatarFallback>{coach.name?.charAt(0)}{coach.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                       <div className="flex items-center gap-2">
                        <span>{coach.name} {coach.lastName}</span>
                        {coach.hasMissingData && (
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
                  <TableCell>{coach.teamName}</TableCell>
                  <TableCell>{coach.email || 'N/A'}</TableCell>
                  <TableCell>{coach.phone || 'N/A'}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenModal('edit', coach)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setCoachToDelete(coach)}>
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
            Mostrando <strong>{coaches.length}</strong> de <strong>{coaches.length}</strong> entrenadores
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? 'Añadir Nuevo Entrenador' : 'Editar Entrenador'}</DialogTitle>
                <DialogDescription>
                    {modalMode === 'add' ? 'Rellena la información para añadir un nuevo entrenador al club.' : 'Modifica la información del entrenador.'}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                <div className="flex flex-col items-center gap-4 pt-5">
                    <Label>Foto del Entrenador</Label>
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={imagePreview || coachData.avatar} />
                        <AvatarFallback>
                            {(coachData.name || 'E').charAt(0)}
                            {(coachData.lastName || 'N').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     <Button asChild variant="outline" size="sm">
                        <label htmlFor="coach-image" className="cursor-pointer">
                            <Upload className="mr-2 h-3 w-3"/>
                            Subir
                        </label>
                    </Button>
                    <Input id="coach-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                
                 <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal"><User className="mr-2 h-4 w-4"/>Datos Personales</TabsTrigger>
                        <TabsTrigger value="contact"><Contact className="mr-2 h-4 w-4"/>Contacto y Tutor</TabsTrigger>
                        <TabsTrigger value="payment"><CircleDollarSign className="mr-2 h-4 w-4"/>Pago y Equipo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal" className="pt-6">
                      <div className="min-h-[280px]">
                       <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="name">Nombre</Label>
                                   <Input id="name" value={coachData.name || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="lastName">Apellidos</Label>
                                   <Input id="lastName" value={coachData.lastName || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                  <DatePicker 
                                    date={coachData.birthDate ? new Date(coachData.birthDate) : undefined} 
                                    onDateChange={handleDateChange} 
                                  />
                                   {coachData.birthDate && <p className="text-xs text-muted-foreground">Edad: {calculateAge(coachData.birthDate)} años</p>}
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="dni">DNI</Label>
                                   <Input id="dni" value={coachData.dni || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                       </div>
                       </div>
                    </TabsContent>
                    <TabsContent value="contact" className="pt-6">
                      <div className="min-h-[280px]">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="address">Dirección</Label>
                                   <Input id="address" value={coachData.address || ''} onChange={handleInputChange} />
                               </div>
                                <div className="space-y-2">
                                   <Label htmlFor="city">Ciudad</Label>
                                   <Input id="city" value={coachData.city || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="postalCode">Código Postal</Label>
                                   <Input id="postalCode" value={coachData.postalCode || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                           <div className="flex items-center space-x-2 pt-4">
                              <Checkbox 
                                id="isOwnTutor" 
                                checked={coachData.isOwnTutor || false}
                                onCheckedChange={(checked) => handleCheckboxChange('isOwnTutor', checked as boolean)}
                              />
                              <Label htmlFor="isOwnTutor" className="font-normal">El entrenador es su propio tutor (mayor de 18 años)</Label>
                          </div>
                            
                            {!(coachData.isOwnTutor) && (
                                <div className="space-y-6 p-4 border rounded-md bg-muted/50 mt-4">
                                    <h4 className="font-medium">Datos del Tutor/a</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorName">Nombre</Label>
                                            <Input id="tutorName" value={coachData.tutorName || ''} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorLastName">Apellidos</Label>
                                            <Input id="tutorLastName" value={coachData.tutorLastName || ''} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tutorDni">DNI del Tutor/a</Label>
                                        <Input id="tutorDni" value={coachData.tutorDni || ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="email">{coachData.isOwnTutor ? "Email" : "Email del Tutor/a"}</Label>
                                     <Input id="email" type="email" value={coachData.email || ''} onChange={handleInputChange} />
                                 </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="phone">{coachData.isOwnTutor ? "Teléfono" : "Teléfono del Tutor/a"}</Label>
                                     <Input id="phone" type="tel" value={coachData.phone || ''} onChange={handleInputChange} />
                                 </div>
                            </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="payment" className="pt-6">
                        <div className="min-h-[280px]">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="iban">IBAN Cuenta Bancaria</Label>
                                        <Input id="iban" value={coachData.iban || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="monthlyPayment">Pago Mensual (€)</Label>
                                        <Input id="monthlyPayment" type="number" value={coachData.monthlyPayment ?? ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="teamId">Equipo Asignado</Label>
                                    <Select onValueChange={(value) => handleSelectChange('teamId', value)} value={coachData.teamId || 'unassigned'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un equipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Sin equipo</SelectItem>
                                            {teams.map(team => (
                                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveCoach} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!coachToDelete} onOpenChange={(open) => !open && setCoachToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al entrenador {coachToDelete?.name} {coachToDelete?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCoach} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
