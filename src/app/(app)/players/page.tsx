
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
  Trash2,
  Save,
  Send,
  Columns,
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
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Player, ClubMember } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { requestDataUpdateAction } from "@/lib/actions";
import { DataUpdateSender, FieldSelector } from "@/components/data-update-sender";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const playerFields = {
    personal: [
        { id: "name", label: "Nombre" }, { id: "lastName", label: "Apellidos" }, { id: "birthDate", label: "Fecha de Nacimiento" },
        { id: "dni", label: "NIF" }, { id: "sex", label: "Sexo" }, { id: "nationality", label: "Nacionalidad" },
        { id: "healthCardNumber", label: "Nº Tarjeta Sanitaria" }, { id: "address", label: "Dirección" },
        { id: "city", label: "Ciudad" }, { id: "postalCode", label: "Código Postal" },
    ],
    contact: [
        { id: "tutorName", label: "Nombre del Tutor/a" }, { id: "tutorLastName", label: "Apellidos del Tutor/a" },
        { id: "tutorDni", label: "NIF del Tutor/a" }, { id: "tutorEmail", label: "Email de Contacto" },
        { id: "tutorPhone", label: "Teléfono de Contacto" }, { id: "iban", label: "IBAN" },
    ],
    sports: [
        { id: "teamName", label: "Equipo" }, { id: "jerseyNumber", label: "Dorsal" }, { id: "monthlyFee", label: "Cuota Mensual (€)" },
        { id: "kitSize", label: "Talla de Equipación" }, { id: "medicalCheckCompleted", label: "Revisión médica completada" },
    ]
};

const allColumnFields = [
    ...playerFields.personal,
    ...playerFields.contact,
    ...playerFields.sports
];


export default function PlayersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
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
  
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<ClubMember[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['name', 'teamName', 'jerseyNumber', 'monthlyFee', 'tutorEmail']));
  const [filterTeamId, setFilterTeamId] = useState<string>('all');

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

  useEffect(() => {
    if (filterTeamId === 'all') {
      setFilteredPlayers(players);
    } else {
      setFilteredPlayers(players.filter(p => p.teamId === filterTeamId));
    }
  }, [filterTeamId, players]);

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
      const teamsQuery = query(collection(db, "clubs", clubId, "teams"), orderBy("order"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);
      
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
      
      const members: ClubMember[] = playersList.map(p => ({ id: p.id, name: `${p.name} ${p.lastName}`, type: 'Jugador', data: p, teamId: p.teamId, email: p.tutorEmail }));
      setAllMembers(members);

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
    setPlayerData(prev => ({ ...prev, [id]: value === 'unassigned' ? '' : value }));
  };

  const handleDateChange = (id: keyof Player, date: Date | undefined) => {
    if (date) {
        setPlayerData(prev => ({ ...prev, [id]: format(date, "yyyy-MM-dd") }));
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
    if (!playerData.name || !playerData.lastName || !playerData.tutorEmail || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre, apellidos y email de contacto son obligatorios." });
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
      
      const teamName = teams.find(t => t.id === playerData.teamId)?.name || "Sin equipo";

      const dataToSave = {
        ...playerData,
        teamName,
        avatar: imageUrl || playerData.avatar || `https://placehold.co/40x40.png?text=${(playerData.name || '').charAt(0)}`,
        monthlyFee: (playerData.monthlyFee === '' || playerData.monthlyFee === undefined || playerData.monthlyFee === null) ? null : Number(playerData.monthlyFee),
      };
      
      delete (dataToSave as Partial<Player>).id;

      if (modalMode === 'edit' && playerData.id) {
        const playerRef = doc(db, "clubs", clubId, "players", playerData.id);
        await updateDoc(playerRef, dataToSave);
        toast({ title: "Jugador actualizado", description: `${playerData.name} ha sido actualizado.` });
      } else {
        const playerDocRef = await addDoc(collection(db, "clubs", clubId, "players"), dataToSave);
        toast({ title: "Jugador añadido", description: `${playerData.name} ha sido añadido al club.` });
        
        const contactEmail = dataToSave.tutorEmail;
        const contactName = `${dataToSave.name} ${dataToSave.lastName}`;
        
        if(contactEmail){
            const userRef = doc(db, "users", playerDocRef.id);
            await setDoc(userRef, {
                email: contactEmail,
                name: contactName,
                role: 'Family',
                clubId: clubId
            });
            toast({
                title: "Acceso a la app creado",
                description: `Se ha creado una cuenta de usuario para la familia de ${contactName}.`,
            });
        }
      }
      
      setIsModalOpen(false);
      setPlayerData({});
    } catch (error) {
        console.error("Error saving player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el jugador." });
    } finally {
      setSaving(false);
      if(clubId) fetchData(clubId);
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

        const usersQuery = query(collection(db, 'users'), where('email', '==', playerToDelete.tutorEmail));
        const usersSnapshot = await getDocs(usersQuery);
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await deleteDoc(doc(db, 'users', userDoc.id));
        }

        toast({ title: "Jugador eliminado", description: `${playerToDelete.name} ${playerToDelete.lastName} ha sido eliminado.`});
    } catch (error) {
        console.error("Error deleting player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el jugador." });
    } finally {
        setIsDeleting(false);
        setPlayerToDelete(null);
        if(clubId) fetchData(clubId);
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
      setSelectedPlayers(filteredPlayers.map(p => p.id));
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
        setSelectedPlayers([]);
    } catch (error) {
        console.error("Error assigning players in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo asignar los jugadores al equipo." });
    } finally {
        setLoading(false);
        if(clubId) fetchData(clubId);
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
                if (player.avatar && !player.avatar.includes('placehold.co')) {
                    const imageRef = ref(storage, player.avatar);
                    await deleteObject(imageRef).catch(e => console.warn("Could not delete old image:", e));
                }
                
                const playerRef = doc(db, "clubs", clubId, "players", playerId);
                batch.delete(playerRef);

                const usersQuery = query(collection(db, 'users'), where('email', '==', player.tutorEmail));
                const usersSnapshot = await getDocs(usersQuery);
                if (!usersSnapshot.empty) {
                    const userDoc = usersSnapshot.docs[0];
                    batch.delete(doc(db, 'users', userDoc.id));
                }
            }
        }
        await batch.commit();

        toast({
            title: "Jugadores eliminados",
            description: `${selectedPlayers.length} jugadores han sido eliminados.`
        });
        setSelectedPlayers([]);
    } catch (error) {
        console.error("Error deleting players in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar a los jugadores." });
    } finally {
        setIsDeleting(false);
        setIsBulkDeleteAlertOpen(false);
        if(clubId) fetchData(clubId);
    }
  };

  const handleRequestUpdate = async (member: Player) => {
    if (!clubId) return;
    const result = await requestDataUpdateAction({ 
      clubId, 
      members: [{ id: member.id, name: `${member.name} ${member.lastName}`, email: member.tutorEmail }],
      memberType: 'player',
      fields: ['dni', 'address', 'tutorPhone', 'iban'] // Example fields
    });
    if (result.success) {
      toast({ title: "Solicitud Enviada", description: "Se ha enviado un correo para la actualización de datos." });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };

  const handleFieldSelection = (fieldId: string, isSelected: boolean) => {
      if (isSelected) {
          setSelectedFields(prev => [...prev, fieldId]);
      } else {
          setSelectedFields(prev => prev.filter(id => id !== fieldId));
      }
  };

  const handleMemberSelection = (memberId: string, isSelected: boolean) => {
      const newSelection = new Set(selectedPlayers);
      if(isSelected) {
        newSelection.add(memberId);
      } else {
        newSelection.delete(memberId);
      }
      setSelectedPlayers(Array.from(newSelection));
  };

  const handleSelectAllMembers = (checked: boolean) => {
      if (checked) {
          setSelectedPlayers(players.map(m => m.id));
      } else {
          setSelectedPlayers([]);
      }
  };

  const handleSendUpdateRequests = async () => {
      if (!clubId) return;
      if (selectedPlayers.length === 0) {
          toast({ variant: "destructive", title: "Error", description: "No has seleccionado ningún jugador." });
          return;
      }
      setSaving(true);
      const membersToSend = players.filter(p => selectedPlayers.includes(p.id))
                                      .map(p => ({ id: p.id, name: `${p.name} ${p.lastName}`, email: p.tutorEmail || '' }));
      const result = await requestDataUpdateAction({
          clubId,
          members: membersToSend,
          memberType: 'player',
          fields: selectedFields
      });
      if (result.success) {
          toast({
              title: "Solicitudes Enviadas",
              description: `Se han enviado ${result.count} correos para la actualización de datos.`
          });
          setIsMembersModalOpen(false);
          setSelectedFields([]);
          setSelectedPlayers([]);
      } else {
          toast({ variant: "destructive", title: "Error al Enviar", description: result.error });
      }
      setSaving(false);
  };
  
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => {
        const newSet = new Set(prev);
        if (newSet.has(columnId)) {
            newSet.delete(columnId);
        } else {
            newSet.add(columnId);
        }
        return newSet;
    });
  };

  const getCellContent = (player: Player, columnId: string) => {
        const value = player[columnId as keyof Player];
        switch (columnId) {
            case 'name':
                return `${player.name} ${player.lastName}`;
            case 'monthlyFee':
                return value === null || value === undefined ? 'N/A' : `${value} €`;
            case 'teamName':
                return <Badge variant="outline">{player.teamName || "Sin equipo"}</Badge>;
            default:
                 return value === null || value === undefined || value === '' ? 'N/A' : String(value);
        }
  };


  if (loading && !players.length) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }
  
  const isAllSelected = filteredPlayers.length > 0 && selectedPlayers.length === filteredPlayers.length;

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
              <Button onClick={() => setIsFieldsModalOpen(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Solicitar Actualización
              </Button>
               <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Columns className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Columnas
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Mostrar/Ocultar Columnas</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allColumnFields.map(field => (
                          <DropdownMenuCheckboxItem
                            key={field.id}
                            className="capitalize"
                            checked={visibleColumns.has(field.id)}
                            onCheckedChange={() => toggleColumnVisibility(field.id)}
                            onSelect={(e) => e.preventDefault()}
                            disabled={field.id === 'name'}
                          >
                            {field.label}
                          </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue placeholder="Filtrar por equipo"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los equipos</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <TableHead className="w-[4rem]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    aria-label="Seleccionar todo"
                    className="translate-y-[2px]"
                  />
                </TableHead>
                 {allColumnFields.map(field => (
                    visibleColumns.has(field.id) && 
                    <TableHead 
                      key={field.id}
                      className={cn(field.id === 'name' && 'font-medium')}
                    >
                        {field.label}
                    </TableHead>
                 ))}
                <TableHead className="w-[4rem]">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map(player => (
                <TableRow key={player.id} data-state={selectedPlayers.includes(player.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={(checked) => handleSelectPlayer(player.id, checked as boolean)}
                      aria-label={`Seleccionar a ${player.name}`}
                    />
                  </TableCell>
                  {allColumnFields.map(field => (
                    visibleColumns.has(field.id) && (
                        <TableCell 
                          key={field.id} 
                          className={cn(
                            'min-w-[150px]',
                            field.id === 'name' && 'font-medium'
                          )}
                        >
                             {field.id === 'name' ? (
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="foto persona" />
                                    <AvatarFallback>{player.name?.charAt(0)}{player.lastName?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex items-center gap-2">
                                    <span>{getCellContent(player, field.id)}</span>
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
                            ) : (
                                getCellContent(player, field.id)
                            )}
                        </TableCell>
                    )
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
            Mostrando <strong>{filteredPlayers.length}</strong> de <strong>{players.length}</strong> jugadores
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
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="name">Nombre</Label>
                                   <Input id="name" autoComplete="off" value={playerData.name || ''} onChange={handleInputChange} />
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="lastName">Apellidos</Label>
                                   <Input id="lastName" autoComplete="off" value={playerData.lastName || ''} onChange={handleInputChange} />
                               </div>
                           </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div className="space-y-2">
                                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                  <DatePicker 
                                    date={playerData.birthDate ? new Date(playerData.birthDate) : undefined} 
                                    onDateChange={(date) => handleDateChange('birthDate', date)}
                                  />
                                   {playerData.birthDate && <p className="text-xs text-muted-foreground">Edad: {calculateAge(playerData.birthDate)} años</p>}
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="dni">NIF</Label>
                                   <Input id="dni" value={playerData.dni || ''} onChange={handleInputChange} />
                               </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sex">Sexo</Label>
                                    <Select value={playerData.sex} onValueChange={(value) => handleSelectChange('sex', value)}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="masculino">Masculino</SelectItem>
                                            <SelectItem value="femenino">Femenino</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nationality">Nacionalidad</Label>
                                    <Input id="nationality" value={playerData.nationality || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="healthCardNumber">Nº Tarjeta Sanitaria</Label>
                                    <Input id="healthCardNumber" value={playerData.healthCardNumber || ''} onChange={handleInputChange} />
                                </div>
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor="address">Dirección</Label>
                               <Input id="address" value={playerData.address || ''} onChange={handleInputChange} />
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
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="startDate">Fecha de Alta</Label>
                                  <DatePicker 
                                    date={playerData.startDate ? new Date(playerData.startDate) : undefined} 
                                    onDateChange={(date) => handleDateChange('startDate', date)}
                                  />
                                </div>
                                 <div className="space-y-2">
                                  <Label htmlFor="endDate">Fecha de Baja</Label>
                                  <DatePicker 
                                    date={playerData.endDate ? new Date(playerData.endDate) : undefined} 
                                    onDateChange={(date) => handleDateChange('endDate', date)}
                                  />
                                </div>
                           </div>
                           <div className="flex items-center space-x-2">
                              <Checkbox id="hasInterruption" checked={playerData.hasInterruption} onCheckedChange={(checked) => handleCheckboxChange('hasInterruption', checked as boolean)} />
                              <Label htmlFor="hasInterruption">Ha tenido interrupciones en su alta</Label>
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
                                        <Label htmlFor="tutorDni">NIF del Tutor/a</Label>
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
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="teamId">Equipo</Label>
                                <Select onValueChange={(value) => handleSelectChange('teamId', value)} value={playerData.teamId || 'unassigned'}>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="jerseyNumber">Dorsal</Label>
                                    <Input id="jerseyNumber" type="number" value={playerData.jerseyNumber || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="monthlyFee">Cuota (€)</Label>
                                    <Input id="monthlyFee" type="number" value={playerData.monthlyFee ?? ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="kitSize">Talla de Equipación</Label>
                                    <Input id="kitSize" placeholder="p.ej., L, 12, M" value={playerData.kitSize || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                               <Checkbox id="medicalCheckCompleted" checked={playerData.medicalCheckCompleted} onCheckedChange={(checked) => handleCheckboxChange('medicalCheckCompleted', checked as boolean)} />
                               <Label htmlFor="medicalCheckCompleted">Revisión médica completada</Label>
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
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4"/>}
                    Guardar
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

       {/* --- Data Update Modals --- */}
      <Dialog open={isFieldsModalOpen} onOpenChange={setIsFieldsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paso 1: Selecciona los campos a actualizar</DialogTitle>
            <DialogDescription>Elige qué información quieres que actualicen los jugadores.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FieldSelector fields={playerFields} selectedFields={selectedFields} onFieldSelect={handleFieldSelection} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
            <Button onClick={() => { setIsFieldsModalOpen(false); setIsMembersModalOpen(true); }} disabled={selectedFields.length === 0}>
              Siguiente: Seleccionar Jugadores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Paso 2: Selecciona los destinatarios</DialogTitle>
            <DialogDescription>Elige los jugadores que recibirán la solicitud.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center p-2 border rounded-md">
              <Checkbox 
                id="select-all-members" 
                onCheckedChange={(checked) => handleSelectAllMembers(checked as boolean)}
                checked={players.length > 0 && selectedPlayers.length === players.length}
              />
              <Label htmlFor="select-all-members" className="ml-2 font-medium">Seleccionar todos ({players.length})</Label>
            </div>
            <ScrollArea className="h-72 mt-4">
              <div className="space-y-2">
                {players.map(member => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 border rounded-md">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedPlayers.includes(member.id)}
                      onCheckedChange={(checked) => handleMemberSelection(member.id, checked as boolean)}
                    />
                    <Label htmlFor={`member-${member.id}`} className="flex-1">
                      {member.name} {member.lastName}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setIsMembersModalOpen(false); setIsFieldsModalOpen(true); }}>
              Atrás
            </Button>
            <Button onClick={handleSendUpdateRequests} disabled={saving || selectedPlayers.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {saving ? 'Enviando...' : `Enviar a ${selectedPlayers.length} Jugador(es)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
