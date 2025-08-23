

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Contact, Shield, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { Player, Coach, Staff } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';


type MemberData = Partial<Player & Coach & Staff>;

export default function AccountPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberCollection, setMemberCollection] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<MemberData>({});
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const clubId = userData.clubId;
            let collection = '';
            let id = '';

            if (userData.playerId) {
              collection = 'players';
              id = userData.playerId;
            } else if (userData.coachId) {
              collection = 'coaches';
              id = userData.coachId;
            } else if (userData.staffId) {
              collection = 'staff';
              id = userData.staffId;
            }
            
            if (collection && id && clubId) {
              setMemberCollection(collection);
              setMemberId(id);
              const memberDocRef = doc(db, "clubs", clubId, collection, id);
              const memberDocSnap = await getDoc(memberDocRef);
              if(memberDocSnap.exists()) {
                setMemberData(memberDocSnap.data());
              }
            }
          }
        } catch (error) {
           toast({ variant: "destructive", title: "Error", description: "No se pudo cargar tu perfil." });
        } finally {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [toast]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setMemberData(prev => ({ ...prev, [id]: type === 'number' ? (value === '' ? null : Number(value)) : value }));
  };
  
  const handleCheckboxChange = (id: keyof MemberData, checked: boolean) => {
    setMemberData(prev => ({ ...prev, [id]: checked }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        setMemberData(prev => ({ ...prev, birthDate: format(utcDate, "yyyy-MM-dd") }));
    }
  };

  const handleSaveChanges = async () => {
    if (!memberCollection || !memberId || !auth.currentUser) return;
    setSaving(true);
    
    try {
        const rootUserDocRef = doc(db, "users", auth.currentUser.uid);
        const rootUserDocSnap = await getDoc(rootUserDocRef);
        const clubId = rootUserDocSnap.data()?.clubId;

        if(!clubId) throw new Error("Club ID no encontrado");

        const memberDocRef = doc(db, "clubs", clubId, memberCollection, memberId);
        await updateDoc(memberDocRef, memberData);
        
        toast({ title: "¡Guardado!", description: "Tu información de perfil ha sido actualizada." });
    } catch(e) {
        console.error("Error saving profile data: ", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios."});
    } finally {
        setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!memberData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Perfil no encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No pudimos encontrar tu perfil de miembro asociado. Por favor, contacta con el administrador de tu club.</p>
        </CardContent>
      </Card>
    );
  }

  const role = memberCollection?.slice(0, -1); // 'player', 'coach', 'staff'
  const isPlayer = role === 'player';
  const isCoach = role === 'coach';
  
  const birthDate = memberData.birthDate ? new Date(memberData.birthDate + 'T00:00:00Z') : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          Mi Perfil
        </h1>
        <p className="text-muted-foreground">
          Revisa y actualiza tu información personal.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tu Información</CardTitle>
          <CardDescription>
            Los campos marcados con un candado no pueden ser modificados. Contacta con tu club si necesitas cambiarlos.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal"><User className="mr-2 h-4 w-4"/>Datos Personales</TabsTrigger>
                <TabsTrigger value="contact"><Contact className="mr-2 h-4 w-4"/>Contacto</TabsTrigger>
                <TabsTrigger value="sports"><Shield className="mr-2 h-4 w-4"/>Datos Deportivos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="pt-6">
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label htmlFor="name">Nombre</Label><Input id="name" value={memberData.name || ''} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label htmlFor="lastName">Apellidos</Label><Input id="lastName" value={memberData.lastName || ''} onChange={handleInputChange} /></div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Fecha de Nacimiento</Label><DatePicker date={birthDate} onDateChange={handleDateChange} /></div>
                        <div className="space-y-2"><Label htmlFor="dni">NIF</Label><Input id="dni" value={memberData.dni || ''} onChange={handleInputChange} /></div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label htmlFor="address">Dirección</Label><Input id="address" value={memberData.address || ''} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label htmlFor="city">Ciudad</Label><Input id="city" value={memberData.city || ''} onChange={handleInputChange} /></div>
                     </div>
                     <div className="space-y-2"><Label htmlFor="postalCode">Código Postal</Label><Input id="postalCode" value={memberData.postalCode || ''} onChange={handleInputChange} /></div>
                 </div>
              </TabsContent>

              <TabsContent value="contact" className="pt-6">
                 <div className="space-y-6">
                    <div className="flex items-center space-x-2"><Checkbox id="isOwnTutor" checked={memberData.isOwnTutor || false} onCheckedChange={(checked) => handleCheckboxChange('isOwnTutor', checked as boolean)}/><Label htmlFor="isOwnTutor">Soy mi propio tutor/a (mayor de edad)</Label></div>
                    {!(memberData.isOwnTutor) && (
                        <Card className="bg-muted/50"><CardHeader><CardTitle className="text-lg">Datos del Tutor/a</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2"><Label htmlFor="tutorName">Nombre del Tutor/a</Label><Input id="tutorName" value={memberData.tutorName || ''} onChange={handleInputChange}/></div>
                                    <div className="space-y-2"><Label htmlFor="tutorLastName">Apellidos del Tutor/a</Label><Input id="tutorLastName" value={memberData.tutorLastName || ''} onChange={handleInputChange}/></div>
                                </div>
                                <div className="space-y-2"><Label htmlFor="tutorDni">NIF del Tutor/a</Label><Input id="tutorDni" value={memberData.tutorDni || ''} onChange={handleInputChange}/></div>
                            </CardContent>
                        </Card>
                    )}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label htmlFor={isPlayer ? 'tutorEmail' : 'email'}>Email de Contacto</Label><Input id={isPlayer ? 'tutorEmail' : 'email'} type="email" value={(isPlayer ? memberData.tutorEmail : memberData.email) || ''} onChange={handleInputChange}/></div>
                        <div className="space-y-2"><Label htmlFor={isPlayer ? 'tutorPhone' : 'phone'}>Teléfono de Contacto</Label><Input id={isPlayer ? 'tutorPhone' : 'phone'} type="tel" value={(isPlayer ? memberData.tutorPhone : memberData.phone) || ''} onChange={handleInputChange}/></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="iban">IBAN (para cobro de cuotas)</Label><Input id="iban" value={memberData.iban || ''} onChange={handleInputChange}/></div>
                 </div>
              </TabsContent>

              <TabsContent value="sports" className="pt-6">
                 <div className="space-y-6">
                    {isPlayer && <div className="space-y-2"><Label htmlFor="jerseyNumber">Dorsal</Label><Input id="jerseyNumber" type="number" value={memberData.jerseyNumber || ''} onChange={handleInputChange} /></div>}
                    <div className="space-y-2"><Label htmlFor="kitSize">Talla de Equipación</Label><Input id="kitSize" value={memberData.kitSize || ''} onChange={handleInputChange} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="monthlyFee">{isPlayer ? "Cuota Mensual (€)" : "Pago Mensual (€)"}</Label>
                        <Input id={isPlayer ? "monthlyFee" : "monthlyPayment"} type="number" value={(isPlayer ? memberData.monthlyFee : memberData.monthlyPayment) ?? ''} onChange={handleInputChange} readOnly/>
                    </div>
                 </div>
              </TabsContent>
            </Tabs>
        </CardContent>
        <CardHeader>
           <Button onClick={handleSaveChanges} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                <Save className="mr-2 h-4 w-4"/> Guardar Cambios
           </Button>
        </CardHeader>
      </Card>
    </div>
  );
}

    