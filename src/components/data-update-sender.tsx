
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { Player, Coach, Staff, ClubMember, Team } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Check, ChevronsUpDown, Eye, EyeOff, Pencil, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

type FieldPermission = "editable" | "readonly" | "hidden";
type FieldConfig = {
    [key: string]: { label: string; permission: FieldPermission };
};


export function DataUpdateSender() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);
    const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);
    
    const [filterType, setFilterType] = useState<string>('all');
    const [filterTeam, setFilterTeam] = useState<string>('all');

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
            const playersSnap = await getDocs(collection(db, "clubs", clubId, "players"));
            playersSnap.forEach(doc => {
                const data = doc.data() as Player;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Jugador', data });
            });

            const coachesSnap = await getDocs(collection(db, "clubs", clubId, "coaches"));
            coachesSnap.forEach(doc => {
                const data = doc.data() as Coach;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Entrenador', data });
            });

            const staffSnap = await getDocs(collection(db, "clubs", clubId, "staff"));
            staffSnap.forEach(doc => {
                const data = doc.data() as Staff;
                members.push({ id: doc.id, name: `${data.name} ${data.lastName}`, type: 'Staff', data });
            });
            
            setAllMembers(members);
            
            const teamsSnap = await getDocs(collection(db, "clubs", clubId, "teams"));
            setTeams(teamsSnap.docs.map(doc => ({id: doc.id, ...doc.data()} as Team)));

        } catch (error) {
            console.error("Error fetching club members:", error);
        }
    };
    
    const filteredMembers = useMemo(() => {
        return allMembers.filter(member => {
            const typeMatch = filterType === 'all' || member.type === filterType;
            const teamMatch = filterTeam === 'all' || (member.data as Player | Coach).teamId === filterTeam;

            if (filterType === 'Staff') {
                return typeMatch;
            }

            return typeMatch && teamMatch;
        });
    }, [allMembers, filterType, filterTeam]);
    
    const initializeFieldConfig = (member: ClubMember) => {
        const config: FieldConfig = {};
        const data = member.data;

        const fieldLabels: { [key: string]: string } = {
            avatar: "Foto de Perfil",
            name: "Nombre",
            lastName: "Apellidos",
            birthDate: "Fecha de Nacimiento",
            dni: "DNI",
            address: "Dirección",
            city: "Ciudad",
            postalCode: "Código Postal",
            email: "Email (Entrenador/Staff)",
            phone: "Teléfono (Entrenador/Staff)",
            kitSize: "Talla de Equipación",
            iban: "IBAN",
            monthlyPayment: "Pago Mensual (€)",
            tutorName: "Nombre del Tutor",
            tutorLastName: "Apellidos del Tutor",
            tutorDni: "DNI del Tutor",
            tutorEmail: "Email del Tutor",
            tutorPhone: "Teléfono del Tutor",
            jerseyNumber: "Dorsal",
        };

        Object.keys(data).forEach(key => {
            if (fieldLabels[key]) {
                config[key] = { label: fieldLabels[key], permission: 'editable' };
            }
        });
        
        setFieldConfig(config);
    };

    const handleSelectMember = (memberId: string) => {
        const member = allMembers.find(m => m.id === memberId);
        if (member) {
            setSelectedMember(member);
            initializeFieldConfig(member);
        }
        setIsMemberSelectOpen(false);
    };

    const setFieldPermission = (fieldKey: string, permission: FieldPermission) => {
        setFieldConfig(prev => ({
            ...prev,
            [fieldKey]: { ...prev[fieldKey], permission },
        }));
    };
    
    const handleSend = () => {
      toast({
        title: "Funcionalidad en desarrollo",
        description: "El envío del formulario de actualización aún no está implementado."
      });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Solicitar Actualización de Datos</CardTitle>
                <CardDescription>
                    Selecciona un miembro del club, elige qué campos puede actualizar y envíale un enlace seguro para que complete su información.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <Label>Filtrar por tipo</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tipo de miembro" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                <SelectItem value="Jugador">Jugadores</SelectItem>
                                <SelectItem value="Entrenador">Entrenadores</SelectItem>
                                <SelectItem value="Staff">Staff</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex-1 space-y-2">
                        <Label>Filtrar por equipo</Label>
                        <Select value={filterTeam} onValueChange={setFilterTeam} disabled={filterType === 'Staff'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Equipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los equipos</SelectItem>
                                {teams.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 </div>

                <div className="space-y-2">
                    <Label>Selecciona un Miembro</Label>
                    <Popover open={isMemberSelectOpen} onOpenChange={setIsMemberSelectOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full md:w-[400px] justify-between">
                                {selectedMember ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={(selectedMember.data as any).avatar} />
                                                <AvatarFallback>{selectedMember.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            {selectedMember.name} ({selectedMember.type})
                                        </div>
                                    </>
                                ) : "Buscar miembro del club..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar por nombre..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró ningún miembro con esos filtros.</CommandEmpty>
                                    <CommandGroup>
                                        {filteredMembers.map((member) => (
                                            <CommandItem
                                                key={member.id}
                                                value={member.name}
                                                onSelect={() => handleSelectMember(member.id)}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedMember?.id === member.id ? "opacity-100" : "opacity-0")} />
                                                {member.name} ({member.type})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                
                {selectedMember && (
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-medium mb-4">Configurar Campos del Formulario</h3>
                        <div className="space-y-3">
                           {Object.entries(fieldConfig).map(([key, { label, permission }]) => (
                                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                                    <span className="font-medium text-sm">{label}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="gap-2">
                                                {permission === 'editable' && <><Pencil className="h-3.5 w-3.5" /><span>Editable</span></>}
                                                {permission === 'readonly' && <><Eye className="h-3.5 w-3.5" /><span>Solo Lectura</span></>}
                                                {permission === 'hidden' && <><EyeOff className="h-3.5 w-3.5" /><span>Oculto</span></>}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => setFieldPermission(key, 'editable')}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editable
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setFieldPermission(key, 'readonly')}>
                                                <Eye className="mr-2 h-4 w-4" /> Solo Lectura
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onSelect={() => setFieldPermission(key, 'hidden')}>
                                                <EyeOff className="mr-2 h-4 w-4" /> Oculto
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                           ))}
                        </div>
                        <Button className="w-full mt-6 gap-2" onClick={handleSend}>
                            <Send className="h-4 w-4"/>
                            Generar y Enviar Enlace de Actualización
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
