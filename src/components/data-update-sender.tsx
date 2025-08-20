
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { Player, Coach, Staff, ClubMember, Team } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Check, ChevronsUpDown, Eye, EyeOff, Pencil, Send, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Label } from "./ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";


type FieldPermission = "editable" | "readonly" | "hidden";

const COMMON_FIELDS: { key: keyof (Player & Coach & Staff); label: string }[] = [
    { key: "avatar", label: "Foto de Perfil" },
    { key: "name", label: "Nombre" },
    { key: "lastName", label: "Apellidos" },
    { key: "birthDate", label: "Fecha de Nacimiento" },
    { key: "dni", label: "DNI" },
    { key: "address", label: "Dirección" },
    { key: "city", label: "Ciudad" },
    { key: "postalCode", label: "Código Postal" },
    { key: "kitSize", label: "Talla de Equipación" },
    { key: "iban", label: "IBAN" },
];

const FIELD_CONFIG_PLAYER: { key: keyof Player; label: string }[] = [
    ...COMMON_FIELDS,
    { key: "tutorName", label: "Nombre del Tutor" },
    { key: "tutorLastName", label: "Apellidos del Tutor" },
    { key: "tutorDni", label: "DNI del Tutor" },
    { key: "tutorEmail", label: "Email del Tutor" },
    { key: "tutorPhone", label: "Teléfono del Tutor" },
    { key: "jerseyNumber", label: "Dorsal" },
    { key: "monthlyFee", label: "Cuota Mensual (€)" },
];

const FIELD_CONFIG_COACH: { key: keyof Coach; label: string }[] = [
    ...COMMON_FIELDS,
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    { key: "monthlyPayment", label: "Pago Mensual (€)" },
    { key: "tutorName", label: "Nombre del Tutor" },
    { key: "tutorLastName", label: "Apellidos del Tutor" },
    { key: "tutorDni", label: "DNI del Tutor" },
];

const FIELD_CONFIG_STAFF: { key: keyof Staff; label: string }[] = [
    { key: "avatar", label: "Foto de Perfil" },
    { key: "name", label: "Nombre" },
    { key: "lastName", label: "Apellidos" },
    { key: "role", label: "Cargo" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
];

type FieldConfig = {
    [key: string]: { label: string; permission: FieldPermission };
};


export function DataUpdateSender() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
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
    
    const initializeFieldConfig = (memberType: 'Jugador' | 'Entrenador' | 'Staff') => {
        const config: FieldConfig = {};
        let fields: { key: string; label: string }[] = [];

        switch (memberType) {
            case 'Jugador':
                fields = FIELD_CONFIG_PLAYER;
                break;
            case 'Entrenador':
                fields = FIELD_CONFIG_COACH;
                break;
            case 'Staff':
                fields = FIELD_CONFIG_STAFF;
                break;
        }

        fields.forEach(({ key, label }) => {
            config[key] = { label, permission: 'editable' };
        });

        setFieldConfig(config);
    };

    useEffect(() => {
        if (filterType !== 'all') {
            initializeFieldConfig(filterType as 'Jugador' | 'Entrenador' | 'Staff');
        } else {
            setFieldConfig({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType]);
    
    
    const handleSelectMember = (memberId: string) => {
        const newSelection = new Set(selectedMemberIds);
        if (newSelection.has(memberId)) {
            newSelection.delete(memberId);
        } else {
            newSelection.add(memberId);
        }
        setSelectedMemberIds(newSelection);
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
    
    const selectedCount = selectedMemberIds.size;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Solicitar Actualización de Datos</CardTitle>
                <CardDescription>
                    Selecciona uno o más miembros, elige qué campos pueden actualizar y envíales un enlace seguro.
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
                    <Label>Destinatarios</Label>
                     <Dialog open={isMemberSelectOpen} onOpenChange={setIsMemberSelectOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline" className="w-full md:w-[400px] justify-between">
                                {selectedCount > 0 ? `${selectedCount} miembro(s) seleccionado(s)` : "Seleccionar miembros..."}
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
                            <ScrollArea className="h-72">
                                <div className="space-y-2 pr-4">
                                {filteredMembers.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                                        <Checkbox
                                            id={`select-${member.id}`}
                                            checked={selectedMemberIds.has(member.id)}
                                            onCheckedChange={() => handleSelectMember(member.id)}
                                        />
                                        <label
                                            htmlFor={`select-${member.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                                        >
                                           {member.name} <span className="text-xs text-muted-foreground">({member.type})</span>
                                        </label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button>Aceptar</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                
                 {selectedCount > 0 && filterType !== 'all' && (
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-medium mb-4">Configurar Campos para <span className="capitalize text-primary">{filterType}s</span></h3>
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
                        <Button className="w-full mt-6 gap-2" onClick={handleSend} disabled={selectedCount === 0}>
                            <Send className="h-4 w-4"/>
                            Generar y Enviar Enlace(s) de Actualización
                        </Button>
                    </div>
                )}

                 {selectedCount > 0 && filterType === 'all' && (
                     <div className="border-t pt-6 text-center text-muted-foreground">
                         <p>Por favor, selecciona un tipo de miembro (Jugador, Entrenador o Staff) para configurar los campos del formulario.</p>
                     </div>
                 )}
            </CardContent>
        </Card>
    );
}
