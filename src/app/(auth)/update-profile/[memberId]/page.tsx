
"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, updateDoc, writeBatch } from "firebase/firestore";
import type { Player, Coach, Staff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";

const profileSchema = z.object({
  // Define a schema that can accommodate fields from all member types
  name: z.string().min(1, "El nombre es obligatorio."),
  lastName: z.string().min(1, "Los apellidos son obligatorios."),
  dni: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  tutorPhone: z.string().optional(),
  phone: z.string().optional(),
  iban: z.string().optional(),
  // Add other editable fields here
});

type FormData = z.infer<typeof profileSchema>;

export default function UpdateProfilePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const memberId = params.memberId as string;
    const memberType = searchParams.get('type');
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [memberData, setMemberData] = useState<Partial<Player & Coach & Staff> | null>(null);
    const [collectionName, setCollectionName] = useState<string | null>(null);
    const [clubId, setClubId] = useState<string | null>(null);
    
    const form = useForm<FormData>();

    useEffect(() => {
        if (!memberId || !memberType) {
            setLoading(false);
            return;
        }

        const fetchMemberData = async () => {
            let foundMember = null;
            let foundClubId = null;
            let foundCollection = null;

            try {
                 const clubsSnapshot = await getDocs(collection(db, "clubs"));
                 for (const clubDoc of clubsSnapshot.docs) {
                    const currentClubId = clubDoc.id;
                    const collectionName = memberType === 'player' ? 'players' : memberType === 'coach' ? 'coaches' : 'staff';
                    
                    const memberRef = doc(db, "clubs", currentClubId, collectionName, memberId);
                    const memberSnap = await getDoc(memberRef);

                    if (memberSnap.exists()) {
                        const data = memberSnap.data();
                        if (data.updateRequestActive) {
                            foundMember = data;
                            foundClubId = currentClubId;
                            foundCollection = collectionName;
                        }
                        break; 
                    }
                 }

                if (foundMember && foundClubId && foundCollection) {
                    setMemberData(foundMember);
                    setClubId(foundClubId);
                    setCollectionName(foundCollection);
                    form.reset({
                        name: foundMember.name,
                        lastName: foundMember.lastName,
                        dni: foundMember.dni,
                        address: foundMember.address,
                        city: foundMember.city,
                        postalCode: foundMember.postalCode,
                        tutorPhone: (foundMember as Player).tutorPhone,
                        phone: (foundMember as Coach | Staff).phone,
                        iban: foundMember.iban,
                    });
                } else {
                    setMemberData(null);
                }
            } catch (error) {
                console.error("Error fetching member data:", error);
                setMemberData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMemberData();
    }, [memberId, memberType, form]);

    const onSubmit = async (data: FormData) => {
        if (!clubId || !collectionName || !memberId) return;

        setSubmitting(true);
        try {
            const memberRef = doc(db, "clubs", clubId, collectionName, memberId);
            
            const dataToUpdate: any = { ...data };
            
            // Deactivate the update request
            dataToUpdate.updateRequestActive = false;

            await updateDoc(memberRef, dataToUpdate);

            setSubmitted(true);
            toast({
                title: "¡Datos Actualizados!",
                description: "Gracias por mantener tu información al día.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron guardar tus cambios. Por favor, contacta con el club.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!memberData) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Enlace no válido o caducado</CardTitle>
                        <CardDescription>Este enlace para actualizar datos no es válido o ya ha sido utilizado. Por favor, solicita un nuevo enlace a tu club.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    if (submitted) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                         <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
                            <Logo />
                        </div>
                        <CardTitle className="text-2xl">¡Datos Actualizados!</CardTitle>
                        <CardDescription>Gracias por mantener tu información al día. Ya puedes cerrar esta página.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Actualización de Datos</CardTitle>
                    <CardDescription>Por favor, revisa y corrige tu información. Los campos marcados con * son obligatorios.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" {...form.register("name")} />
                                {form.formState.errors.name && <p className="text-sm font-medium text-destructive">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Apellidos</Label>
                                <Input id="lastName" {...form.register("lastName")} />
                                {form.formState.errors.lastName && <p className="text-sm font-medium text-destructive">{form.formState.errors.lastName.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dni">DNI/NIF</Label>
                            <Input id="dni" {...form.register("dni")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input id="address" {...form.register("address")} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input id="city" {...form.register("city")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postalCode">Código Postal</Label>
                                <Input id="postalCode" {...form.register("postalCode")} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono de Contacto</Label>
                            <Input id="phone" type="tel" {...form.register(memberType === 'player' ? 'tutorPhone' : 'phone')} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="iban">IBAN (para cuotas/pagos)</Label>
                            <Input id="iban" {...form.register("iban")} />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
