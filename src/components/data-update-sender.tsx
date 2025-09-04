
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query } from "firebase/firestore";
import type { Player, Coach, ClubMember, Team, CustomFieldDef } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { UserCheck, Loader2, User, Contact, Shield, CircleDollarSign, Briefcase, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { requestDataUpdateAction } from "@/lib/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "./ui/badge";

const memberFields = {
    player: {
        personal: [
            { id: "name", label: "Nombre" },
            { id: "lastName", label: "Apellidos" },
            { id: "birthDate", label: "Fecha de Nacimiento" },
            { id: "dni", label: "NIF" },
            { id: "sex", label: "Sexo" },
            { id: "nationality", label: "Nacionalidad" },
            { id: "healthCardNumber", label: "Nº Tarjeta Sanitaria" },
            { id: "address", label: "Dirección" },
            { id: "city", label: "Ciudad" },
            { id: "postalCode", label: "Código Postal" },
            { id: "startDate", label: "Fecha de Alta" },
            { id: "endDate", label: "Fecha de Baja" },
        ],
        contact: [
            { id: "isOwnTutor", label: "Es su propio tutor/a" },
            { id: "tutorName", label: "Nombre del Tutor/a" },
            { id: "tutorLastName", label: "Apellidos del Tutor/a" },
            { id: "tutorDni", label: "NIF del Tutor/a" },
            { id: "tutorEmail", label: "Email de Contacto" },
            { id: "tutorPhone", label: "Teléfono de Contacto" },
            { id: "iban", label: "IBAN" },
        ],
        sports: [
            { id: "jerseyNumber", label: "Dorsal" },
            { id: "monthlyFee", label: "Cuota Mensual (€)" },
            { id: "kitSize", label: "Talla de Equipación" },
            { id: "medicalCheckCompleted", label: "Revisión médica completada" },
        ]
    },
    coach: {
        personal: [
            { id: "name", label: "Nombre" },
            { id: "lastName", label: "Apellidos" },
            { id: "birthDate", label: "Fecha de Nacimiento" },
            { id: "dni", label: "NIF" },
            { id: "sex", label: "Sexo" },
            { id: "nationality", label: "Nacionalidad" },
            { id: "healthCardNumber", label: "Nº Tarjeta Sanitaria" },
            { id: "address", label: "Dirección" },
            { id: "city", label: "Ciudad" },
            { id: "postalCode", label: "Código Postal" },
            { id: "startDate", label: "Fecha de Alta" },
            { id: "endDate", label: "Fecha de Baja" },
        ],
        contact: [
            { id: "isOwnTutor", label: "Es su propio tutor/a" },
            { id: "tutorName", label: "Nombre del Tutor/a" },
            { id: "tutorLastName", label: "Apellidos del Tutor/a" },
            { id: "tutorDni", label: "NIF del Tutor/a" },
            { id: "email", label: "Email de Contacto" },
            { id: "phone", label: "Teléfono de Contacto" },
        ],
        payment: [
            { id: "role", label: "Cargo" },
            { id: "teamId", label: "Equipo Asignado" },
            { id: "iban", label: "IBAN" },
            { id: "monthlyPayment", label: "Pago Mensual (€)" },
            { id: "kitSize", label: "Talla de Equipación" },
        ]
    }
}

export function DataUpdateSender() {
    const [clubId, setClubId] = useState<string | null>(null);
    const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
    const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    
    const [memberType, setMemberType] = useState<'player' | 'coach'>('player');
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

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
             const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                setCustomFieldDefs(settingsSnap.data().customFields || []);
            }

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
            
            setAllMembers(members);

        } catch (error) {
            console.error("Error fetching club members:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los destinatarios."});
        } finally {
            setLoading(false);
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
         if (isSelected) {
            setSelectedMemberIds(prev => [...prev, memberId]);
        } else {
            setSelectedMemberIds(prev => prev.filter(id => id !== memberId));
        }
    };

    const handleSelectAllMembers = (checked: boolean) => {
        const membersOfType = allMembers.filter(m => (memberType === 'player' ? m.type === 'Jugador' : m.type === 'Entrenador'));
        if (checked) {
            setSelectedMemberIds(membersOfType.map(m => m.id));
        } else {
            setSelectedMemberIds([]);
        }
    };

    const handleSendRequest = async () => {
        if (!clubId) return;
        if (selectedMemberIds.length === 0) {
            toast({ variant: "destructive", title: "Error", description: "No has seleccionado ningún miembro." });
            return;
        }

        setSending(true);

        const membersToSend = allMembers.filter(m => selectedMemberIds.includes(m.id))
                                        .map(m => ({ id: m.id, name: m.name, email: m.email || '' }));

        const result = await requestDataUpdateAction({
            clubId,
            members: membersToSend,
            memberType,
            fields: selectedFields
        });

        if (result.success) {
            toast({
                title: "Solicitudes Enviadas",
                description: `Se han enviado ${result.count} correos para la actualización de datos.`
            });
            setIsMembersModalOpen(false); // Close the final modal
        } else {
            toast({ variant: "destructive", title: "Error al Enviar", description: result.error });
        }
        
        setSending(false);
    };

    const currentFields = memberType === 'player' ? memberFields.player : memberFields.coach;
    const currentMembers = allMembers.filter(m => (memberType === 'player' ? m.type === 'Jugador' : m.type === 'Entrenador'));
    const currentCustomFields = customFieldDefs.filter(f => f.appliesTo.includes(memberType));

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Solicitar Actualización de Datos</CardTitle>
                    <CardDescription>
                        Envía un enlace seguro a tus miembros para que actualicen su información personal, de contacto o deportiva.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                      <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="mb-4 text-muted-foreground">Inicia el proceso para enviar solicitudes de actualización de datos a tus miembros.</p>
                      <Button onClick={() => setIsFieldsModalOpen(true)} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UserCheck className="h-4 w-4 mr-2"/>}
                        Iniciar Solicitud de Actualización
                      </Button>
                   </div>
                </CardContent>
            </Card>

            {/* Field Selection Modal */}
            <Dialog open={isFieldsModalOpen} onOpenChange={setIsFieldsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Paso 1: Selecciona los campos a actualizar</DialogTitle>
                        <DialogDescription>Elige qué tipo de miembro y qué información quieres que actualicen.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Tipo de Miembro</Label>
                        <Tabs value={memberType} onValueChange={(val) => { setMemberType(val as any); setSelectedFields([]); }} className="w-full mt-2">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="player">Jugadores</TabsTrigger>
                                <TabsTrigger value="coach">Entrenadores</TabsTrigger>
                            </TabsList>
                            <TabsContent value="player" className="mt-4">
                               <FieldSelector fields={currentFields} customFields={currentCustomFields} selectedFields={selectedFields} onFieldSelect={handleFieldSelection} />
                            </TabsContent>
                             <TabsContent value="coach" className="mt-4">
                               <FieldSelector fields={currentFields} customFields={currentCustomFields} selectedFields={selectedFields} onFieldSelect={handleFieldSelection} />
                            </TabsContent>
                        </Tabs>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                        <Button onClick={() => { setIsFieldsModalOpen(false); setIsMembersModalOpen(true); }} disabled={selectedFields.length === 0}>
                            Siguiente: Seleccionar Miembros
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Member Selection Modal */}
            <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Paso 2: Selecciona los destinatarios</DialogTitle>
                        <DialogDescription>
                           Elige los {memberType === 'player' ? 'jugadores' : 'entrenadores'} que recibirán la solicitud.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4">
                         <div className="flex items-center p-2 border rounded-md">
                            <Checkbox 
                                id="select-all-members" 
                                onCheckedChange={(checked) => handleSelectAllMembers(checked as boolean)}
                                checked={currentMembers.length > 0 && selectedMemberIds.length === currentMembers.length}
                            />
                            <Label htmlFor="select-all-members" className="ml-2 font-medium">Seleccionar todos ({currentMembers.length})</Label>
                         </div>
                        <ScrollArea className="h-72 mt-4">
                           <div className="space-y-2">
                            {currentMembers.map(member => (
                                <div key={member.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                    <Checkbox
                                        id={`member-${member.id}`}
                                        checked={selectedMemberIds.includes(member.id)}
                                        onCheckedChange={(checked) => handleMemberSelection(member.id, checked as boolean)}
                                    />
                                    <Label htmlFor={`member-${member.id}`} className="flex-1">
                                        {member.name}
                                        {!member.email && <Badge variant="destructive" className="ml-2">Sin Email</Badge>}
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
                        <Button onClick={handleSendRequest} disabled={sending || selectedMemberIds.length === 0}>
                           {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                           {sending ? 'Enviando...' : `Enviar a ${selectedMemberIds.length} Miembro(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function FieldSelector({ fields, customFields, selectedFields, onFieldSelect }: { fields: any, customFields: CustomFieldDef[], selectedFields: string[], onFieldSelect: (id: string, selected: boolean) => void }) {
    return (
        <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal"><User className="mr-2 h-4 w-4"/>Personales</TabsTrigger>
                <TabsTrigger value="contact"><Contact className="mr-2 h-4 w-4"/>Contacto</TabsTrigger>
                <TabsTrigger value="sports"><Shield className="mr-2 h-4 w-4"/>Deportivos / Rol</TabsTrigger>
                <TabsTrigger value="custom"><FileText className="mr-2 h-4 w-4" />Personalizados</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-64 mt-4">
                <TabsContent value="personal" className="pr-4">
                    {fields.personal.map((field: any) => (
                        <FieldCheckbox key={field.id} field={field} selectedFields={selectedFields} onFieldSelect={onFieldSelect}/>
                    ))}
                </TabsContent>
                <TabsContent value="contact" className="pr-4">
                     {fields.contact.map((field: any) => (
                        <FieldCheckbox key={field.id} field={field} selectedFields={selectedFields} onFieldSelect={onFieldSelect}/>
                    ))}
                </TabsContent>
                <TabsContent value="sports" className="pr-4">
                     {(fields.sports || fields.payment).map((field: any) => (
                        <FieldCheckbox key={field.id} field={field} selectedFields={selectedFields} onFieldSelect={onFieldSelect}/>
                    ))}
                </TabsContent>
                 <TabsContent value="custom" className="pr-4">
                     {customFields.length > 0 ? customFields.map((field: any) => (
                        <FieldCheckbox key={field.id} field={field} selectedFields={selectedFields} onFieldSelect={onFieldSelect}/>
                    )) : (
                        <p className="text-center text-sm text-muted-foreground pt-10">No hay campos personalizados para este tipo de miembro.</p>
                    )}
                </TabsContent>
            </ScrollArea>
        </Tabs>
    );
}

function FieldCheckbox({ field, selectedFields, onFieldSelect }: { field: { id: string, label: string }, selectedFields: string[], onFieldSelect: (id: string, selected: boolean) => void}) {
    return (
         <div className="flex items-center space-x-2 p-2 border-b">
            <Checkbox
                id={field.id}
                checked={selectedFields.includes(field.id)}
                onCheckedChange={(checked) => onFieldSelect(field.id, checked as boolean)}
            />
            <Label htmlFor={field.id} className="font-normal flex-1">{field.label}</Label>
        </div>
    )
}
