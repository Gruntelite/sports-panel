
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { Player, Coach, Staff, ClubMember, Team } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Check, ChevronsUpDown, Send, UserPlus, Loader2, Settings, Eye, Lock, Edit, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const MEMBER_TYPES = [
    { value: 'Jugador', label: 'Jugadores' },
    { value: 'Entrenador', label: 'Entrenadores' },
    { value: 'Staff', label: 'Staff' }
];

const BATCH_SIZE = 100;

const playerFields = [
  { id: 'name', label: 'Nombre' }, { id: 'lastName', label: 'Apellidos' }, { id: 'birthDate', label: 'Fecha de Nacimiento' },
  { id: 'dni', label: 'DNI' }, { id: 'address', label: 'Dirección' }, { id: 'city', label: 'Ciudad' }, { id: 'postalCode', label: 'Código Postal' },
  { id: 'tutorEmail', label: 'Email de Contacto' }, { id: 'tutorPhone', label: 'Teléfono de Contacto' }, { id: 'iban', label: 'IBAN' },
  { id: 'jerseyNumber', label: 'Dorsal' }, { id: 'monthlyFee', label: 'Cuota Mensual' }, { id: 'kitSize', label: 'Talla Equipación' },
  { id: 'tutorName', label: 'Nombre Tutor/a' }, { id: 'tutorLastName', label: 'Apellidos Tutor/a' }, { id: 'tutorDni', label: 'DNI Tutor/a' },
];

const coachFields = [
  { id: 'name', label: 'Nombre' }, { id: 'lastName', label: 'Apellidos' }, { id: 'birthDate', label: 'Fecha de Nacimiento' },
  { id: 'dni', label: 'DNI' }, { id: 'email', label: 'Email' }, { id: 'phone', label: 'Teléfono' },
  { id: 'address', label: 'Dirección' }, { id: 'city', label: 'Ciudad' }, { id: 'postalCode', label: 'Código Postal' },
  { id: 'iban', label: 'IBAN' }, { id: 'monthlyPayment', label: 'Pago Mensual' }, { id: 'kitSize', label: 'Talla Equipación' },
  { id: 'tutorName', label: 'Nombre Tutor/a' }, { id: 'tutorLastName', label: 'Apellidos Tutor/a' }, { id: 'tutorDni', label: 'DNI Tutor/a' },
];

const staffFields = [
    { id: 'name', label: 'Nombre' }, { id: 'lastName', label: 'Apellidos' },
    { id: 'role', label: 'Cargo' }, { id: 'email', label: 'Email' }, { id: 'phone', label: 'Teléfono' },
];

type FieldConfigState = 'editable' | 'locked' | 'hidden';
type FieldConfig = Record<string, FieldConfigState>;


export function DataUpdateSender() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [clubName, setClubName] = useState<string>("");
    const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    const [sending, setSending] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);
    
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [emailPreview, setEmailPreview] = useState({ subject: "", body: "" });

    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
    const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
    const [isTeamPopoverOpen, setIsTeamPopoverOpen] = useState(false);
    
    const [fieldConfig, setFieldConfig] = useState<FieldConfig>({});
    
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const currentClubId = userDocSnap.data().clubId;
                    setClubId(currentClubId);
                    if (currentClubId) {
                        fetchAllData(currentClubId);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchAllData = async (clubId: string) => {
        const members: ClubMember[] = [];
        try {
            const clubDocRef = doc(db, "clubs", clubId);
            const clubDocSnap = await getDoc(clubDocRef);
            if(clubDocSnap.exists()) {
                setClubName(clubDocSnap.data()?.name || "Tu Club");
            }

            const playersSnap = await getDocs(collection(db, "clubs", clubId, "players"));
            playersSnap.forEach(doc => {
                const data = doc.data() as Player;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Jugador', data, teamId: data.teamId });
            });

            const coachesSnap = await getDocs(collection(db, "clubs", clubId, "coaches"));
            coachesSnap.forEach(doc => {
                const data = doc.data() as Coach;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Entrenador', data, teamId: data.teamId });
            });

            const staffSnap = await getDocs(collection(db, "clubs", clubId, "staff"));
            staffSnap.forEach(doc => {
                const data = doc.data() as Staff;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Staff', data, teamId: undefined });
            });
            
            setAllMembers(members);
            
            const teamsSnap = await getDocs(collection(db, "clubs", clubId, "teams"));
            setTeams(teamsSnap.docs.map(doc => ({id: doc.id, ...doc.data()} as Team)));

        } catch (error) {
            console.error("Error fetching club members:", error);
        }
    };
    
    const filteredMembers = useMemo(() => {
        if (selectedTypes.size === 0 && selectedTeams.size === 0) {
            return allMembers;
        }

        return allMembers.filter(member => {
            const typeMatch = selectedTypes.size === 0 || selectedTypes.has(member.type);
            
            let teamMatch = selectedTeams.size === 0;
            if (selectedTeams.size > 0) {
                 if(member.teamId && selectedTeams.has(member.teamId)) {
                    teamMatch = true;
                } else {
                    teamMatch = false;
                }
            }
             
            if (selectedTypes.size > 0 && selectedTeams.size > 0) {
                return typeMatch && teamMatch;
            }
            if (selectedTypes.size > 0) {
                return typeMatch;
            }
            if (selectedTeams.size > 0) {
                return teamMatch;
            }
            return false;
        });
    }, [allMembers, selectedTypes, selectedTeams]);

    const availableFieldsInfo = useMemo(() => {
        const membersToConsider = selectedMemberIds.size > 0 
            ? allMembers.filter(m => selectedMemberIds.has(m.id))
            : filteredMembers;

        if (membersToConsider.length === 0) {
            return { fields: [], uniqueType: null };
        }

        const firstMemberType = membersToConsider[0].type;
        const allSameType = membersToConsider.every(m => m.type === firstMemberType);

        if (!allSameType) {
            return { fields: [], uniqueType: null };
        }

        switch (firstMemberType) {
            case 'Jugador': return { fields: playerFields, uniqueType: 'Jugador' };
            case 'Entrenador': return { fields: coachFields, uniqueType: 'Entrenador' };
            case 'Staff': return { fields: staffFields, uniqueType: 'Staff' };
            default: return { fields: [], uniqueType: null };
        }
    }, [filteredMembers, selectedMemberIds, allMembers]);

    const { fields: availableFields, uniqueType } = availableFieldsInfo;


    useEffect(() => {
      const newConfig: FieldConfig = {};
      availableFields.forEach(field => {
        newConfig[field.id] = 'editable'; 
      });
      setFieldConfig(newConfig);
    }, [availableFields]);

    const handleFieldConfigChange = (fieldId: string, value: FieldConfigState) => {
        setFieldConfig(prev => ({ ...prev, [fieldId]: value }));
    };

    
    const handleSelectMember = (memberId: string) => {
        const newSelection = new Set(selectedMemberIds);
        if (newSelection.has(memberId)) {
            newSelection.delete(memberId);
        } else {
            newSelection.add(memberId);
        }
        setSelectedMemberIds(newSelection);
    };
    
    const handleSelectAllFiltered = (checked: boolean) => {
        if (checked) {
            setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
        } else {
            setSelectedMemberIds(new Set());
        }
    }

    const handleGeneratePreview = () => {
        const subject = `Actualización de datos para ${clubName}`;
        const body = `Hola [Nombre del Miembro],

Por favor, ayúdanos a mantener tus datos actualizados. Haz clic en el siguiente enlace para revisar y confirmar tu información.

El enlace es personal y solo será válido durante los próximos 7 días.

Gracias,
El equipo de ${clubName}`;

        setEmailPreview({ subject, body });
        setIsPreviewModalOpen(true);
    };
    
    const handleSend = async () => {
      if (!clubId) return;

      const membersToSend = selectedMemberIds.size > 0 
        ? allMembers.filter(m => selectedMemberIds.has(m.id))
        : filteredMembers;

      if (membersToSend.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "No hay destinatarios seleccionados." });
        return;
      }
      
      setSending(true);

      const recipients = membersToSend.map(member => {
        let email = '';
        if (member.type === 'Jugador') {
          email = (member.data as Player).tutorEmail || '';
        } else {
          email = (member.data as Coach | Staff).email || '';
        }
        return {
          id: member.id,
          name: member.name,
          email: email,
          type: member.type,
          status: 'pending',
        };
      }).filter(r => r.email);

      try {
        const totalRecipients = recipients.length;
        const numBatches = Math.ceil(totalRecipients / BATCH_SIZE);
        
        const firestoreBatch = writeBatch(db);
        
        for (let i = 0; i < numBatches; i++) {
          const batchRecipients = recipients.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
          const batchRef = doc(collection(db, 'clubs', clubId, 'emailBatches'));
          
          firestoreBatch.set(batchRef, {
              clubName: clubName,
              recipients: batchRecipients,
              fieldConfig: availableFields.length > 0 ? fieldConfig : {},
              status: 'pending',
              createdAt: serverTimestamp(),
          });
        }
        
        await firestoreBatch.commit();

        toast({
          title: "¡Solicitud en Cola!",
          description: `Se han creado ${numBatches} lote(s) para enviar ${totalRecipients} correos. Se procesarán en segundo plano.`,
        });
        setSelectedMemberIds(new Set());
        setIsPreviewModalOpen(false);

      } catch (error) {
        console.error("Error creating email batch:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la tarea de envío." });
      } finally {
        setSending(false);
      }
    }
    
    const recipientCount = selectedMemberIds.size > 0 ? selectedMemberIds.size : filteredMembers.length;
    const isAllFilteredSelected = filteredMembers.length > 0 && selectedMemberIds.size === filteredMembers.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Solicitar Actualización de Datos</CardTitle>
                <CardDescription>
                    Selecciona uno o más miembros y envíales un enlace seguro para que actualicen su información.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <Label>Filtrar por tipo</Label>
                         <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    {selectedTypes.size > 0 ? `${selectedTypes.size} tipo(s) seleccionado(s)` : "Seleccionar tipo..."}
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                                <Command>
                                    <CommandInput placeholder="Buscar tipo..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el tipo.</CommandEmpty>
                                        <CommandGroup>
                                            {MEMBER_TYPES.map(type => (
                                                <CommandItem
                                                    key={type.value}
                                                    onSelect={() => {
                                                        const newSelection = new Set(selectedTypes);
                                                        if (newSelection.has(type.value)) {
                                                            newSelection.delete(type.value);
                                                        } else {
                                                            newSelection.add(type.value);
                                                        }
                                                        setSelectedTypes(newSelection);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedTypes.has(type.value) ? "opacity-100" : "opacity-0")} />
                                                    {type.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label>Filtrar por equipo</Label>
                        <Popover open={isTeamPopoverOpen} onOpenChange={setIsTeamPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    {selectedTeams.size > 0 ? `${selectedTeams.size} equipo(s) seleccionado(s)` : "Seleccionar equipo..."}
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                             <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                                <Command>
                                    <CommandInput placeholder="Buscar equipo..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el equipo.</CommandEmpty>
                                        <CommandGroup>
                                            {teams.map(team => (
                                                <CommandItem
                                                    key={team.id}
                                                    onSelect={() => {
                                                        const newSelection = new Set(selectedTeams);
                                                        if (newSelection.has(team.id)) {
                                                            newSelection.delete(team.id);
                                                        } else {
                                                            newSelection.add(team.id);
                                                        }
                                                        setSelectedTeams(newSelection);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedTeams.has(team.id) ? "opacity-100" : "opacity-0")} />
                                                    {team.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Destinatarios</Label>
                     <Dialog open={isMemberSelectOpen} onOpenChange={setIsMemberSelectOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline" className="w-full md:w-[400px] justify-between">
                                {selectedMemberIds.size > 0 ? `${selectedMemberIds.size} miembro(s) seleccionado(s)` : filteredMembers.length > 0 ? `${filteredMembers.length} miembros en filtro` : "Seleccionar miembros..."}
                                <UserPlus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                             <DialogHeader>
                                <DialogTitle>Seleccionar Destinatarios</DialogTitle>
                                <DialogDescription>
                                    Elige los miembros a los que enviar la solicitud de actualización.
                                </DialogDescription>
                            </DialogHeader>
                            <Command>
                                <CommandInput placeholder="Buscar miembro..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró ningún miembro.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => handleSelectAllFiltered(!isAllFilteredSelected)} className="flex items-center space-x-2 font-semibold cursor-pointer">
                                            <Checkbox
                                                id="select-all"
                                                checked={isAllFilteredSelected}
                                                onCheckedChange={(checked) => handleSelectAllFiltered(checked as boolean)}
                                            />
                                            <label htmlFor="select-all" className="flex-1 cursor-pointer">Seleccionar todos los {filteredMembers.length} miembros</label>
                                        </CommandItem>
                                        <ScrollArea className="h-64">
                                            {filteredMembers.map((member) => (
                                                <CommandItem
                                                    key={member.id}
                                                    value={member.name}
                                                    onSelect={() => handleSelectMember(member.id)}
                                                    className="flex items-center space-x-2 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        id={`select-${member.id}`}
                                                        checked={selectedMemberIds.has(member.id)}
                                                        onCheckedChange={() => handleSelectMember(member.id)}
                                                    />
                                                    <label
                                                        htmlFor={`select-${member.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                                    >
                                                    {member.name} <span className="text-xs text-muted-foreground">({member.type})</span>
                                                    </label>
                                                </CommandItem>
                                            ))}
                                        </ScrollArea>
                                    </CommandGroup>
                                </CommandList>
                            </Command>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button>Aceptar</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {availableFields.length > 0 && uniqueType ? (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                           <Settings className="h-5 w-5 text-primary" />
                           <h3 className="text-lg font-semibold">Configurar Campos del Formulario ({uniqueType})</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Define qué campos podrán ver o editar los destinatarios. Estos ajustes se aplicarán a todos los miembros de esta solicitud.</p>
                         <ScrollArea className="h-72">
                            <div className="space-y-4 pr-4">
                                {availableFields.map(field => (
                                    <div key={field.id} className="grid grid-cols-[1fr_250px] items-center gap-4 p-3 rounded-lg border">
                                        <Label htmlFor={`config-${field.id}`} className="font-medium">{field.label}</Label>
                                        <RadioGroup
                                            id={`config-${field.id}`}
                                            value={fieldConfig[field.id]}
                                            onValueChange={(value) => handleFieldConfigChange(field.id, value as FieldConfigState)}
                                            className="flex items-center"
                                        >
                                            <div className="flex items-center space-x-1">
                                                <RadioGroupItem value="editable" id={`editable-${field.id}`} />
                                                <Label htmlFor={`editable-${field.id}`} className="text-xs font-normal flex items-center gap-1"><Edit className="h-3 w-3"/> Editable</Label>
                                            </div>
                                             <div className="flex items-center space-x-1">
                                                <RadioGroupItem value="locked" id={`locked-${field.id}`} />
                                                <Label htmlFor={`locked-${field.id}`} className="text-xs font-normal flex items-center gap-1"><Lock className="h-3 w-3"/> Bloqueado</Label>
                                            </div>
                                             <div className="flex items-center space-x-1">
                                                <RadioGroupItem value="hidden" id={`hidden-${field.id}`} />
                                                <Label htmlFor={`hidden-${field.id}`} className="text-xs font-normal flex items-center gap-1"><Eye className="h-3 w-3"/> Oculto</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    (selectedMemberIds.size > 0 || filteredMembers.length > 0) && !uniqueType && (
                        <div className="pt-4 border-t text-sm text-muted-foreground">
                            Has seleccionado miembros de diferentes tipos. Para configurar campos específicos, por favor, filtra por un único tipo de miembro (p.ej., solo 'Jugadores').
                        </div>
                    )
                )}
                 
            </CardContent>
             <CardFooter className="border-t pt-6">
                <Button className="w-full mt-6 gap-2" onClick={handleGeneratePreview} disabled={recipientCount === 0 || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Wand2 className="h-4 w-4 mr-2"/>}
                    {sending ? "Enviando..." : `Configurar y Generar Email para ${recipientCount} Miembro(s)`}
                </Button>
            </CardFooter>

            <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Previsualización del Email</DialogTitle>
                        <DialogDescription>
                            Así es como verán el correo tus miembros. Revisa que todo esté correcto antes de enviar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <Label htmlFor="preview-subject">Asunto</Label>
                            <Input id="preview-subject" readOnly value={emailPreview.subject} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="preview-body">Cuerpo del Mensaje</Label>
                            <Textarea id="preview-body" readOnly value={emailPreview.body} className="h-48 bg-muted/50" />
                            <p className="text-xs text-muted-foreground">La etiqueta [Nombre del Miembro] se reemplazará automáticamente.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                        <Button onClick={handleSend} disabled={sending}>
                           {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                           {sending ? 'Enviando...' : `Enviar a ${recipientCount} Miembro(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
