
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
  Trash,
  Eye,
  FileText
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Player, ClubMember, CustomFieldDef, Interruption } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, intervalToDuration, differenceInMilliseconds } from "date-fns";
import { requestDataUpdateAction } from "@/lib/actions";
import { FieldSelector } from "@/components/data-update-sender";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MemberDetailModal } from "@/components/member-detail-modal";
import { useTranslation } from "@/components/i18n-provider";
import { Separator } from "@/components/ui/separator";


export default function PlayersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [playerData, setPlayerData] = useState<Partial<Player>>({ interruptions: [], customFields: {} });
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<ClubMember[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['name', 'teamName', 'jerseyNumber', 'monthlyFee', 'tutorEmail']));
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  
  const playerFields = t('players.fields', { returnObjects: true });
  
  const allColumnFields = (playerFields && Array.isArray(playerFields.personal) && Array.isArray(playerFields.contact) && Array.isArray(playerFields.sports))
    ? [...playerFields.personal, ...playerFields.contact, ...playerFields.sports]
    : [];

  const playerCustomFields = customFields.filter(f => f.appliesTo.includes('player'));

  const allPossibleColumns = [...allColumnFields, ...playerCustomFields];

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
  
    const calculateTenure = (player: Partial<Player>): string => {
        if (!player.startDate) return "N/A";
        
        const start = parseISO(player.startDate);
        const end = player.currentlyActive ? new Date() : (player.endDate ? parseISO(player.endDate) : new Date());
        
        if (start > end) return "Fechas inválidas";
        
        let totalMilliseconds = differenceInMilliseconds(end, start);
        
        player.interruptions?.forEach(interruption => {
            if (interruption.startDate && interruption.endDate) {
                const intStart = parseISO(interruption.startDate);
                const intEnd = parseISO(interruption.endDate);
                if (intStart < intEnd) {
                    totalMilliseconds -= differenceInMilliseconds(intEnd, intStart);
                }
            }
        });

        if (totalMilliseconds < 0) totalMilliseconds = 0;
        
        const duration = intervalToDuration({ start: 0, end: totalMilliseconds });
        
        const years = duration.years || 0;
        const months = duration.months || 0;
        
        return `${years} año(s) y ${months} mes(es)`;
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
      'birthDate', 'dni', 'address', 'city', 'postalCode',
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
      const settingsRef = doc(db, "clubs", clubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const clubCustomFields = settingsSnap.data().customFields || [];
        setCustomFields(clubCustomFields.filter((f: CustomFieldDef) => f.appliesTo.includes('player')));
      }

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

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setPlayerData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value,
      }
    }));
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
  
  const handleInterruptionDateChange = (index: number, field: 'startDate' | 'endDate', date: Date | undefined) => {
    if(date){
        const updatedInterruptions = [...(playerData.interruptions || [])];
        updatedInterruptions[index][field] = format(date, "yyyy-MM-dd");
        setPlayerData(prev => ({...prev, interruptions: updatedInterruptions}));
    }
  }

  const handleAddInterruption = () => {
    const newInterruption: Interruption = { id: uuidv4(), startDate: '', endDate: '' };
    setPlayerData(prev => ({...prev, interruptions: [...(prev.interruptions || []), newInterruption]}));
  }

  const handleRemoveInterruption = (id: string) => {
    setPlayerData(prev => ({...prev, interruptions: prev.interruptions?.filter(i => i.id !== id)}));
  }
  
  const handleOpenModal = (mode: 'add' | 'edit', player?: Player) => {
    setModalMode(mode);
    setPlayerData(mode === 'edit' && player ? player : { customFields: {}, interruptions: [] });
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSavePlayer = async () => {
    if (!playerData.name || !playerData.lastName || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre y apellidos son obligatorios." });
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
      setPlayerData({ interruptions: [] });
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
      members: [{ id: member.id, name: `${member.name} ${member.lastName}`, email: member.tutorEmail || '' }],
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
      const customFieldDef = playerCustomFields.find(f => f.id === columnId);
      if (customFieldDef) {
        return player.customFields?.[columnId] || 'N/A';
      }

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>{t('players.title')}</CardTitle>
              <CardDescription>
                {t('players.description')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button onClick={() => setIsFieldsModalOpen(true)} className="w-full sm:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  {t('players.requestUpdate')}
              </Button>
               <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1 w-full sm:w-auto">
                        <Columns className="mr-2 h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          {t('players.columns')}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                     <ScrollArea className="h-[400px]">
                      <DropdownMenuLabel>{t('players.toggleColumns')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allPossibleColumns.map(field => (
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
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                    <SelectTrigger className="h-9 w-full sm:w-[150px]">
                      <SelectValue placeholder={t('players.filterByTeam')}/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('players.allTeams')}</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              {selectedPlayers.length > 0 ? (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 gap-1 w-full sm:w-auto">
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                           {t('players.actions')} ({selectedPlayers.length})
                        </span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuSub>
                         <DropdownMenuSubTrigger>{t('players.assignToTeam')}</DropdownMenuSubTrigger>
                         <DropdownMenuSubContent>
                           {teams.map(team => (
                             <DropdownMenuItem key={team.id} onSelect={() => handleBulkAssignTeam(team.id)}>
                               {team.name}
                             </DropdownMenuItem>
                           ))}
                         </DropdownMenuSubContent>
                       </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setIsBulkDeleteAlertOpen(true)}>{t('players.deleteSelected')}</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              ) : (
                  <Button size="sm" className="h-9 gap-1 w-full sm:w-auto" onClick={() => handleOpenModal('add')}>
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          {t('players.addPlayer')}
                      </span>
                  </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      aria-label={t('players.selectAll')}
                    />
                  </TableHead>
                   {allPossibleColumns.map(field => (
                      <TableHead 
                        key={field.id}
                        className={cn('min-w-[150px]', !visibleColumns.has(field.id) && 'hidden')}
                      >
                          {(field as CustomFieldDef).name || (field as {label: string}).label}
                      </TableHead>
                   ))}
                  <TableHead>
                    <span className="sr-only">{t('players.actions')}</span>
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
                    {allPossibleColumns.map(field => (
                          <TableCell 
                            key={field.id} 
                            className={cn('min-w-[150px]', !visibleColumns.has(field.id) && 'hidden', field.id === 'name' && 'font-medium')}
                          >
                              {field.id === 'name' ? (
                                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingPlayer(player)}>
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="foto persona" />
                                      <AvatarFallback>{player.name?.charAt(0)}{player.lastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center gap-2">
                                      <span className="hover:underline">{getCellContent(player, field.id)}</span>
                                      {player.hasMissingData && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                              <AlertCircle className="h-4 w-4 text-destructive" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{t('players.missingData')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                              ) : (
                                  getCellContent(player, field.id)
                              )}
                          </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                             <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('players.toggleMenu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('players.actions')}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewingPlayer(player)}><Eye className="mr-2 h-4 w-4"/>{t('players.viewProfile')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal('edit', player)}>{t('players.edit')}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setPlayerToDelete(player)}>
                            {t('players.delete')}
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
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            {t('players.showing')} <strong>{filteredPlayers.length}</strong> {t('players.of')} <strong>{players.length}</strong> {t('players.playersCount')}
          </div>
        </CardFooter>
      </Card>
      
      {viewingPlayer && (
        <MemberDetailModal 
            member={viewingPlayer} 
            memberType="player"
            customFieldDefs={playerCustomFields}
            onClose={() => setViewingPlayer(null)}
            onEdit={() => {
                handleOpenModal('edit', viewingPlayer);
                setViewingPlayer(null);
            }}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? t('players.addPlayerTitle') : t('players.editPlayerTitle')}</DialogTitle>
                <DialogDescription>
                    {modalMode === 'add' ? t('players.addPlayerDesc') : t('players.editPlayerDesc')}
                </DialogDescription>
            </DialogHeader>
             <ScrollArea className="max-h-[70vh] p-0">
                <div className="py-4 px-6 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                    <div className="flex flex-col items-center gap-4 pt-5">
                        <Label>{t('players.playerPhoto')}</Label>
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
                                {t('players.upload')}
                            </label>
                        </Button>
                        <Input id="player-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                    
                    <div className="space-y-8">
                         <div className="space-y-6">
                            <div className="flex items-center">
                                <h3 className="text-lg font-semibold text-primary">{t('players.personalData')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('players.fields.name')}</Label>
                                    <Input id="name" autoComplete="off" value={playerData.name || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">{t('players.fields.lastName')}</Label>
                                    <Input id="lastName" autoComplete="off" value={playerData.lastName || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">{t('players.fields.birthDate')}</Label>
                                    <DatePicker 
                                        date={playerData.birthDate ? parseISO(playerData.birthDate) : undefined}
                                        onDateChange={(date) => handleDateChange('birthDate', date)}
                                    />
                                    {playerData.birthDate && <p className="text-xs text-muted-foreground">{t('players.age')}: {calculateAge(playerData.birthDate)} {t('players.years')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dni">{t('players.fields.dni')}</Label>
                                    <Input id="dni" value={playerData.dni || ''} onChange={handleInputChange} />
                                </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sex">{t('players.fields.sex')}</Label>
                                        <Select value={playerData.sex} onValueChange={(value) => handleSelectChange('sex', value)}>
                                            <SelectTrigger><SelectValue placeholder={t('players.fields.select')} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="masculino">Masculino</SelectItem>
                                                <SelectItem value="femenino">Femenino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nationality">{t('players.fields.nationality')}</Label>
                                        <Input id="nationality" value={playerData.nationality || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="healthCardNumber">{t('players.fields.healthCard')}</Label>
                                        <Input id="healthCardNumber" value={playerData.healthCardNumber || ''} onChange={handleInputChange} />
                                    </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">{t('players.fields.address')}</Label>
                                <Input id="address" value={playerData.address || ''} onChange={handleInputChange} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">{t('players.fields.city')}</Label>
                                    <Input id="city" value={playerData.city || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">{t('players.fields.postalCode')}</Label>
                                    <Input id="postalCode" value={playerData.postalCode || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="p-4 border rounded-md mt-4 space-y-4 bg-muted/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                    <Label>{t('players.fields.startDate')}</Label>
                                    <DatePicker 
                                        date={playerData.startDate ? parseISO(playerData.startDate) : undefined}
                                        onDateChange={(date) => handleDateChange('startDate', date)}
                                    />
                                    </div>
                                    <div className="space-y-2">
                                    <Label>{t('players.fields.endDate')}</Label>
                                    <DatePicker 
                                        date={playerData.endDate ? parseISO(playerData.endDate) : undefined}
                                        onDateChange={(date) => handleDateChange('endDate', date)}
                                        disabled={playerData.currentlyActive}
                                    />
                                    </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="currentlyActive" checked={playerData.currentlyActive} onCheckedChange={(checked) => handleCheckboxChange('currentlyActive', checked as boolean)} />
                                <Label htmlFor="currentlyActive">{t('players.fields.currentlyActive')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="hasInterruption" checked={(playerData.interruptions?.length || 0) > 0} onCheckedChange={(checked) => {
                                    if(checked) { handleAddInterruption() }
                                    else { setPlayerData(prev => ({...prev, interruptions: []}))}
                                }} />
                                <Label htmlFor="hasInterruption">{t('players.fields.hasInterruptions')}</Label>
                            </div>
                            {(playerData.interruptions?.length || 0) > 0 && (
                                <div className="space-y-2 pl-6">
                                    {playerData.interruptions?.map((interruption, index) => (
                                        <div key={interruption.id} className="flex items-end gap-2">
                                            <div className="space-y-1">
                                                <Label>{t('players.fields.interruptionStart')}</Label>
                                                    <DatePicker date={interruption.startDate ? parseISO(interruption.startDate) : undefined} onDateChange={(date) => handleInterruptionDateChange(index, 'startDate', date)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>{t('players.fields.interruptionEnd')}</Label>
                                                    <DatePicker date={interruption.endDate ? parseISO(interruption.endDate) : undefined} onDateChange={(date) => handleInterruptionDateChange(index, 'endDate', date)} />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveInterruption(interruption.id)}><Trash className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={handleAddInterruption}>{t('players.fields.addInterruption')}</Button>
                                </div>
                            )}
                            <p className="text-sm font-medium text-muted-foreground pt-2">{t('players.fields.tenure')}: <span className="text-foreground">{calculateTenure(playerData)}</span></p>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <div className="flex items-center pt-6">
                                <h3 className="text-lg font-semibold text-primary">{t('players.contactAndBank')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="isOwnTutor" 
                                    checked={playerData.isOwnTutor || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('isOwnTutor', checked as boolean)}
                                />
                                <Label htmlFor="isOwnTutor" className="font-normal">{t('players.isOwnTutor')}</Label>
                            </div>
                                
                                {!(playerData.isOwnTutor) && (
                                    <div className="space-y-6 p-4 border rounded-md bg-muted/50">
                                        <h4 className="font-medium">{t('players.tutorData')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="tutorName">{t('players.fields.tutorName')}</Label>
                                                <Input id="tutorName" autoComplete="off" value={playerData.tutorName || ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tutorLastName">{t('players.fields.tutorLastName')}</Label>
                                                <Input id="tutorLastName" autoComplete="off" value={playerData.tutorLastName || ''} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorDni">{t('players.fields.tutorDni')}</Label>
                                            <Input id="tutorDni" value={playerData.tutorDni || ''} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="tutorEmail">{playerData.isOwnTutor ? t('players.fields.email') : t('players.fields.tutorEmail')}</Label>
                                        <Input id="tutorEmail" type="email" value={playerData.tutorEmail || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tutorPhone">{playerData.isOwnTutor ? t('players.fields.phone') : t('players.fields.tutorPhone')}</Label>
                                        <Input id="tutorPhone" type="tel" value={playerData.tutorPhone || ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="iban">{t('players.fields.iban')}</Label>
                                    <Input id="iban" value={playerData.iban || ''} onChange={handleInputChange} />
                                </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center pt-6">
                                <h3 className="text-lg font-semibold text-primary">{t('players.sportsData')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="teamId">{t('players.fields.team')}</Label>
                                <Select onValueChange={(value) => handleSelectChange('teamId', value)} value={playerData.teamId || 'unassigned'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('players.fields.selectTeam')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">{t('players.unassigned')}</SelectItem>
                                        {teams.map(team => (
                                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="jerseyNumber">{t('players.fields.jerseyNumber')}</Label>
                                    <Input id="jerseyNumber" type="number" value={playerData.jerseyNumber || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="monthlyFee">{t('players.fields.monthlyFee')}</Label>
                                    <Input id="monthlyFee" type="number" value={playerData.monthlyFee ?? ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="kitSize">{t('players.fields.kitSize')}</Label>
                                    <Input id="kitSize" placeholder={t('players.fields.kitSizePlaceholder')} value={playerData.kitSize || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                            <Checkbox id="medicalCheckCompleted" checked={playerData.medicalCheckCompleted} onCheckedChange={(checked) => handleCheckboxChange('medicalCheckCompleted', checked as boolean)} />
                            <Label htmlFor="medicalCheckCompleted">{t('players.fields.medicalCheck')}</Label>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <div className="flex items-center pt-6">
                                <h3 className="text-lg font-semibold text-primary">{t('players.otherData')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            {playerCustomFields.length > 0 ? playerCustomFields.map(field => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.id}>{field.name}</Label>
                                    <Input 
                                        id={field.id}
                                        type={field.type}
                                        value={playerData.customFields?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    />
                                </div>
                            )) : (
                                <p className="text-center text-sm text-muted-foreground py-8">{t('players.noCustomFields')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="button" onClick={handleSavePlayer} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4"/>}
                    {t('common.saveChanges')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('players.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('players.confirmDeleteDesc', { playerName: `${playerToDelete?.name} ${playerToDelete?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlayer} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : t('players.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('players.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('players.confirmBulkDeleteDesc', { playerCount: selectedPlayers.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteAlertOpen(false)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : t('players.deletePlayers')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* --- Data Update Modals --- */}
      <Dialog open={isFieldsModalOpen} onOpenChange={setIsFieldsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('players.step1Title')}</DialogTitle>
            <DialogDescription>{t('players.step1Desc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FieldSelector fields={playerFields} customFields={playerCustomFields} selectedFields={selectedFields} onFieldSelect={handleFieldSelection} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={() => { setIsFieldsModalOpen(false); setIsMembersModalOpen(true); }} disabled={selectedFields.length === 0}>
              {t('players.nextStep')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('players.step2Title')}</DialogTitle>
            <DialogDescription>{t('players.step2Desc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center p-2 border rounded-md">
              <Checkbox 
                id="select-all-members" 
                onCheckedChange={(checked) => handleSelectAllMembers(checked as boolean)}
                checked={players.length > 0 && selectedPlayers.length === players.length}
              />
              <Label htmlFor="select-all-members" className="ml-2 font-medium">{t('players.selectAll')} ({players.length})</Label>
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
              {t('players.back')}
            </Button>
            <Button onClick={handleSendUpdateRequests} disabled={saving || selectedPlayers.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {saving ? t('players.sending') : t('players.sendTo', { count: selectedPlayers.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}



    