
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query } from "firebase/firestore";
import type { Player, Coach, Staff, ClubMember, Team } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Check, ChevronsUpDown, Send, UserPlus, Loader2, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { requestFilesAction } from "@/lib/actions";

const MEMBER_TYPES = [
    { value: 'Jugador', label: 'Jugadores' },
    { value: 'Entrenador', label: 'Entrenadores' },
    { value: 'Staff', label: 'Staff' }
];

export function FileRequestSender() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);

    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
    const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
    const [isTeamPopoverOpen, setIsTeamPopoverOpen] = useState(false);
    
    const [documentTitle, setDocumentTitle] = useState("");
    const [message, setMessage] = useState("");
    
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
             setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchAllData = async (clubId: string) => {
        setLoading(true);
        const members: ClubMember[] = [];
        try {
            const playersSnap = await getDocs(collection(db, "clubs", clubId, "players"));
            playersSnap.forEach(doc => {
                const data = doc.data() as Player;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Jugador', data, teamId: data.teamId, email: data.tutorEmail });
            });

            const coachesSnap = await getDocs(collection(db, "clubs", clubId, "coaches"));
            coachesSnap.forEach(doc => {
                const data = doc.data() as Coach;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Entrenador', data, teamId: data.teamId, email: data.email });
            });

            const staffSnap = await getDocs(collection(db, "clubs", clubId, "staff"));
            staffSnap.forEach(doc => {
                const data = doc.data() as Staff;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Staff', data, teamId: undefined, email: data.email });
            });
            
            setAllMembers(members);
            
            const teamsSnap = await getDocs(query(collection(db, "clubs", clubId, "teams")));
            setTeams(teamsSnap.docs.map(doc => ({id: doc.id, ...doc.data()} as Team)).sort((a, b) => (a.order || 0) - (b.order || 0)));

        } catch (error) {
            console.error("Error fetching club members:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los destinatarios."});
        } finally {
            setLoading(false);
        }
    };
    
     const filteredMembers = useMemo(() => {
        return allMembers.filter(member => {
            const typeMatch = selectedTypes.size > 0 ? selectedTypes.has(member.type) : true;
            const teamMatch = selectedTeams.size > 0 ? (member.teamId && selectedTeams.has(member.teamId)) : true;
            return typeMatch && teamMatch;
        });
    }, [allMembers, selectedTypes, selectedTeams]);

    const membersToSend = useMemo(() => {
        return allMembers.filter(m => selectedMemberIds.has(m.id));
    }, [selectedMemberIds, allMembers]);

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
    
    const handleSendRequest = async () => {
        if (!clubId) {
            toast({ variant: "destructive", title: "Error", description: "No se ha podido identificar el club." });
            return;
        }
        if (membersToSend.length === 0) {
            toast({ variant: "destructive", title: "Error", description: "Debes seleccionar al menos un destinatario." });
            return;
        }
        if (!documentTitle.trim()) {
            toast({ variant: "destructive", title: "Error", description: "El título del documento es obligatorio." });
            return;
        }

        setSending(true);

        const result = await requestFilesAction({
            clubId,
            members: membersToSend,
            documentTitle,
            message,
        });

        if (result.success) {
            toast({
                title: "¡Solicitudes enviadas!",
                description: `Se han enviado ${result.count} correos correctamente.`,
            });
            setDocumentTitle("");
            setMessage("");
            setSelectedMemberIds(new Set());
        } else {
            toast({
                variant: "destructive",
                title: "Error de Envío",
                description: result.error,
            });
        }
        
        setSending(false);
    }
    
    const recipientCount = selectedMemberIds.size;
    const isAllFilteredSelected = filteredMembers.length > 0 && recipientCount === filteredMembers.length;

    if (loading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Solicitar Archivos</CardTitle>
                <CardDescription>
                    Pide a los miembros del club que suban un documento específico a través de un enlace seguro por correo electrónico.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="doc-title">Título del Documento a Solicitar *</Label>
                    <Input name="doc-title" id="doc-title" placeholder="p.ej., Foto para la ficha, DNI escaneado" required value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="message">Mensaje Adicional (Opcional)</Label>
                    <Textarea name="message" id="message" placeholder="Añade aquí cualquier aclaración para el usuario..." value={message} onChange={(e) => setMessage(e.target.value)}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Filtrar destinatarios por tipo</Label>
                         <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal">
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
                    <div className="space-y-2">
                        <Label>Filtrar destinatarios por equipo</Label>
                        <Popover open={isTeamPopoverOpen} onOpenChange={setIsTeamPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal">
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
                             <Button variant="outline" className="w-full md:w-[400px] justify-between font-normal">
                                {selectedMemberIds.size > 0 ? `${selectedMemberIds.size} miembro(s) seleccionado(s)` : `Seleccionar de los ${filteredMembers.length} miembros filtrados...`}
                                <UserPlus className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                             <DialogHeader>
                                <DialogTitle>Seleccionar Destinatarios</DialogTitle>
                                <DialogDescription>
                                    Selecciona los miembros que recibirán esta solicitud.
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
                    <p className="text-xs text-muted-foreground">
                        La solicitud se enviará a <span className="font-semibold">{recipientCount}</span> destinatario(s).
                    </p>
                </div>
            </CardContent>
             <CardFooter className="border-t pt-6">
                <Button onClick={handleSendRequest} className="w-full md:w-auto ml-auto" disabled={recipientCount === 0 || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                    {sending ? "Enviando..." : `Enviar Solicitud a ${recipientCount} Miembro(s)`}
                </Button>
            </CardFooter>
        </Card>
    );
}
