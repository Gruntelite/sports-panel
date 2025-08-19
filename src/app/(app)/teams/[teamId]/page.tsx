
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  UserSquare,
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
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Player, Coach, TeamMember } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";


export default function EditTeamPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [team, setTeam] = useState<Partial<Team>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [playerData, setPlayerData] = useState<Partial<Player>>({});
  const [playerToDelete, setPlayerToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

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
    const fetchClubId = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
        }
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchClubId();
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const hasMissingData = (player: any): boolean => {
    const requiredFields = [
      'birthDate', 'dni', 'address', 'city', 'postalCode', 'tutorEmail',
      'tutorPhone', 'iban', 'teamId', 'jerseyNumber', 'monthlyFee'
    ];
    if (player.isOwnTutor) {
    } else {
        requiredFields.push('tutorName', 'tutorLastName', 'tutorDni');
    }
    return requiredFields.some(field => !player[field]);
  };

  const fetchTeamData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const teamDocRef = doc(db, "clubs", currentClubId, "teams", teamId);
      const teamDocSnap = await getDoc(teamDocRef);

      if (teamDocSnap.exists()) {
        const teamData = teamDocSnap.data() as Team;
        setTeam({ ...teamData, id: teamDocSnap.id });
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se encontró el equipo." });
        router.push("/teams");
        return;
      }
      
      const teamsQuery = query(collection(db, "clubs", currentClubId, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setAllTeams(teamsList);
      
      const playersQuery = query(collection(db, "clubs", currentClubId, "players"), where("teamId", "==", teamId));
      const playersSnapshot = await getDocs(playersQuery);
      const playerMembers: TeamMember[] = playersSnapshot.docs.map(doc => {
          const data = doc.data() as Player;
          return {
              id: doc.id,
              name: `${data.name} ${data.lastName}`,
              role: 'Jugador',
              jerseyNumber: data.jerseyNumber || 'N/A',
              avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
              hasMissingData: hasMissingData(data)
          } as TeamMember;
      });

      const coachesQuery = query(collection(db, "clubs", currentClubId, "coaches"), where("teamId", "==", teamId));
      const coachesSnapshot = await getDocs(coachesQuery);
      const coachMembers: TeamMember[] = coachesSnapshot.docs.map(doc => {
          const data = doc.data() as Coach;
          return {
              id: doc.id,
              name: `${data.name} ${data.lastName}`,
              role: 'Entrenador',
              jerseyNumber: '',
              avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
          };
      });

      setTeamMembers([...playerMembers, ...coachMembers]);

    } catch (error) {
      console.error("Error fetching team data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del equipo." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId && teamId) {
      fetchTeamData(clubId);
    }
  }, [clubId, teamId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    if (['name', 'minAge', 'maxAge'].includes(id)) {
        setTeam(prev => ({ ...prev, [id]: value }));
    }
    setPlayerData(prev => ({ ...prev, [id]: type === 'number' ? Number(value) : value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTeamImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    if (!clubId || !teamId) return;

    setSaving(true);
    try {
      let imageUrl = team.image;

      if (newImage) {
        if (team.image && !team.image.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, team.image);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                console.warn("Could not delete old image:", storageError);
            }
        }
        const imageRef = ref(storage, `team-images/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const teamDocRef = doc(db, "clubs", clubId, "teams", teamId);
      await updateDoc(teamDocRef, {
        name: team.name,
        minAge: team.minAge ? Number(team.minAge) : null,
        maxAge: team.maxAge ? Number(team.maxAge) : null,
        image: imageUrl,
      });

      toast({ title: "Éxito", description: "Los cambios en el equipo se han guardado." });
      setNewImage(null);
      setImagePreview(null);
      if(imageUrl) setTeam(prev => ({...prev, image: imageUrl}));
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };
  
  // --- Player Management Functions ---

  const handleCheckboxChange = (id: keyof Player, checked: boolean) => {
    setPlayerData(prev => ({ ...prev, [id]: checked }));
  };

  const handleSelectChange = (id: keyof Player, value: string) => {
    setPlayerData(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setPlayerData(prev => ({ ...prev, birthDate: format(date, "yyyy-MM-dd") }));
    }
  };
  
  const handleOpenModal = async (mode: 'add' | 'edit', member?: TeamMember) => {
    setModalMode(mode);
    if (mode === 'add') {
      setPlayerData({ teamId: teamId });
    } else if (member && member.role === 'Jugador') {
      const playerDocRef = doc(db, "clubs", clubId!, "players", member.id);
      const playerDocSnap = await getDoc(playerDocRef);
      if(playerDocSnap.exists()) {
        setPlayerData(playerDocSnap.data());
      }
    } else {
      // Logic to edit coaches if needed
    }
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSavePlayer = async () => {
    if (!playerData.name || !playerData.lastName || !playerData.teamId || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre, apellidos y equipo son obligatorios." });
        return;
    }

    setSaving(true);
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
      
      const dataToSave = {
        ...playerData,
        avatar: imageUrl || playerData.avatar || `https://placehold.co/40x40.png?text=${(playerData.name || '').charAt(0)}`,
      };

      if (modalMode === 'edit' && playerData.id) {
        const playerRef = doc(db, "clubs", clubId, "players", playerData.id);
        await updateDoc(playerRef, dataToSave);
        toast({ title: "Jugador actualizado", description: `${playerData.name} ha sido actualizado.` });
      } else {
        await addDoc(collection(db, "clubs", clubId, "players"), dataToSave);
        toast({ title: "Jugador añadido", description: `${playerData.name} ha sido añadido al equipo.` });
      }
      
      setIsModalOpen(false);
      setPlayerData({});
      fetchTeamData(clubId);
    } catch (error) {
        console.error("Error saving player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el jugador." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!playerToDelete || !clubId) return;

    setIsDeleting(true);
    try {
        if (playerToDelete.avatar && !playerToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, playerToDelete.avatar);
            await deleteObject(imageRef);
        }
        
        const collectionName = playerToDelete.role === 'Jugador' ? 'players' : 'coaches';
        await deleteDoc(doc(db, "clubs", clubId, collectionName, playerToDelete.id));

        toast({ title: "Miembro eliminado", description: `${playerToDelete.name} ha sido eliminado.`});
        fetchTeamData(clubId);
    } catch (error) {
        console.error("Error deleting member: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el miembro." });
    } finally {
        setIsDeleting(false);
        setPlayerToDelete(null);
    }
  };

  const handleSelectMember = (memberId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMembers(prev => [...prev, memberId]);
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };
  
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedMembers(teamMembers.filter(m => m.role === 'Jugador').map(p => p.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleBulkAssignTeam = async (newTeamId: string) => {
    if (!clubId || selectedMembers.length === 0) return;

    setSaving(true);
    try {
        const batch = writeBatch(db);
        selectedMembers.forEach(playerId => {
            const playerRef = doc(db, "clubs", clubId, "players", playerId);
            batch.update(playerRef, { teamId: newTeamId });
        });
        await batch.commit();

        toast({
            title: "Jugadores movidos",
            description: `${selectedMembers.length} jugadores han sido movidos al nuevo equipo.`
        });
        fetchTeamData(clubId);
        setSelectedMembers([]);
    } catch (error) {
        console.error("Error assigning players in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo mover a los jugadores." });
    } finally {
        setSaving(false);
    }
  };

  const isAllSelected = teamMembers.filter(m => m.role === 'Jugador').length > 0 && selectedMembers.length === teamMembers.filter(m => m.role === 'Jugador').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Editar Equipo: {team.name}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>Imagen del Equipo</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center gap-4">
                          <Image
                              alt={team.name || 'Team Image'}
                              className="aspect-video w-full rounded-lg object-cover"
                              height="200"
                              src={imagePreview || team.image || "https://placehold.co/600x400.png"}
                              width="300"
                          />
                           <Button asChild variant="outline" className="w-full">
                              <label htmlFor="team-image-upload" className="cursor-pointer">
                                  <Upload className="mr-2 h-4 w-4"/>
                                  Cambiar Imagen
                              </label>
                          </Button>
                          <Input id="team-image-upload" type="file" className="hidden" accept="image/*" onChange={handleTeamImageChange} />
                      </CardContent>
                  </Card>

                  <Card>
                      <CardHeader>
                          <CardTitle>Detalles del Equipo</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                           <div className="space-y-2">
                              <Label htmlFor="name">Nombre del Equipo</Label>
                              <Input id="name" value={team.name || ''} onChange={handleInputChange} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label htmlFor="minAge">Edad Mínima</Label>
                                  <Input id="minAge" type="number" value={team.minAge || ''} onChange={handleInputChange} />
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="maxAge">Edad Máxima</Label>
                                  <Input id="maxAge" type="number" value={team.maxAge || ''} onChange={handleInputChange} />
                              </div>
                          </div>
                           <Button onClick={handleSaveChanges} disabled={saving} className="w-full">
                              {saving ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                          </Button>
                      </CardContent>
                  </Card>
              </div>
              <div className="lg:col-span-2">
                  <Card>
                      <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Plantilla del Equipo</CardTitle>
                              <CardDescription>Miembros actualmente en {team.name}.</CardDescription>
                            </div>
                             <div className="flex items-center gap-2">
                              {selectedMembers.length > 0 ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="h-8 gap-1">
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                          Acciones ({selectedMembers.length})
                                        </span>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Mover a Equipo</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {allTeams.filter(t => t.id !== teamId).map(t => (
                                            <DropdownMenuItem key={t.id} onSelect={() => handleBulkAssignTeam(t.id)}>
                                              {t.name}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">Eliminar Seleccionados</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                  <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenModal('add')}>
                                      <PlusCircle className="h-3.5 w-3.5" />
                                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                          Añadir Jugador
                                      </span>
                                  </Button>
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
                                      <TableHead>Rol</TableHead>
                                      <TableHead>Dorsal</TableHead>
                                      <TableHead>
                                        <span className="sr-only">Acciones</span>
                                      </TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {teamMembers.length > 0 ? teamMembers.map(member => (
                                      <TableRow key={member.id} data-state={selectedMembers.includes(member.id) && "selected"}>
                                          <TableCell padding="checkbox">
                                            <Checkbox
                                              checked={selectedMembers.includes(member.id)}
                                              onCheckedChange={(checked) => handleSelectMember(member.id, checked as boolean)}
                                              aria-label={`Seleccionar a ${member.name}`}
                                              disabled={member.role !== 'Jugador'}
                                            />
                                          </TableCell>
                                          <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                              <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
                                                <AvatarFallback>{member.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                              </Avatar>
                                              <div className="flex items-center gap-2">
                                                <span>{member.name}</span>
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
                                          <TableCell>
                                            <Badge variant={member.role === 'Jugador' ? 'outline' : 'secondary'}>
                                                {member.role === 'Jugador' ? <User className="mr-1 h-3 w-3" /> : <UserSquare className="mr-1 h-3 w-3" />}
                                                {member.role}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{member.jerseyNumber || 'N/A'}</TableCell>
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
                                                <DropdownMenuItem onClick={() => handleOpenModal('edit', member)} disabled={member.role !== 'Jugador'}>Editar</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => setPlayerToDelete(member)}>
                                                  Eliminar
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </TableCell>
                                      </TableRow>
                                  )) : (
                                       <TableRow>
                                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                              No hay miembros en este equipo.
                                          </TableCell>
                                      </TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </CardContent>
                      <CardFooter>
                        <div className="text-xs text-muted-foreground">
                          Mostrando <strong>{teamMembers.length}</strong> de <strong>{teamMembers.length}</strong> miembros
                        </div>
                      </CardFooter>
                  </Card>
              </div>
          </div>
      </div>

      {/* --- Player Modal --- */}
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
                        <label htmlFor="player-image-upload" className="cursor-pointer">
                            <Upload className="mr-2 h-3 w-3"/>
                            Subir
                        </label>
                    </Button>
                    <Input id="player-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
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
                                   <Input id="name" value={playerData.name || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="lastName">Apellidos</Label>
                                   <Input id="lastName" value={playerData.lastName || ''} onChange={handleInputChange} />
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
                                            <Input id="tutorName" value={playerData.tutorName || ''} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorLastName">Apellidos</Label>
                                            <Input id="tutorLastName" value={playerData.tutorLastName || ''} onChange={handleInputChange} />
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
                                     <Label htmlFor="tutorEmail">{playerData.isOwnTutor ? "Email" : "Email del Tutor/a"}</Label>
                                     <Input id="tutorEmail" type="email" value={playerData.tutorEmail || ''} onChange={handleInputChange} />
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
                                        {allTeams.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                                <Input id="monthlyFee" type="number" value={playerData.monthlyFee || ''} onChange={handleInputChange} />
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
                <Button type="button" onClick={handleSavePlayer} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al miembro {playerToDelete?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </TooltipProvider>
  );
}
