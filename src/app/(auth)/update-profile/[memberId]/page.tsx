
"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import type { Player, Coach, Staff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";

// Base schema for common fields, all optional for dynamic validation
const profileSchemaBase = {
  name: z.string(),
  lastName: z.string(),
  dni: z.string(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),
  tutorPhone: z.string(),
  phone: z.string(),
  iban: z.string(),
  sex: z.string(),
  birthDate: z.string(),
  nationality: z.string(),
  healthCardNumber: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  tutorName: z.string(),
  tutorLastName: z.string(),
  tutorDni: z.string(),
  tutorEmail: z.string().email(),
  email: z.string().email(),
  jerseyNumber: z.preprocess((val) => Number(val), z.number()),
  monthlyFee: z.preprocess((val) => Number(val), z.number()),
  kitSize: z.string(),
  monthlyPayment: z.preprocess((val) => Number(val), z.number()),
  role: z.string(),
};

type MemberData = Partial<Player & Coach & Staff>;

export default function UpdateProfilePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const memberId = params.memberId as string;
    const memberType = searchParams.get('type');
    const clubId = searchParams.get('clubId');
    const fieldsParam = searchParams.get('fields');

    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [memberData, setMemberData] = useState<MemberData | null>(null);
    const [collectionName, setCollectionName] = useState<string | null>(null);
    const [editableFields, setEditableFields] = useState<string[]>([]);
    
    // Dynamically build the Zod schema based on the fields passed in the URL
    const dynamicSchema = z.object(
        Object.fromEntries(
            (fieldsParam ? fieldsParam.split(',') : [])
            .map(field => {
                const baseSchema = profileSchemaBase[field as keyof typeof profileSchemaBase];
                if (baseSchema) {
                    if (baseSchema instanceof z.ZodString) {
                         return [field, baseSchema.min(1, 'Este campo es obligatorio.')];
                    }
                    return [field, baseSchema];
                }
                return [field, z.any()];
            })
        )
    );

    const form = useForm<z.infer<typeof dynamicSchema>>({
      resolver: zodResolver(dynamicSchema),
    });

    useEffect(() => {
        if (!memberId || !memberType || !clubId || !fieldsParam) {
            setLoading(false);
            return;
        }

        const fields = fieldsParam.split(',');
        setEditableFields(fields);
        
        const currentCollectionName = memberType === 'player' ? 'players' : memberType === 'coach' ? 'coaches' : 'staff';
        setCollectionName(currentCollectionName);

        const fetchMemberData = async () => {
            try {
                const memberRef = doc(db, "clubs", clubId, currentCollectionName, memberId);
                const memberSnap = await getDoc(memberRef);

                if (memberSnap.exists() && memberSnap.data().updateRequestActive) {
                    const data = memberSnap.data() as MemberData;
                    setMemberData(data);
                    
                    const defaultValues: any = {};
                    fields.forEach(field => {
                        defaultValues[field] = data[field as keyof MemberData] || "";
                    });
                    form.reset(defaultValues);
                } else {
                    setMemberData(null); // Invalid link or request
                }
            } catch (error) {
                console.error("Error fetching member data:", error);
                setMemberData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMemberData();
    }, [memberId, memberType, clubId, fieldsParam, form]);

    const onSubmit = async (data: z.infer<typeof dynamicSchema>) => {
        if (!clubId || !collectionName || !memberId) return;

        setSubmitting(true);
        try {
            const memberRef = doc(db, "clubs", clubId, collectionName, memberId);
            
            const dataToUpdate: any = { ...data };
            dataToUpdate.updateRequestActive = false; // Deactivate the update request

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
    
    const renderField = (fieldName: string) => {
        if (!editableFields.includes(fieldName)) return null;
        
        let label = fieldName;
        let type = 'text';

        // You can create a map for labels and types to make it cleaner
        const fieldMap: { [key: string]: { label: string; type?: string } } = {
          name: { label: 'Nombre' },
          lastName: { label: 'Apellidos' },
          dni: { label: 'DNI/NIF' },
          address: { label: 'Dirección' },
          city: { label: 'Ciudad' },
          postalCode: { label: 'Código Postal' },
          tutorPhone: { label: 'Teléfono del Tutor/a', type: 'tel' },
          phone: { label: 'Teléfono', type: 'tel' },
          iban: { label: 'IBAN' },
          email: { label: 'Email', type: 'email' },
          tutorEmail: { label: 'Email del Tutor/a', type: 'email' },
          jerseyNumber: { label: 'Dorsal', type: 'number' },
          // Add all other fields
        };
        
        if (fieldMap[fieldName]) {
            label = fieldMap[fieldName].label;
            type = fieldMap[fieldName].type || 'text';
        }

        return (
            <div key={fieldName} className="space-y-2">
                <Label htmlFor={fieldName}>{label} *</Label>
                <Input id={fieldName} type={type} {...form.register(fieldName as any)} />
                {form.formState.errors[fieldName] && <p className="text-sm font-medium text-destructive">{form.formState.errors[fieldName]?.message as string}</p>}
            </div>
        )
    }

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
                    <CardTitle className="text-2xl">Actualización de Datos para {memberData.name} {memberData.lastName}</CardTitle>
                    <CardDescription>Por favor, revisa y corrige la información solicitada. Los campos marcados con * son obligatorios.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {editableFields.map(field => renderField(field))}
                        
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
