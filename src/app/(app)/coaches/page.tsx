
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
  ChevronDown,
  Filter,
  Trash2,
  Save,
  Briefcase,
  Send,
  Columns,
  Trash,
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Coach, ClubMember, Interruption, CustomFieldDef } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, intervalToDuration, differenceInMilliseconds } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { requestDataUpdateAction } from "@/lib/actions";
import { FieldSelector } from "@/components/data-update-sender";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MemberDetailModal } from "@/components/member-detail-modal";
import { useTranslation } from "@/components/i18n-provider";
import { Separator } from "@/components/ui/separator";

const technicalRoles = [
    "Entrenador",
    "Segundo Entrenador",
    "Coordinador",
    "Director Técnico",
    "Director Deportivo",
    "Preparador Físico",
    "Delegado",
    "Fisioterapeuta",
    "Psicólogo",
    "Nutricionista",
    "Analista",
    "Otro",
];

export default function CoachesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [coachData, setCoachData] = useState<Partial<Coach>>({ interruptions: [], customFields: {} });
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [viewingCoach, setViewingCoach] = useState<Coach | null>(null);
  
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['name', 'role', 'teamName', 'email']));
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  
  const coachFields = t('coaches.coachFields', { returnObjects: true });

  const allColumnFields = (Array.isArray(coachFields.personal) && Array.isArray(coachFields.contact) && Array.isArray(coachFields.payment)) ? 
  [...coachFields.personal, ...coachFields.contact, ...coachFields.payment] : [];
  
  const coachCustomFields = customFields.filter(f => f.appliesTo.includes('coach'));
  
  const allPossibleColumns = [...allColumnFields, ...coachCustomFields];


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
  
    const calculateTenure = (coach: Partial<Coach>): string => {
        if (!coach.startDate) return "N/A";
        
        const start = parseISO(coach.startDate);
        const end = coach.currentlyActive ? new Date() : (coach.endDate ? parseISO(coach.endDate) : new Date());
        
        if (start > end) return "Fechas inválidas";
        
        let totalMilliseconds = differenceInMilliseconds(end, start);
        
        coach.interruptions?.forEach(interruption => {
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
      setFilteredCoaches(coaches);
    } else {
      setFilteredCoaches(coaches.filter(c => c.teamId === filterTeamId));
    }
  }, [filterTeamId, coaches]);

  const hasMissingData = (coach: any): boolean => {
    const requiredFields = [
      'birthDate', 'dni', 'address', 'city', 'postalCode',
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
      const settingsRef = doc(db, "clubs", clubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const clubCustomFields = settingsSnap.data().customFields || [];
        setCustomFields(clubCustomFields.filter((f: CustomFieldDef) => f.appliesTo.includes('coach')));
      }

      const teamsQuery = query(collection(db, "clubs", clubId, "teams"), orderBy("order"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);
      
      const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
      const coachesSnapshot = await getDocs(coachesQuery);
      const coachesList = coachesSnapshot.docs.map(doc => {
          const data = doc.data();
           let teamName = "Sin equipo";
           if (data.teamId === 'club') {
                teamName = "Club (transversal)";
           } else {
                const team = teamsList.find(t => t.id === data.teamId);
                if (team) teamName = team.name;
           }

          return { 
              id: doc.id, 
              ...data,
              avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
              teamName: teamName,
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
    setCoachData(prev => ({ ...prev, [id]: type === 'number' ? (value === '' ? null : Number(value)) : value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCoachData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value,
      }
    }));
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

  const handleDateChange = (id: keyof Coach, date: Date | undefined) => {
    if (date) {
        setCoachData(prev => ({ ...prev, [id]: format(date, "yyyy-MM-dd") }));
    }
  };
  
  const handleInterruptionDateChange = (index: number, field: 'startDate' | 'endDate', date: Date | undefined) => {
    if(date){
        const updatedInterruptions = [...(coachData.interruptions || [])];
        updatedInterruptions[index][field] = format(date, "yyyy-MM-dd");
        setCoachData(prev => ({...prev, interruptions: updatedInterruptions}));
    }
  }

  const handleAddInterruption = () => {
    const newInterruption: Interruption = { id: uuidv4(), startDate: '', endDate: '' };
    setCoachData(prev => ({...prev, interruptions: [...(prev.interruptions || []), newInterruption]}));
  }

  const handleRemoveInterruption = (id: string) => {
    setCoachData(prev => ({...prev, interruptions: prev.interruptions?.filter(i => i.id !== id)}));
  }

  const handleOpenModal = (mode: 'add' | 'edit', coach?: Coach) => {
    setModalMode(mode);
    setCoachData(mode === 'edit' && coach ? coach : { interruptions: [], customFields: {} });
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

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
      
      let teamName = "Sin equipo";
      if (coachData.teamId === 'club') {
          teamName = "Club (transversal)";
      } else {
          teamName = teams.find(t => t.id === coachData.teamId)?.name || "Sin equipo";
      }

      const dataToSave = {
        ...coachData,
        teamName,
        avatar: imageUrl || coachData.avatar || `https://placehold.co/40x40.png?text=${(coachData.name || '').charAt(0)}`,
        monthlyPayment: (coachData.monthlyPayment === '' || coachData.monthlyPayment === undefined || coachData.monthlyPayment === null) ? null : Number(coachData.monthlyPayment),
      };
      
      delete (dataToSave as Partial<Coach>).id;

      if (modalMode === 'edit' && coachData.id) {
        const coachRef = doc(db, "clubs", clubId, "coaches", coachData.id);
        await updateDoc(coachRef, dataToSave);
        toast({ title: "Miembro actualizado", description: `${coachData.name} ha sido actualizado.` });
      } else {
        const coachDocRef = await addDoc(collection(db, "clubs", clubId, "coaches"), dataToSave);
        toast({ title: "Miembro añadido", description: `${coachData.name} ha sido añadido al equipo técnico.` });
        
        if (dataToSave.email) {
            const userRef = doc(db, "users", coachDocRef.id);
            await setDoc(userRef, {
                email: dataToSave.email,
                name: `${dataToSave.name} ${dataToSave.lastName}`,
                role: 'Entrenador',
                clubId: clubId
            });
            toast({
                title: "Acceso a la app creado",
                description: `Se ha creado una cuenta de usuario para ${dataToSave.name} ${dataToSave.lastName}.`,
            });
        }
      }

      setIsModalOpen(false);
      setCoachData({ interruptions: [] });
    } catch (error) {
        console.error("Error saving coach: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el miembro." });
    } finally {
      setSaving(false);
      if(clubId) fetchData(clubId);
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

        const usersQuery = query(collection(db, 'users'), where('email', '==', coachToDelete.email));
        const usersSnapshot = await getDocs(usersQuery);
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await deleteDoc(doc(db, 'users', userDoc.id));
        }

        toast({ title: "Miembro eliminado", description: `${coachToDelete.name} ${coachToDelete.lastName} ha sido eliminado.`});
    } catch (error) {
        console.error("Error deleting coach: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al miembro." });
    } finally {
        setIsDeleting(false);
        setCoachToDelete(null);
        if(clubId) fetchData(clubId);
    }
  };
  
  const handleSelectCoach = (coachId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCoaches(prev => [...prev, coachId]);
    } else {
      setSelectedCoaches(prev => prev.filter(id => id !== coachId));
    }
  };
  
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedCoaches(filteredCoaches.map(c => c.id));
    } else {
      setSelectedCoaches([]);
    }
  };

  const handleBulkAssignTeam = async (teamId: string) => {
    if (!clubId || selectedCoaches.length === 0) return;

    setLoading(true);
    try {
        let teamName = "Sin equipo";
        if (teamId === 'club') {
            teamName = "Club (transversal)";
        } else if (teamId !== 'unassigned') {
            teamName = teams.find(t => t.id === teamId)?.name || "Sin equipo";
        }
        
        const batch = writeBatch(db);
        selectedCoaches.forEach(coachId => {
            const coachRef = doc(db, "clubs", clubId, "coaches", coachId);
            batch.update(coachRef, { teamId, teamName });
        });
        await batch.commit();

        toast({
            title: "Miembros actualizados",
            description: `${selectedCoaches.length} miembros han sido asignados al nuevo equipo.`
        });
        setSelectedCoaches([]);
    } catch (error) {
        console.error("Error assigning coaches in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo asignar los miembros al equipo." });
    } finally {
        setLoading(false);
        if(clubId) fetchData(clubId);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!clubId || selectedCoaches.length === 0) return;

    setIsDeleting(true);
    try {
        const batch = writeBatch(db);
        for (const coachId of selectedCoaches) {
            const coach = coaches.find(p => p.id === coachId);
            if (coach) {
                if (coach.avatar && !coach.avatar.includes('placehold.co')) {
                    const imageRef = ref(storage, coach.avatar);
                    await deleteObject(imageRef).catch(e => console.warn("Could not delete old image:", e));
                }
                
                const coachRef = doc(db, "clubs", clubId, "coaches", coachId);
                batch.delete(coachRef);

                const usersQuery = query(collection(db, 'users'), where('email', '==', coach.email));
                const usersSnapshot = await getDocs(usersQuery);
                if (!usersSnapshot.empty) {
                    const userDoc = usersSnapshot.docs[0];
                    batch.delete(doc(db, 'users', userDoc.id));
                }
            }
        }
        await batch.commit();

        toast({
            title: "Miembros eliminados",
            description: `${selectedCoaches.length} miembros han sido eliminados.`
        });
        setSelectedCoaches([]);
    } catch (error) {
        console.error("Error deleting coaches in bulk:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar a los miembros." });
    } finally {
        setIsDeleting(false);
        setIsBulkDeleteAlertOpen(false);
        if(clubId) fetchData(clubId);
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
      const newSelection = new Set(selectedCoaches);
      if(isSelected) {
        newSelection.add(memberId);
      } else {
        newSelection.delete(memberId);
      }
      setSelectedCoaches(Array.from(newSelection));
  };

  const handleSelectAllMembers = (checked: boolean) => {
      if (checked) {
          setSelectedCoaches(coaches.map(m => m.id));
      } else {
          setSelectedCoaches([]);
      }
  };

  const handleSendUpdateRequests = async () => {
      if (!clubId) return;
      if (selectedCoaches.length === 0) {
          toast({ variant: "destructive", title: "Error", description: "No has seleccionado ningún entrenador." });
          return;
      }
      setSaving(true);
      const membersToSend = coaches.filter(p => selectedCoaches.includes(p.id))
                                      .map(p => ({ id: p.id, name: `${p.name} ${p.lastName}`, email: p.email || '' }));
      const result = await requestDataUpdateAction({
          clubId,
          members: membersToSend,
          memberType: 'coach',
          fields: selectedFields
      });
      if (result.success) {
          toast({
              title: "Solicitudes Enviadas",
              description: `Se han enviado ${result.count} correos para la actualización de datos.`
          });
          setIsMembersModalOpen(false);
          setSelectedFields([]);
          setSelectedCoaches([]);
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

  const getCellContent = (coach: Coach, columnId: string) => {
      const customFieldDef = coachCustomFields.find(f => f.id === columnId);
      if (customFieldDef) {
        return coach.customFields?.[columnId] || 'N/A';
      }

      const value = coach[columnId as keyof Coach];
      switch (columnId) {
          case 'name':
              return `${coach.name} ${coach.lastName}`;
          case 'role':
                return <Badge variant="secondary">{coach.role || 'Sin cargo'}</Badge>;
          case 'teamName':
              return coach.teamName;
          case 'monthlyPayment':
              return value === null || value === undefined ? 'N/A' : `${value} €`;
          default:
                return value === null || value === undefined || value === '' ? 'N/A' : String(value);
      }
  };

  if (loading && !coaches.length) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }
  
  const isAllSelected = filteredCoaches.length > 0 && selectedCoaches.length === filteredCoaches.length;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>{t('coaches.title')}</CardTitle>
              <CardDescription>
                {t('coaches.description')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
               <Button onClick={() => setIsFieldsModalOpen(true)} className="w-full sm:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  {t('coaches.requestUpdate')}
              </Button>
               <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1 w-full sm:w-auto">
                        <Columns className="mr-2 h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          {t('coaches.columns')}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                     <ScrollArea className="h-[400px]">
                      <DropdownMenuLabel>{t('coaches.toggleColumns')}</DropdownMenuLabel>
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
                            {(field as { label: string }).label || (field as CustomFieldDef).name}
                          </DropdownMenuCheckboxItem>
                      ))}
                      </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                    <SelectTrigger className="h-9 w-full sm:w-[150px]">
                      <SelectValue placeholder={t('coaches.filterByTeam')}/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('coaches.allTeams')}</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              {selectedCoaches.length > 0 ? (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 gap-1 w-full sm:w-auto">
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                           {t('coaches.actions')} ({selectedCoaches.length})
                        </span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuSub>
                         <DropdownMenuSubTrigger>{t('coaches.assignToTeam')}</DropdownMenuSubTrigger>
                         <DropdownMenuSubContent>
                            <DropdownMenuItem onSelect={() => handleBulkAssignTeam('club')}>Club (transversal)</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleBulkAssignTeam('unassigned')}>{t('coaches.unassigned')}</DropdownMenuItem>
                            <DropdownMenuSeparator/>
                           {teams.map(team => (
                             <DropdownMenuItem key={team.id} onSelect={() => handleBulkAssignTeam(team.id)}>
                               {team.name}
                             </DropdownMenuItem>
                           ))}
                         </DropdownMenuSubContent>
                       </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setIsBulkDeleteAlertOpen(true)}>{t('coaches.deleteSelected')}</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              ) : (
                  <Button size="sm" className="h-9 gap-1 w-full sm:w-auto" onClick={() => handleOpenModal('add')}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        {t('coaches.addCoach')}
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
                      aria-label={t('coaches.selectAll')}
                    />
                  </TableHead>
                  {allPossibleColumns.map(field => (
                      <TableHead 
                        key={field.id}
                        className={cn(
                          'min-w-[150px]',
                          !visibleColumns.has(field.id) && 'hidden'
                        )}
                      >
                          {(field as CustomFieldDef).name || (field as {label: string}).label}
                      </TableHead>
                  ))}
                  <TableHead>
                    <span className="sr-only">{t('coaches.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoaches.map(coach => (
                  <TableRow key={coach.id} data-state={selectedCoaches.includes(coach.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCoaches.includes(coach.id)}
                        onCheckedChange={(checked) => handleSelectCoach(coach.id, checked as boolean)}
                        aria-label={`Seleccionar a ${coach.name}`}
                      />
                    </TableCell>
                    {allPossibleColumns.map(field => (
                          <TableCell 
                            key={field.id} 
                            className={cn(
                              'min-w-[150px]',
                              !visibleColumns.has(field.id) && 'hidden',
                              field.id === 'name' && 'font-medium'
                            )}
                          >
                              {field.id === 'name' ? (
                                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingCoach(coach)}>
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage src={coach.avatar} alt={coach.name} data-ai-hint="foto persona" />
                                      <AvatarFallback>{coach.name?.charAt(0)}{coach.lastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center gap-2">
                                      <span className="hover:underline">{getCellContent(coach, field.id)}</span>
                                      {coach.hasMissingData && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                              <AlertCircle className="h-4 w-4 text-destructive" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{t('coaches.missingData')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                              ) : (
                                  getCellContent(coach, field.id)
                              )}
                          </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('coaches.toggleMenu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('coaches.actions')}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewingCoach(coach)}><Eye className="mr-2 h-4 w-4"/>{t('coaches.viewProfile')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal('edit', coach)}>{t('coaches.edit')}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setCoachToDelete(coach)}>
                            {t('coaches.delete')}
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
          <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('coaches.showing', { count: filteredCoaches.length, total: coaches.length }) }}>
          </div>
        </CardFooter>
      </Card>
      
      {viewingCoach && (
        <MemberDetailModal 
            member={viewingCoach} 
            memberType="coach" 
            customFieldDefs={customFields}
            onClose={() => setViewingCoach(null)}
            onEdit={() => {
                handleOpenModal('edit', viewingCoach);
                setViewingCoach(null);
            }}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? t('coaches.addCoachTitle') : t('coaches.editCoachTitle')}</DialogTitle>
                <DialogDescription>
                    {modalMode === 'add' ? t('coaches.addCoachDesc') : t('coaches.editCoachDesc')}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-0">
                <div className="py-4 px-6 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-8 gap-y-6">
                    <div className="flex flex-col items-center gap-4 pt-5">
                        <Label>{t('coaches.coachPhoto')}</Label>
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={imagePreview || coachData.avatar} />
                            <AvatarFallback>
                                {(coachData.name || 'E').charAt(0)}
                                {(coachData.lastName || 'T').charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <Button asChild variant="outline" size="sm">
                            <label htmlFor="coach-image" className="cursor-pointer">
                                <Upload className="mr-2 h-3 w-3"/>
                                {t('coaches.upload')}
                            </label>
                        </Button>
                        <Input id="coach-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                    
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center">
                                <h3 className="text-lg font-semibold text-primary">{t('coaches.personalData')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('coaches.fields.name')}</Label>
                                    <Input id="name" autoComplete="off" value={coachData.name || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">{t('coaches.fields.lastName')}</Label>
                                    <Input id="lastName" autoComplete="off" value={coachData.lastName || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                    <Label htmlFor="birthDate">{t('coaches.fields.birthDate')}</Label>
                                    <DatePicker 
                                        date={coachData.birthDate ? parseISO(coachData.birthDate) : undefined}
                                        onDateChange={(date) => handleDateChange('birthDate', date)}
                                    />
                                    {coachData.birthDate && <p className="text-xs text-muted-foreground">{t('coaches.age')}: {calculateAge(coachData.birthDate)} {t('coaches.years')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dni">{t('coaches.fields.dni')}</Label>
                                    <Input id="dni" value={coachData.dni || ''} onChange={handleInputChange} />
                                </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sex">{t('coaches.fields.sex')}</Label>
                                        <Select value={coachData.sex} onValueChange={(value) => handleSelectChange('sex', value)}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="masculino">Masculino</SelectItem>
                                                <SelectItem value="femenino">Femenino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nationality">{t('coaches.fields.nationality')}</Label>
                                        <Input id="nationality" value={coachData.nationality || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="healthCardNumber">{t('coaches.fields.healthCard')}</Label>
                                        <Input id="healthCardNumber" value={coachData.healthCardNumber || ''} onChange={handleInputChange} />
                                    </div>
                            </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">{t('coaches.fields.address')}</Label>
                                    <Input id="address" value={coachData.address || ''} onChange={handleInputChange} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">{t('coaches.fields.city')}</Label>
                                    <Input id="city" value={coachData.city || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">{t('coaches.fields.postalCode')}</Label>
                                    <Input id="postalCode" value={coachData.postalCode || ''} onChange={handleInputChange} />
                                </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="kitSize">{t('coaches.fields.kitSize')}</Label>
                                        <Input id="kitSize" placeholder="p.ej., L, 12, M" value={coachData.kitSize || ''} onChange={handleInputChange} />
                                    </div>
                            </div>
                                <div className="p-4 border rounded-md mt-4 space-y-4 bg-muted/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                    <Label>{t('coaches.startDate')}</Label>
                                    <DatePicker 
                                        date={coachData.startDate ? parseISO(coachData.startDate) : undefined}
                                        onDateChange={(date) => handleDateChange('startDate', date)}
                                    />
                                    </div>
                                    <div className="space-y-2">
                                    <Label>{t('coaches.endDate')}</Label>
                                    <DatePicker 
                                        date={coachData.endDate ? parseISO(coachData.endDate) : undefined}
                                        onDateChange={(date) => handleDateChange('endDate', date)}
                                        disabled={coachData.currentlyActive}
                                    />
                                    </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="currentlyActive" checked={coachData.currentlyActive} onCheckedChange={(checked) => handleCheckboxChange('currentlyActive', checked as boolean)} />
                                <Label htmlFor="currentlyActive">{t('coaches.currentlyActive')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="hasInterruption" checked={(coachData.interruptions?.length || 0) > 0} onCheckedChange={(checked) => {
                                    if(checked) { handleAddInterruption() }
                                    else { setCoachData(prev => ({...prev, interruptions: []}))}
                                }} />
                                <Label htmlFor="hasInterruption">{t('coaches.hasInterruptions')}</Label>
                            </div>
                            {(coachData.interruptions?.length || 0) > 0 && (
                                <div className="space-y-2 pl-6">
                                    {coachData.interruptions?.map((interruption, index) => (
                                        <div key={interruption.id} className="flex items-end gap-2">
                                            <div className="space-y-1">
                                                <Label>{t('coaches.interruptionStart')}</Label>
                                                    <DatePicker date={interruption.startDate ? parseISO(interruption.startDate) : undefined} onDateChange={(date) => handleInterruptionDateChange(index, 'startDate', date)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>{t('coaches.interruptionEnd')}</Label>
                                                    <DatePicker date={interruption.endDate ? parseISO(interruption.endDate) : undefined} onDateChange={(date) => handleInterruptionDateChange(index, 'endDate', date)} />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveInterruption(interruption.id)}><Trash className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={handleAddInterruption}>{t('coaches.addInterruption')}</Button>
                                </div>
                            )}
                            <p className="text-sm font-medium text-muted-foreground pt-2">{t('coaches.tenure')}: <span className="text-foreground">{calculateTenure(coachData)}</span></p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center pt-6">
                                <h3 className="text-lg font-semibold text-primary">{t('coaches.contactAndTutor')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="isOwnTutor" 
                                    checked={coachData.isOwnTutor || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('isOwnTutor', checked as boolean)}
                                />
                                <Label htmlFor="isOwnTutor" className="font-normal">{t('coaches.isOwnTutor')}</Label>
                            </div>
                                
                                {!(coachData.isOwnTutor) && (
                                    <div className="space-y-6 p-4 border rounded-md bg-muted/50 mt-4">
                                        <h4 className="font-medium">{t('coaches.tutorData')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="tutorName">{t('coaches.fields.name')}</Label>
                                                <Input id="tutorName" autoComplete="off" value={coachData.tutorName || ''} onChange={handleInputChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tutorLastName">{t('coaches.fields.lastName')}</Label>
                                                <Input id="tutorLastName" autoComplete="off" value={coachData.tutorLastName || ''} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tutorDni">{t('coaches.fields.tutorDni')}</Label>
                                            <Input id="tutorDni" value={coachData.tutorDni || ''} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('coaches.fields.email')}</Label>
                                        <Input id="email" type="email" value={coachData.email || ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('coaches.fields.phone')}</Label>
                                        <Input id="phone" type="tel" value={coachData.phone || ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center pt-6">
                                <h3 className="text-lg font-semibold text-primary">{t('coaches.roleAndTeam')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">{t('coaches.fields.role')}</Label>
                                <Select onValueChange={(value) => handleSelectChange('role', value)} value={coachData.role}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {technicalRoles.map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="teamId">{t('coaches.fields.team')}</Label>
                                <Select onValueChange={(value) => handleSelectChange('teamId', value)} value={coachData.teamId || 'unassigned'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">{t('coaches.unassigned')}</SelectItem>
                                        <SelectItem value="club">Club (transversal)</SelectItem>
                                        <DropdownMenuSeparator/>
                                        {teams.map(team => (
                                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="iban">{t('coaches.fields.iban')}</Label>
                                    <Input id="iban" value={coachData.iban || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="monthlyPayment">{t('coaches.fields.monthlyPayment')}</Label>
                                    <Input id="monthlyPayment" type="number" value={coachData.monthlyPayment ?? ''} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <div className="flex items-center pt-6">
                                <h3 className="text-lg font-semibold text-primary">{t('coaches.otherData')}</h3>
                                <Separator className="flex-1 ml-4" />
                            </div>
                            {coachCustomFields.length > 0 ? coachCustomFields.map(field => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.id}>{field.name}</Label>
                                    <Input 
                                        id={field.id}
                                        type={field.type}
                                        value={coachData.customFields?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    />
                                </div>
                            )) : (
                                <p className="text-center text-sm text-muted-foreground pt-10">{t('coaches.noCustomFields')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveCoach} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4"/>}
                    {t('common.saveChanges')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!coachToDelete} onOpenChange={(open) => !open && setCoachToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('coaches.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('coaches.confirmDeleteDesc', { coachName: `${coachToDelete?.name} ${coachToDelete?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCoach} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : t('coaches.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('coaches.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('coaches.confirmBulkDeleteDesc', { coachCount: selectedCoaches.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteAlertOpen(false)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : t('coaches.deleteCoaches')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Data Update Modals --- */}
      <Dialog open={isFieldsModalOpen} onOpenChange={setIsFieldsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('coaches.step1Title')}</DialogTitle>
            <DialogDescription>{t('coaches.step1Desc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FieldSelector fields={coachFields} customFields={coachCustomFields} selectedFields={selectedFields} onFieldSelect={handleFieldSelection} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={() => { setIsFieldsModalOpen(false); setIsMembersModalOpen(true); }} disabled={selectedFields.length === 0}>
              {t('coaches.nextStep')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('coaches.step2Title')}</DialogTitle>
            <DialogDescription>{t('coaches.step2Desc')}</DialogHeader>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center p-2 border rounded-md">
              <Checkbox 
                id="select-all-members" 
                onCheckedChange={(checked) => handleSelectAllMembers(checked as boolean)}
                checked={coaches.length > 0 && selectedCoaches.length === coaches.length}
              />
              <Label htmlFor="select-all-members" className="ml-2 font-medium">{t('coaches.selectAll')} ({coaches.length})</Label>
            </div>
            <ScrollArea className="h-72 mt-4">
              <div className="space-y-2">
                {coaches.map(member => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 border rounded-md">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedCoaches.includes(member.id)}
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
              {t('coaches.back')}
            </Button>
            <Button onClick={handleSendUpdateRequests} disabled={saving || selectedCoaches.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {saving ? 'Enviando...' : t('coaches.sendTo', { count: selectedCoaches.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

    