

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
  ArrowLeft,
  UserSquare,
  CircleDollarSign,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Trash,
  Eye,
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
  DropdownMenuSubContent,
  DropdownMenuPortal
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
import type { Team, Player, Coach, TeamMember, Interruption, CustomFieldDef } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, intervalToDuration, differenceInMilliseconds } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { MemberDetailModal } from "@/components/member-detail-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type EditModalSection = 'personal' | 'contact' | 'sports' | 'payment';

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
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalType, setModalType] = useState<'player' | 'coach'>('player');
  const [viewingMember, setViewingMember] = useState<{member: Player | Coach, type: 'player' | 'coach'} | null>(null);
  
  const [modalSection, setModalSection] = useState<EditModalSection>('personal');

  const [playerData, setPlayerData] = useState<Partial<Player>>({ interruptions: [] });
  const [coachData, setCoachData] = useState<Partial<Coach>>({ interruptions: [] });

  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
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

    const calculateTenure = (member: Partial<Player> | Partial<Coach>): string => {
        if (!member.startDate) return "N/A";
        
        const start = parseISO(member.startDate);
        const end = member.currentlyActive ? new Date() : (member.endDate ? parseISO(member.endDate) : new Date());
        
        if (start > end) return "Fechas inválidas";
        
        let totalMilliseconds = differenceInMilliseconds(end, start);
        
        member.interruptions?.forEach(interruption => {
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

  const hasMissingPlayerData = (player: any): boolean => {
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
  
  const hasMissingCoachData = (coach: any): boolean => {
    const requiredFields = [
      'birthDate', 'dni', 'address', 'city', 'postalCode',
      'phone', 'iban'
    ];
     if (coach.isOwnTutor) {
    } else {
        requiredFields.push('tutorName', 'tutorLastName', 'tutorDni');
    }
    return requiredFields.some(field => coach[field] === undefined || coach[field] === null || coach[field] === '');
  };

  const fetchTeamData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setCustomFields(settingsSnap.data().customFields || []);
      }

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
      
      const teamsQuery = query(collection(db, "clubs", currentClubId, "teams"), orderBy("order"));
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
              hasMissingData: hasMissingPlayerData(data),
              data: { id: doc.id, ...data } as Player,
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
              hasMissingData: hasMissingCoachData(data),
              data: { id: doc.id, ...data } as Coach,
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
  
  const handleTeamInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setTeam(prev => ({ ...prev, [id]: type === 'number' ? (value === '' ? '' : Number(value)) : value }));
  };

  const handleMemberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    const val = type === 'number' ? (value === '' ? null : Number(value)) : value;

    if (modalType === 'player') {
      setPlayerData(prev => ({ ...prev, [id]: val }));
    } else {
      setCoachData(prev => ({ ...prev, [id]: val }));
    }
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
    const batch = writeBatch(db);

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

      const teamDataToUpdate = {
        name: team.name,
        level: team.level || null,
        minAge: team.minAge ? Number(team.minAge) : null,
        maxAge: team.maxAge ? Number(team.maxAge) : null,
        defaultMonthlyFee: (team.defaultMonthlyFee === '' || team.defaultMonthlyFee === undefined || team.defaultMonthlyFee === null) ? null : Number(team.defaultMonthlyFee),
        image: imageUrl || team.image,
      };
      
      const teamDocRef = doc(db, "clubs", clubId, "teams", teamId);
      batch.update(teamDocRef, teamDataToUpdate);
      
      const newFee = teamDataToUpdate.defaultMonthlyFee;
      if (newFee !== null && newFee !== undefined) {
          const playersQuery = query(collection(db, "clubs", clubId, "players"), where("teamId", "==", teamId));
          const playersSnapshot = await getDocs(playersQuery);
          playersSnapshot.forEach(playerDoc => {
              const playerRef = doc(db, "clubs", clubId, "players", playerDoc.id);
              batch.update(playerRef, { monthlyFee: newFee });
          });
      }
      
      await batch.commit();

      toast({ title: "Éxito", description: `Los cambios en el equipo se han guardado y las cuotas de los jugadores han sido actualizadas.` });
      setNewImage(null);
      setImagePreview(null);
      if(imageUrl) setTeam(prev => ({...prev, image: imageUrl}));
      if (clubId) fetchTeamData(clubId);
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };
  
  // --- Member Management Functions ---

  const handleCheckboxChange = (id: keyof Player | keyof Coach, checked: boolean) => {
    if (modalType === 'player') {
        setPlayerData(prev => ({ ...prev, [id as keyof Player]: checked }));
    } else {
        setCoachData(prev => ({ ...prev, [id as keyof Coach]: checked }));
    }
  };

  const handleSelectChange = (id: keyof Player | keyof Coach, value: string) => {
     if (modalType === 'player') {
        setPlayerData(prev => ({ ...prev, [id as keyof Player]: value }));
    } else {
        setCoachData(prev => ({ ...prev, [id as keyof Coach]: value }));
    }
  };

  const handleDateChange = (id: 'birthDate' | 'startDate' | 'endDate', date: Date | undefined) => {
    if (date) {
        const formattedDate = format(date, "yyyy-MM-dd");
        if (modalType === 'player') {
            setPlayerData(prev => ({ ...prev, [id]: formattedDate }));
        } else {
            setCoachData(prev => ({ ...prev, [id]: formattedDate }));
        }
    }
  };
  
    const handleInterruptionDateChange = (index: number, field: 'startDate' | 'endDate', date: Date | undefined) => {
    if(date){
        const updatedInterruptions = [...(modalType === 'player' ? playerData.interruptions || [] : coachData.interruptions || [])];
        updatedInterruptions[index][field] = format(date, "yyyy-MM-dd");
        if(modalType === 'player') {
            setPlayerData(prev => ({...prev, interruptions: updatedInterruptions}));
        } else {
            setCoachData(prev => ({...prev, interruptions: updatedInterruptions}));
        }
    }
  }

  const handleAddInterruption = () => {
    const newInterruption: Interruption = { id: uuidv4(), startDate: '', endDate: '' };
    if(modalType === 'player'){
        setPlayerData(prev => ({...prev, interruptions: [...(prev.interruptions || []), newInterruption]}));
    } else {
        setCoachData(prev => ({...prev, interruptions: [...(prev.interruptions || []), newInterruption]}));
    }
  }

  const handleRemoveInterruption = (id: string) => {
    if(modalType === 'player'){
        setPlayerData(prev => ({...prev, interruptions: prev.interruptions?.filter(i => i.id !== id)}));
    } else {
        setCoachData(prev => ({...prev, interruptions: prev.interruptions?.filter(i => i.id !== id)}));
    }
  }
  
  const handleOpenModal = (mode: 'add' | 'edit', memberType: 'player' | 'coach', member?: TeamMember) => {
    setModalMode(mode);
    setModalType(memberType);
    setModalSection('personal');
    
    if (mode === 'add') {
      if (memberType === 'player') {
        setPlayerData({ teamId: teamId, monthlyFee: team.defaultMonthlyFee, interruptions: [] });
        setCoachData({interruptions: []});
      } else {
        setCoachData({ teamId: teamId, interruptions: [] });
        setPlayerData({interruptions: []});
      }
    } else if (member) {
      if (memberType === 'player') {
        setPlayerData(member.data as Player);
        setCoachData({interruptions: []});
      } else {
        setCoachData(member.data as Coach);
        setPlayerData({interruptions: []});
      }
    }
    
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSaveMember = async () => {
    if (modalType === 'player') {
      await handleSavePlayer();
    } else {
      await handleSaveCoach();
    }
  }

  const handleSavePlayer = async () => {
    if (!playerData.name || !playerData.lastName || !playerData.teamId || !clubId) {
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
      
      const teamName = allTeams.find(t => t.id === playerData.teamId)?.name || "Sin equipo";

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
        toast({ title: "Jugador añadido", description: `${playerData.name} ha sido añadido al equipo.` });
        
        // Automatic user record creation
        const contactEmail = dataToSave.tutorEmail;
        const contactName = `${dataToSave.name} ${dataToSave.lastName}`;
        
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
      setPlayerData({interruptions: []});
      if (clubId) fetchTeamData(clubId);
    } catch (error) {
        console.error("Error saving player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el jugador." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCoach = async () => {
    if (!coachData.name || !coachData.lastName || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre y apellidos son obligatorios." });
        return;
    }

    setSaving(true);
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
      
      const teamName = allTeams.find(t => t.id === coachData.teamId)?.name || "Sin equipo";
      
      const dataToSave = {
        ...coachData,
        teamName,
        avatar: imageUrl || coachData.avatar || `https://placehold.co/40x40.png?text=${(coachData.name || '').charAt(0)}`,
        monthlyPayment: (coachData.monthlyPayment === '' || coachData.monthlyPayment === undefined || coachData.monthlyPayment === null) ? null : Number(coachData.monthlyPayment),
      };

      if (modalMode === 'edit' && coachData.id) {
        const coachRef = doc(db, "clubs", clubId, "coaches", coachData.id);
        await updateDoc(coachRef, dataToSave);
        toast({ title: "Entrenador actualizado", description: `${coachData.name} ha sido actualizado.` });
      } else {
        const coachDocRef = await addDoc(collection(db, "clubs", clubId, "coaches"), dataToSave);
        toast({ title: "Entrenador añadido", description: `${coachData.name} ha sido añadido al equipo.` });
        
        // Automatic user record creation
        if (dataToSave.email) {
            const userRef = doc(collection(db, "clubs", clubId, "users"));
            await setDoc(userRef, {
                email: dataToSave.email,
                name: `${dataToSave.name} ${dataToSave.lastName}`,
                role: 'Entrenador',
                coachId: coachDocRef.id,
            });
            toast({
                title: "Registro de Usuario Creado",
                description: `Se ha creado un registro de usuario para ${dataToSave.name} ${dataToSave.lastName}.`,
            });
        }
      }
      
      setIsModalOpen(false);
      setCoachData({interruptions: []});
      if (clubId) fetchTeamData(clubId);
    } catch (error) {
        console.error("Error saving coach: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el entrenador." });
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteMember = async () => {
    if (!memberToDelete || !clubId) return;

    setIsDeleting(true);
    try {
        if (memberToDelete.avatar && !memberToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, memberToDelete.avatar);
            await deleteObject(imageRef);
        }
        
        const collectionName = memberToDelete.role === 'Jugador' ? 'players' : 'coaches';
        await deleteDoc(doc(db, "clubs", clubId, collectionName, memberToDelete.id));

        toast({ title: "Miembro eliminado", description: `${memberToDelete.name} ha sido eliminado.`});
        if (clubId) fetchTeamData(clubId);
    } catch (error) {
        console.error("Error deleting member: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el miembro." });
    } finally {
        setIsDeleting(false);
        setMemberToDelete(null);
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
        const teamName = allTeams.find(t => t.id === newTeamId)?.name || "Sin equipo";
        const batch = writeBatch(db);
        selectedMembers.forEach(playerId => {
            const playerRef = doc(db, "clubs", clubId, "players", playerId);
            batch.update(playerRef, { teamId: newTeamId, teamName });
        });
        await batch.commit();

        toast({
            title: "Jugadores movidos",
            description: `${selectedMembers.length} jugadores han sido movidos al nuevo equipo.`
        });
        if (clubId) fetchTeamData(clubId);
        setSelectedMembers([]);
    } catch (error) {
        console.error("Error assigning players in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo mover a los jugadores." });
    } finally {
      setSaving(false);
    }
  };

  const currentTeamIndex = allTeams.findIndex(t => t.id === teamId);
  const prevTeamId = currentTeamIndex > 0 ? allTeams[currentTeamIndex - 1].id : null;
  const nextTeamId = currentTeamIndex < allTeams.length - 1 ? allTeams[currentTeamIndex + 1].id : null;

  const navigateToTeam = (newTeamId: string | null) => {
    if (newTeamId) {
      setLoading(true);
      router.push(`/teams/${newTeamId}`);
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
  
  const currentData = modalType === 'player' ? playerData : coachData;
  const playerCount = teamMembers.filter(m => m.role === 'Jugador').length;
  const coachCount = teamMembers.filter(m => m.role === 'Entrenador').length;


  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/teams')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateToTeam(prevTeamId)} disabled={!prevTeamId}>
                    <ChevronLeft className="h-4 w-4"/>
                </Button>
                <h1 className="text-2xl font-bold font-headline tracking-tight whitespace-nowrap">Editar Equipo: {team.name}</h1>
                 <Button variant="outline" size="icon" onClick={() => navigateToTeam(nextTeamId)} disabled={!nextTeamId}>
                    <ChevronRight className="h-4 w-4"/>
                </Button>
            </div>
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
                              <Input id="name" autoComplete="off" value={team.name || ''} onChange={handleTeamInputChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="level">Nivel</Label>
                              <Input id="level" placeholder="p.ej. Competición, Escuela" value={team.level || ''} onChange={handleTeamInputChange} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label htmlFor="minAge">Edad Mínima</Label>
                                  <Input id="minAge" type="number" value={team.minAge ?? ''} onChange={handleTeamInputChange} />
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="maxAge">Edad Máxima</Label>
                                  <Input id="maxAge" type="number" value={team.maxAge ?? ''} onChange={handleTeamInputChange} />
                              </div>
                          </div>
                           <div className="space-y-2">
                              <Label htmlFor="defaultMonthlyFee">Cuota Mensual por Defecto (€)</Label>
                              <Input id="defaultMonthlyFee" type="number" value={team.defaultMonthlyFee ?? ''} onChange={handleTeamInputChange} />
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
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button size="sm" className="h-8 gap-1">
                                          <UserPlus className="h-3.5 w-3.5" />
                                          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                              Añadir Miembro
                                          </span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={() => handleOpenModal('add', 'player')}>
                                        <User className="mr-2 h-4 w-4"/>
                                        Añadir Jugador
                                      </DropdownMenuItem>
                                       <DropdownMenuItem onSelect={() => handleOpenModal('add', 'coach')}>
                                        <UserSquare className="mr-2 h-4 w-4"/>
                                        Añadir Entrenador
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                              )}
                            </div>
                          </div>
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                       <TableHead className="w-[80px]">
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
                                          <TableCell>
                                            <Checkbox
                                              checked={selectedMembers.includes(member.id)}
                                              onCheckedChange={(checked) => handleSelectMember(member.id, checked as boolean)}
                                              aria-label={`Seleccionar a ${member.name}`}
                                              disabled={member.role !== 'Jugador'}
                                            />
                                          </TableCell>
                                          <TableCell className="font-medium">
                                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingMember({member: member.data as Player | Coach, type: member.role === 'Jugador' ? 'player' : 'coach'})}>
                                              <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
                                                <AvatarFallback>{member.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                              </Avatar>
                                              <div className="flex items-center gap-2">
                                                <span className="hover:underline">{member.name}</span>
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
                                                <DropdownMenuItem onClick={() => setViewingMember({member: member.data as Player | Coach, type: member.role === 'Jugador' ? 'player' : 'coach'})}><Eye className="mr-2 h-4 w-4"/>Ver Ficha</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenModal('edit', member.role === 'Jugador' ? 'player' : 'coach', member)}>Editar</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => setMemberToDelete(member)}>
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
                          Total: <strong>{playerCount}</strong> {playerCount === 1 ? 'Jugador' : 'Jugadores'} y <strong>{coachCount}</strong> {coachCount === 1 ? 'Entrenador' : 'Entrenadores'}.
                        </div>
                      </CardFooter>
                  </Card>
              </div>
          </div>
      </div>

       {viewingMember && (
        <MemberDetailModal 
            member={viewingMember.member} 
            memberType={viewingMember.type}
            customFieldDefs={customFields.filter(f => f.appliesTo.includes(viewingMember.type))}
            onClose={() => setViewingMember(null)}
            onEdit={() => {
                handleOpenModal('edit', viewingMember.type, {id: viewingMember.member.id, name: `${viewingMember.member.name} ${viewingMember.member.lastName}`, role: viewingMember.member.role, data: viewingMember.member});
                setViewingMember(null);
            }}
        />
      )}

      {/* --- Member Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? `Añadir Nuevo ${modalType === 'player' ? 'Jugador' : 'Entrenador'}` : `Editar ${modalType === 'player' ? 'Jugador' : 'Entrenador'}`}</DialogTitle>
                <DialogDescription>
                    Rellena la información para {modalMode === 'add' ? 'añadir un nuevo' : 'modificar el'} {modalType === 'player' ? 'jugador' : 'entrenador'} al club.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-0">
                <div className="py-4 px-6 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                    <div className="flex flex-col items-center gap-4 pt-5">
                        <Label>Foto del {modalType === 'player' ? 'Jugador' : 'Entrenador'}</Label>
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={imagePreview || (modalType === 'player' ? playerData.avatar : coachData.avatar)} />
                            <AvatarFallback>
                                {(currentData.name || 'N').charAt(0)}
                                {(currentData.lastName || 'J').charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <Button asChild variant="outline" size="sm">
                            <label htmlFor="member-image-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-3 w-3"/>
                                Subir
                            </label>
                        </Button>
                        <Input id="member-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                    
                    <div>
                        <div className="sm:hidden mb-4">
                            <Select value={modalSection} onValueChange={(value) => setModalSection(value as EditModalSection)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sección..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="personal">Datos Personales</SelectItem>
                                    <SelectItem value="contact">Contacto y Tutor</SelectItem>
                                    {modalType === 'player' ? (
                                        <SelectItem value="sports">Datos Deportivos</SelectItem>
                                    ) : (
                                        <SelectItem value="payment">Pago y Equipo</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <Tabs defaultValue="personal" value={modalSection} onValueChange={(value) => setModalSection(value as EditModalSection)} className="w-full hidden sm:block">
                            <TabsList className={`grid w-full ${modalType === 'player' ? 'grid-cols-3' : 'grid-cols-3'}`}>
                                <TabsTrigger value="personal"><User className="mr-2 h-4 w-4"/>Datos Personales</TabsTrigger>
                                <TabsTrigger value="contact"><Contact className="mr-2 h-4 w-4"/>Contacto y Tutor</TabsTrigger>
                                {modalType === 'player' ? (
                                    <TabsTrigger value="sports"><Shield className="mr-2 h-4 w-4"/>Datos Deportivos</TabsTrigger>
                                ) : (
                                    <TabsTrigger value="payment"><CircleDollarSign className="mr-2 h-4 w-4"/>Pago y Equipo</TabsTrigger>
                                )}
                            </TabsList>
                        </Tabs>

                        <div className={cn("pt-6 space-y-6", modalSection !== 'personal' && 'hidden sm:block')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input id="name" autoComplete="off" value={currentData.name || ''} onChange={handleMemberInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Apellidos</Label>
                                    <Input id="lastName" autoComplete="off" value={currentData.lastName || ''} onChange={handleMemberInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                    <DatePicker 
                                        date={currentData.birthDate ? parseISO(currentData.birthDate) : undefined} 
                                        onDateChange={(date) => handleDateChange('birthDate', date)} 
                                    />
                                    {currentData.birthDate && <p className="text-xs text-muted-foreground">Edad: {calculateAge(currentData.birthDate)} años</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dni">NIF</Label>
                                    <Input id="dni" value={currentData.dni || ''} onChange={handleMemberInputChange} />
                                </div>
                                <div className="space-y-2">
                                        <Label htmlFor="sex">Sexo</Label>
                                        <Select value={(currentData as any).sex} onValueChange={(value) => handleSelectChange('sex', value)}>
                                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="masculino">Masculino</SelectItem>
                                                <SelectItem value="femenino">Femenino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                            </div>
                                <div className="space-y-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input id="address" value={(currentData as any).address || ''} onChange={handleMemberInputChange} />
                                </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">Ciudad</Label>
                                    <Input id="city" value={(currentData as any).city || ''} onChange={handleMemberInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">Código Postal</Label>
                                    <Input id="postalCode" value={(currentData as any).postalCode || ''} onChange={handleMemberInputChange} />
                                </div>
                            </div>
                                <div className="p-4 border rounded-md mt-4 space-y-4 bg-muted/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                    <Label>Fecha de Alta</Label>
                                    <DatePicker 
                                        date={currentData.startDate ? parseISO(currentData.startDate) : undefined}
                                        onDateChange={(date) => handleDateChange('startDate', date)}
                                    />
                                    </div>
                                    <div className="space-y-2">
                                    <Label>Fecha de Baja</Label>
                                    <DatePicker 
                                        date={currentData.endDate ? parseISO(currentData.endDate) : undefined}
                                        onDateChange={(date) => handleDateChange('endDate', date)}
                                        disabled={currentData.currentlyActive}
                                    />
                                    </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="currentlyActive" checked={currentData.currentlyActive} onCheckedChange={(checked) => handleCheckboxChange('currentlyActive', checked as boolean)} />
                                <Label htmlFor="currentlyActive">Actualmente de alta</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="hasInterruption" checked={(currentData.interruptions?.length || 0) > 0} onCheckedChange={(checked) => {
                                    if(checked) { handleAddInterruption() }
                                    else { 
                                        if(modalType === 'player') setPlayerData(prev => ({...prev, interruptions: []}))
                                        else setCoachData(prev => ({...prev, interruptions: []}))
                                        }
                                }} />
                                <Label htmlFor="hasInterruption">Ha tenido interrupciones en su alta</Label>
                            </div>
                            {(currentData.interruptions?.length || 0) > 0 && (
                                <div className="space-y-2 pl-6">
                                    {currentData.interruptions?.map((interruption, index) => (
                                        <div key={interruption.id} className="flex items-end gap-2">
                                            <div className="space-y-1">
                                                <Label>Inicio Interrupción</Label>
                                                    <DatePicker date={interruption.startDate ? parseISO(interruption.startDate) : undefined} onDateChange={(date) => handleInterruptionDateChange(index, 'startDate', date)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Fin Interrupción</Label>
                                                    <DatePicker date={interruption.endDate ? parseISO(interruption.endDate) : undefined} onDateChange={(date) => handleInterruptionDateChange(index, 'endDate', date)} />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveInterruption(interruption.id)}><Trash className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={handleAddInterruption}>Añadir otra interrupción</Button>
                                </div>
                            )}
                            <p className="text-sm font-medium text-muted-foreground pt-2">Antigüedad en el club: <span className="text-foreground">{calculateTenure(currentData)}</span></p>
                            </div>
                        </div>

                        <div className={cn("pt-6 space-y-6", modalSection !== 'contact' && 'hidden sm:block')}>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="isOwnTutor" 
                                    checked={currentData.isOwnTutor || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('isOwnTutor', checked as boolean)}
                                />
                                <Label htmlFor="isOwnTutor" className="font-normal">{modalType === 'player' ? 'El jugador' : 'El entrenador'} es su propio tutor (mayor de 18 años)</Label>
                            </div>
                                
                                {!(currentData.isOwnTutor) && (
                                    <div className="space-y-6 p-4 border rounded-md bg-muted/50 mt-4">
                                        <h4 className="font-medium">Datos del Tutor/a</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="tutorName">Nombre</Label>
                                                <Input id="tutorName" autoComplete="off" value={(currentData as any).tutorName || ''} onChange={handleMemberInputChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tutorLastName">Apellidos</Label>
                                                <Input id="tutorLastName" autoComplete="off" value={(currentData as any).tutorLastName || ''} onChange={handleMemberInputChange} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorDni">NIF del Tutor/a</Label>
                                            <Input id="tutorDni" value={(currentData as any).tutorDni || ''} onChange={handleMemberInputChange} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={modalType === 'player' ? 'tutorEmail' : 'email'}>{currentData.isOwnTutor ? "Email" : "Email del Tutor/a"}</Label>
                                        <Input id={modalType === 'player' ? "tutorEmail" : "email"} type="email" value={modalType === 'player' ? (currentData as Player).tutorEmail || '' : (currentData as Coach).email || ''} onChange={handleMemberInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={modalType === 'player' ? 'tutorPhone' : 'phone'}>{currentData.isOwnTutor ? "Teléfono" : "Teléfono del Tutor/a"}</Label>
                                        <Input id={modalType === 'player' ? "tutorPhone" : "phone"} type="tel" value={modalType === 'player' ? (currentData as Player).tutorPhone || '' : (currentData as Coach).phone || ''} onChange={handleMemberInputChange} />
                                    </div>
                                </div>
                        </div>
                        
                        <div className={cn("pt-6 space-y-6", modalType === 'player' ? (modalSection !== 'sports' && 'hidden sm:block') : (modalSection !== 'payment' && 'hidden sm:block'))}>
                            {modalType === 'player' ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="iban">IBAN Cuenta Bancaria</Label>
                                        <Input id="iban" value={playerData.iban || ''} onChange={handleMemberInputChange} />
                                    </div>
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
                                            <Input id="jerseyNumber" type="number" value={playerData.jerseyNumber || ''} onChange={handleMemberInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="monthlyFee">Cuota (€)</Label>
                                            <Input id="monthlyFee" type="number" value={playerData.monthlyFee ?? ''} onChange={handleMemberInputChange} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="kitSize">Talla de Equipación</Label>
                                            <Input id="kitSize" placeholder="p.ej., L, 12, M" value={playerData.kitSize || ''} onChange={handleMemberInputChange} />
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="medicalCheckCompleted" checked={playerData.medicalCheckCompleted} onCheckedChange={(checked) => handleCheckboxChange('medicalCheckCompleted', checked as boolean)} />
                                                <Label htmlFor="medicalCheckCompleted">Revisión médica completada</Label>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="iban">IBAN Cuenta Bancaria</Label>
                                            <Input id="iban" value={coachData.iban || ''} onChange={handleMemberInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="monthlyPayment">Pago Mensual (€)</Label>
                                            <Input id="monthlyPayment" type="number" value={coachData.monthlyPayment ?? ''} onChange={handleMemberInputChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="teamId">Equipo Asignado</Label>
                                        <Select onValueChange={(value) => handleSelectChange('teamId' as any, value)} value={coachData.teamId || 'unassigned'}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un equipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Sin equipo</SelectItem>
                                                {allTeams.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveMember} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al miembro {memberToDelete?.name}.
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
