

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  File,
  PlusCircle,
  Filter,
  MoreHorizontal,
  Loader2,
  Upload,
  User,
  Contact,
  Shield,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
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
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Player } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";


export default function PlayersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [playerData, setPlayerData] = useState<Partial<Player>>({});
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);

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

  const hasMissingData = (player: any): boolean => {
    const requiredFields = [
      'birthDate', 'dni', 'address', 'city', 'postalCode', 'tutorEmail',
      'tutorPhone', 'iban', 'jerseyNumber'
    ];
    if (player.monthlyFee === undefined || player.monthlyFee === null) {
      requiredFields.push('monthlyFee');
    }
    if (player.isOwnTutor) {
        // No need for tutor fields if player is their own tutor
    } else {
        requiredFields.push('tutorName', 'tutorLastName', 'tutorDni');
    }
    return requiredFields.some(field => player[field] === undefined || player[field] === null || player[field] === '');
  };

  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
      // Fetch Teams
      const teamsQuery = query(collection(db, "clubs", clubId, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);
      
      // Fetch Players
      const playersQuery = query(collection(db, "clubs", clubId, "players"));
      const playersSnapshot = await getDocs(playersQuery);
      const playersList = playersSnapshot.docs.map(doc => {
          const data = doc.data();
          const team = teamsList.find(t => t.id === data.teamId);
          return { 
              id: doc.id, 
              ...data,
              avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
              teamName: team ? team.name : "Sin equipo",
              hasMissingData: hasMissingData(data)
          } as Player
      });
      setPlayers(playersList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setPlayerData(prev => ({ ...prev, [id]: type === 'number' ? (value === '' ? null : Number(value)) : value }));
  };
  
  const handleCheckboxChange = (id: keyof Player, checked: boolean) => {
    setPlayerData(prev => ({ ...prev, [id]: checked }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSelectChange = (id: keyof Player, value: string) => {
    setPlayerData(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setPlayerData(prev => ({ ...prev, birthDate: format(date, "yyyy-MM-dd") }));
    }
  };
  
  const handleOpenModal = (mode: 'add' | 'edit', player?: Player) => {
    setModalMode(mode);
    setPlayerData(mode === 'edit' && player ? player : {});
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSavePlayer = async () => {
    if (!playerData.name || !playerData.lastName || !playerData.teamId || !playerData.tutorEmail || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre, apellidos, equipo y email de contacto son obligatorios." });
        return;
    }

    setLoading(true);
    try {
      let imageUrl = playerData.avatar;

      if (newImage) {
        if (playerData.avatar && !playerData.avatar.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, playerData.avatar);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                console.warn("Could not delete old image:", storageError);
            }
        }
        const imageRef = ref(storage, `player-avatars/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const teamName = teams.find(t => t.id === playerData.teamId)?.name || "Sin equipo";

      const dataToSave = {
        ...playerData,
        teamName,
        avatar: imageUrl || playerData.avatar || `https://placehold.co/40x40.png?text=${(playerData.name || '').charAt(0)}`,
        monthlyFee: (playerData.monthlyFee === '' || playerData.monthlyFee === undefined || playerData.monthlyFee === null) ? null : Number(playerData.monthlyFee),
      };

      if (modalMode === 'edit' && playerData.id) {
        const playerRef = doc(db, "clubs", clubId, "players", playerData.id);
        await updateDoc(playerRef, dataToSave);
        toast({ title: "Jugador actualizado", description: `${playerData.name} ha sido actualizado.` });
      } else {
        const playerDocRef = await addDoc(collection(db, "clubs", clubId, "players"), dataToSave);
        toast({ title: "Jugador añadido", description: `${playerData.name} ha sido añadido al club.` });
        
        // Automatic user record creation
        const contactEmail = dataToSave.tutorEmail;
        const contactName = dataToSave.isOwnTutor ? `${dataToSave.name} ${dataToSave.lastName}` : (dataToSave.tutorName ? `${dataToSave.tutorName} ${dataToSave.tutorLastName}` : `${dataToSave.name} ${dataToSave.lastName} (Familia)`);
        
        if(contactEmail){
            const userRef = doc(collection(db, "clubs", clubId, "users"));
            await setDoc(userRef, {
                email: contactEmail,
                name: contactName,
                role: 'Family',
                playerId: playerDocRef.id,
            });
            toast({
                title: "Registro de Usuario Creado",
                description: `Se ha creado un registro de usuario para ${contactName}.`,
            });
        }
      }
      
      setIsModalOpen(false);
      setPlayerData({});
      fetchData(clubId);
    } catch (error) {
        console.error("Error saving player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el jugador." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete || !clubId) return;

    setIsDeleting(true);
    try {
        if (playerToDelete.avatar && !playerToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, playerToDelete.avatar);
            await deleteObject(imageRef);
        }
        await deleteDoc(doc(db, "clubs", clubId, "players", playerToDelete.id));

        const usersQuery = query(collection(db, 'clubs', clubId, 'users'), where('playerId', '==', playerToDelete.id));
        const usersSnapshot = await getDocs(usersQuery);
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await deleteDoc(doc(db, 'clubs', clubId, 'users', userDoc.id));
        }

        toast({ title: "Jugador eliminado", description: `${playerToDelete.name} ${playerToDelete.lastName} ha sido eliminado.`});
        fetchData(clubId);
    } catch (error) {
        console.error("Error deleting player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el jugador." });
    } finally {
        setIsDeleting(false);
        setPlayerToDelete(null);
    }
  };

  const handleSelectPlayer = (playerId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPlayers(prev => [...prev, playerId]);
    } else {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
    }
  };
  
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedPlayers(players.map(p => p.id));
    } else {
      setSelectedPlayers([]);
    }
  };

  const handleBulkAssignTeam = async (teamId: string) => {
    if (!clubId || selectedPlayers.length === 0) return;

    setLoading(true);
    try {
        const teamName = teams.find(t => t.id === teamId)?.name || "Sin equipo";
        const batch = writeBatch(db);
        selectedPlayers.forEach(playerId => {
            const playerRef = doc(db, "clubs", clubId, "players", playerId);
            batch.update(playerRef, { teamId, teamName });
        });
        await batch.commit();

        toast({
            title: "Jugadores actualizados",
            description: `${selectedPlayers.length} jugadores han sido asignados al nuevo equipo.`
        });
        fetchData(clubId);
        setSelectedPlayers([]);
    } catch (error) {
        console.error("Error assigning players in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo asignar los jugadores al equipo." });
    } finally {
        setLoading(false);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!clubId || selectedPlayers.length === 0) return;

    setIsDeleting(true);
    try {
        const batch = writeBatch(db);
        for (const playerId of selectedPlayers) {
            const player = players.find(p => p.id === playerId);
            if (player) {
                // Delete avatar from storage
                if (player.avatar && !player.avatar.includes('placehold.co')) {
                    const imageRef = ref(storage, player.avatar);
                    await deleteObject(imageRef).catch(e => console.warn("Could not delete old image:", e));
                }
                
                // Delete player document
                const playerRef = doc(db, "clubs", clubId, "players", playerId);
                batch.delete(playerRef);

                // Find and delete corresponding user document
                const usersQuery = query(collection(db, 'clubs', clubId, 'users'), where('playerId', '==', playerId));
                const usersSnapshot = await getDocs(usersQuery);
                if (!usersSnapshot.empty) {
                    const userDoc = usersSnapshot.docs[0];
                    batch.delete(doc(db, 'clubs', clubId, 'users', userDoc.id));
                }
            }
        }
        await batch.commit();

        toast({
            title: "Jugadores eliminados",
            description: `${selectedPlayers.length} jugadores han sido eliminados.`
        });
        fetchData(clubId);
        setSelectedPlayers([]);
    } catch (error) {
        console.error("Error deleting players in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar a los jugadores." });
    } finally {
        setIsDeleting(false);
        setIsBulkDeleteAlertOpen(false);
    }
  };


  if (loading && !players.length) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }
  
  const isAllSelected = players.length > 0 && selectedPlayers.length === players.length;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Jugadores</CardTitle>
              <CardDescription>
                Gestiona los jugadores de tu club y su información.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedPlayers.length > 0 ? (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-8 gap-1">
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                           Acciones ({selectedPlayers.length})
                        </span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuSub>
                         <DropdownMenuSubTrigger>Asignar a Equipo</DropdownMenuSubTrigger>
                         <DropdownMenuSubContent>
                           {teams.map(team => (
                             <DropdownMenuItem key={team.id} onSelect={() => handleBulkAssignTeam(team.id)}>
                               {team.name}
                             </DropdownMenuItem>
                           ))}
                         </DropdownMenuSubContent>
                       </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setIsBulkDeleteAlertOpen(true)}>Eliminar Seleccionados</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Filtrar
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem checked>
                        Activo
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem>Archivado</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    <File className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Exportar
                    </span>
                  </Button>
                  <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenModal('add')}>
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Añadir Jugador
                      </span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Dorsal</TableHead>
                <TableHead>Cuota Mensual</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(player => (
                <TableRow key={player.id} data-state={selectedPlayers.includes(player.id) && "selected"}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={(checked) => handleSelectPlayer(player.id, checked as boolean)}
                      aria-label={`Seleccionar a ${player.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="foto persona" />
                        <AvatarFallback>{player.name?.charAt(0)}{player.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span>{player.name} {player.lastName}</span>
                        {player.hasMissingData && (
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
                  <TableCell>
                    <Badge variant="outline">{player.teamName}</Badge>
                  </TableCell>
                  <TableCell>{player.jerseyNumber || 'N/A'}</TableCell>
                  <TableCell>{player.monthlyFee === null || player.monthlyFee === undefined ? 'N/A' : `${player.monthlyFee} €`}</TableCell>
                  <TableCell>{player.tutorEmail || 'N/A'}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenModal('edit', player)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setPlayerToDelete(player)}>
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
            Mostrando <strong>{players.length}</strong> de <strong>{players.length}</strong> jugadores
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? 'Añadir Nuevo Jugador' : 'Editar Jugador'}</DialogTitle>
                <DialogDescription>
                    {modalMode === 'add' ? 'Rellena la información para añadir un nuevo jugador al club.' : 'Modifica la información del jugador.'}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                <div className="flex flex-col items-center gap-4 pt-5">
                    <Label>Foto del Jugador</Label>
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={imagePreview || playerData.avatar} />
                        <AvatarFallback>
                            {(playerData.name || 'N').charAt(0)}
                            {(playerData.lastName || 'J').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     <Button asChild variant="outline" size="sm">
                        <label htmlFor="player-image" className="cursor-pointer">
                            <Upload className="mr-2 h-3 w-3"/>
                            Subir
                        </label>
                    </Button>
                    <Input id="player-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal"><User className="mr-2 h-4 w-4"/>Datos Personales</TabsTrigger>
                        <TabsTrigger value="contact"><Contact className="mr-2 h-4 w-4"/>Contacto y Banco</TabsTrigger>
                        <TabsTrigger value="sports"><Shield className="mr-2 h-4 w-4"/>Datos Deportivos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal" className="pt-6">
                      <div className="min-h-[280px]">
                       <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="name">Nombre</Label>
                                   <Input id="name" autoComplete="off" value={playerData.name || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="lastName">Apellidos</Label>
                                   <Input id="lastName" autoComplete="off" value={playerData.lastName || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                  <DatePicker 
                                    date={playerData.birthDate ? new Date(playerData.birthDate) : undefined} 
                                    onDateChange={handleDateChange} 
                                  />
                                   {playerData.birthDate && <p className="text-xs text-muted-foreground">Edad: {calculateAge(playerData.birthDate)} años</p>}
                               </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="dni">DNI</Label>
                                   <Input id="dni" value={playerData.dni || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="address">Dirección</Label>
                                   <Input id="address" value={playerData.address || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <Label htmlFor="city">Ciudad</Label>
                                   <Input id="city" value={playerData.city || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="postalCode">Código Postal</Label>
                                   <Input id="postalCode" value={playerData.postalCode || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                       </div>
                       </div>
                    </TabsContent>
                    <TabsContent value="contact" className="pt-6">
                      <div className="min-h-[280px]">
                        <div className="space-y-6">
                          <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="isOwnTutor" 
                                checked={playerData.isOwnTutor || false}
                                onCheckedChange={(checked) => handleCheckboxChange('isOwnTutor', checked as boolean)}
                              />
                              <Label htmlFor="isOwnTutor" className="font-normal">El jugador es su propio tutor (mayor de 18 años)</Label>
                          </div>
                            
                            {!(playerData.isOwnTutor) && (
                                <div className="space-y-6 p-4 border rounded-md bg-muted/50">
                                    <h4 className="font-medium">Datos del Tutor/a</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorName">Nombre</Label>
                                            <Input id="tutorName" autoComplete="off" value={playerData.tutorName || ''} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorLastName">Apellidos</Label>
                                            <Input id="tutorLastName" autoComplete="off" value={playerData.tutorLastName || ''} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tutorDni">DNI del Tutor/a</Label>
                                        <Input id="tutorDni" value={playerData.tutorDni || ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="tutorEmail">{playerData.isOwnTutor ? "Email *" : "Email del Tutor/a *"}</Label>
                                     <Input id="tutorEmail" type="email" value={playerData.tutorEmail || ''} onChange={handleInputChange} required />
                                 </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="tutorPhone">{playerData.isOwnTutor ? "Teléfono" : "Teléfono del Tutor/a"}</Label>
                                     <Input id="tutorPhone" type="tel" value={playerData.tutorPhone || ''} onChange={handleInputChange} />
                                 </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="iban">IBAN Cuenta Bancaria</Label>
                                <Input id="iban" value={playerData.iban || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="sports" className="pt-6">
                      <div className="min-h-[280px]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                           <div className="space-y-2">
                                <Label htmlFor="teamId">Equipo</Label>
                                <Select onValueChange={(value) => handleSelectChange('teamId', value)} value={playerData.teamId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un equipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map(team => (
                                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jerseyNumber">Dorsal</Label>
                                <Input id="jerseyNumber" type="number" value={playerData.jerseyNumber || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="monthlyFee">Cuota (€)</Label>
                                <Input id="monthlyFee" type="number" value={playerData.monthlyFee ?? ''} onChange={handleInputChange} />
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
                <Button type="button" onClick={handleSavePlayer} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al jugador {playerToDelete?.name} {playerToDelete?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlayer} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente {selectedPlayers.length} jugadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteAlertOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar Jugadores'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
