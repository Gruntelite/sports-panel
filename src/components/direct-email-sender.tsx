
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { Player, Coach, Staff, ClubMember, Team } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Check, ChevronsUpDown, Send, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { sendDirectEmailAction } from "@/lib/actions";

const MEMBER_TYPES = [
    { value: 'Jugador', label: 'Jugadores' },
    { value: 'Entrenador', label: 'Entrenadores' },
    { value: 'Staff', label: 'Staff' }
];

export function DirectEmailSender() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    const [sending, setSending] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);

    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
    const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
    const [isTeamPopoverOpen, setIsTeamPopoverOpen] = useState(false);
    
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
            setTeams(teamsSnap.docs.map(d => ({id: d.id, ...d.data()} as Team)));

        } catch (error) {
            console.error("Error fetching club members:", error);
        }
    };
    
     const filteredMembers = useMemo(() => {
        if (selectedTypes.size === 0 && selectedTeams.size === 0) {
            return allMembers;
        }
        return allMembers.filter(member => {
            const typeMatch = selectedTypes.size > 0 ? selectedTypes.has(member.type) : true;
            const teamMatch = selectedTeams.size > 0 ? (member.teamId && selectedTeams.has(member.teamId)) : true;
            
            if (selectedTypes.size > 0 && selectedTeams.size > 0) {
                return typeMatch && teamMatch;
            }
            return typeMatch || teamMatch;
        });
    }, [allMembers, selectedTypes, selectedTeams]);

    const membersToProcess = useMemo(() => {
        return selectedMemberIds.size > 0
          ? allMembers.filter(m => selectedMemberIds.has(m.id))
          : filteredMembers;
      }, [selectedMemberIds, allMembers, filteredMembers]);
    
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
    
    const handleSend = async () => {
      if (!clubId || !subject || !body) {
         toast({ variant: "destructive", title: "Error", description: "El asunto y el cuerpo del mensaje son obligatorios." });
         return;
      }

      if (membersToProcess.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "No hay destinatarios seleccionados." });
        return;
      }
      
      setSending(true);

      const recipients = membersToProcess.map(member => {
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
        };
      }).filter(r => r.email);

      const result = await sendDirectEmailAction({
          clubId,
          recipients,
          subject,
          body
      });

      if (result.success) {
          toast({
              title: result.title,
              description: result.description,
          });
          setSelectedMemberIds(new Set());
          setSubject("");
          setBody("");
      } else {
          toast({
              variant: "destructive",
              title: "Error de Envío",
              description: result.error,
          });
      }

      setSending(false);
    }
    
    const recipientCount = membersToProcess.length;
    const isAllFilteredSelected = filteredMembers.length > 0 && selectedMemberIds.size === filteredMembers.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Envío de Correo Directo</CardTitle>
                <CardDescription>
                    Redacta un correo y envíalo a miembros o grupos específicos de tu club.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    Elige los miembros a los que enviar el correo.
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
                 <div className="space-y-2">
                    <Label htmlFor="subject">Asunto</Label>
                    <Input id="subject" placeholder="Asunto del correo" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="body">Cuerpo del Mensaje</Label>
                    <Textarea id="body" placeholder="Escribe aquí tu mensaje..." className="min-h-[200px]" value={body} onChange={(e) => setBody(e.target.value)} />
                </div>
                 
            </CardContent>
             <CardFooter className="border-t pt-6">
                <Button className="w-full mt-6 gap-2" onClick={handleSend} disabled={recipientCount === 0 || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                    {sending ? "Enviando..." : `Enviar correo a ${recipientCount} Miembro(s)`}
                </Button>
            </CardFooter>
        </Card>
    );
}
