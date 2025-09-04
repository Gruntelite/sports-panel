
"use client";

import * as React from "react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { Player, Coach, Staff, CustomFieldDef } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// Base schema for common fields, all optional for dynamic validation
const profileSchemaBase = {
  name: z.string().optional(),
  lastName: z.string().optional(),
  dni: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  tutorPhone: z.string().optional(),
  phone: z.string().optional(),
  iban: z.string().optional(),
  sex: z.string().optional(),
  birthDate: z.any().optional(),
  nationality: z.string().optional(),
  healthCardNumber: z.string().optional(),
  startDate: z.any().optional(),
  endDate: z.any().optional(),
  tutorName: z.string().optional(),
  tutorLastName: z.string().optional(),
  tutorDni: z.string().optional(),
  tutorEmail: z.string().email().optional(),
  email: z.string().email().optional(),
  jerseyNumber: z.preprocess((val) => Number(val), z.number()).optional(),
  monthlyFee: z.preprocess((val) => Number(val), z.number()).optional(),
  kitSize: z.string().optional(),
  monthlyPayment: z.preprocess((val) => Number(val), z.number()).optional(),
  role: z.string().optional(),
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
    const [clubInfo, setClubInfo] = useState<{name: string, logoUrl: string | null} | null>(null);
    const [collectionName, setCollectionName] = useState<string | null>(null);
    const [editableFields, setEditableFields] = useState<string[]>([]);
    const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
    
    const dynamicSchema = z.object(
        Object.fromEntries(
            (fieldsParam ? fieldsParam.split(',') : [])
            .map(field => {
                const baseSchema = profileSchemaBase[field as keyof typeof profileSchemaBase];
                if (baseSchema) {
                    if ((baseSchema instanceof z.ZodString || baseSchema instanceof z.ZodNumber) && baseSchema.safeParse('').success === false) {
                         return [field, baseSchema.min(1, { message: "Este campo es obligatorio." })];
                    }
                    if (baseSchema instanceof z.ZodAny) { // For dates
                        return [field, z.any().refine(val => val, { message: "Este campo es obligatorio." })];
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
                // Fetch Club Info
                const clubDocRef = doc(db, "clubs", clubId);
                const clubDocSnap = await getDoc(clubDocRef);
                if (clubDocSnap.exists()) {
                    const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                    const settingsSnap = await getDoc(settingsRef);
                    const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
                    setClubInfo({
                        name: clubDocSnap.data().name || 'Club',
                        logoUrl: settingsData.logoUrl || null,
                    });
                     setCustomFieldDefs(settingsData.customFields || []);
                }

                // Fetch Member Info
                const memberRef = doc(db, "clubs", clubId, currentCollectionName, memberId);
                const memberSnap = await getDoc(memberRef);

                if (memberSnap.exists() && memberSnap.data().updateRequestActive) {
                    const data = memberSnap.data() as MemberData;
                    setMemberData(data);
                    
                    const defaultValues: any = {};
                    fields.forEach(field => {
                        const fieldValue = data.customFields?.[field] ?? data[field as keyof MemberData];
                        defaultValues[field] = fieldValue || "";
                    });
                    form.reset(defaultValues);
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
    }, [memberId, memberType, clubId, fieldsParam, form]);

    const onSubmit = async (data: z.infer<typeof dynamicSchema>) => {
        if (!clubId || !collectionName || !memberId) return;

        setSubmitting(true);
        try {
            const memberRef = doc(db, "clubs", clubId, collectionName, memberId);
            
            const dataToUpdate: any = {};
            const customFieldsToUpdate: Record<string, any> = memberData?.customFields || {};

            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith('custom_')) {
                    customFieldsToUpdate[key] = value;
                } else {
                    dataToUpdate[key] = value;
                }
            });

             ['birthDate', 'startDate', 'endDate'].forEach(dateField => {
                if (dataToUpdate[dateField]) {
                    dataToUpdate[dateField] = format(new Date(dataToUpdate[dateField]), "yyyy-MM-dd");
                }
            });
            
            dataToUpdate.customFields = customFieldsToUpdate;
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
    
    const renderField = (fieldName: string) => {
        if (!editableFields.includes(fieldName)) return null;

        let fieldConfig: { label: string; type?: string; options?: { value: string; label: string }[] };

        const standardFieldMap: { [key: string]: { label: string; type?: string, options?: {value: string, label: string}[] } } = {
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
          birthDate: { label: 'Fecha de Nacimiento', type: 'date' },
          startDate: { label: 'Fecha de Alta', type: 'date' },
          endDate: { label: 'Fecha de Baja', type: 'date' },
          kitSize: { label: 'Talla de Equipación' },
          nationality: { label: 'Nacionalidad' },
          healthCardNumber: { label: 'Nº Tarjeta Sanitaria'},
          tutorName: { label: 'Nombre del Tutor/a' },
          tutorLastName: { label: 'Apellidos del Tutor/a' },
          tutorDni: { label: 'DNI/NIF del Tutor/a' },
          monthlyFee: { label: 'Cuota Mensual', type: 'number' },
          monthlyPayment: { label: 'Pago Mensual', type: 'number' },
          role: { label: 'Cargo' },
          sex: { label: 'Sexo', type: 'select', options: [{value: 'masculino', label: 'Masculino'}, {value: 'femenino', label: 'Femenino'}] },
        };
        
        if (standardFieldMap[fieldName]) {
            fieldConfig = standardFieldMap[fieldName];
        } else {
            const customFieldDef = customFieldDefs.find(def => def.id === fieldName);
            fieldConfig = {
                label: customFieldDef?.name || fieldName,
                type: customFieldDef?.type || 'text'
            };
        }
        
        const { label, type, options } = fieldConfig;

        return (
             <div key={fieldName} className="space-y-2">
                <Controller
                    name={fieldName as any}
                    control={form.control}
                    render={({ field, fieldState }) => (
                         <FormItem>
                            <FormLabel htmlFor={fieldName}>{label} *</FormLabel>
                                {type === 'date' ? (
                                    <DatePicker
                                        date={field.value ? (typeof field.value === 'string' ? parseISO(field.value) : field.value) : undefined}
                                        onDateChange={field.onChange}
                                    />
                                ) : type === 'select' && options ? (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {options.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id={fieldName}
                                        type={type || 'text'}
                                        {...field}
                                    />
                                )}
                            {fieldState.error && <p className="text-sm font-medium text-destructive">{fieldState.error.message as string}</p>}
                        </FormItem>
                    )}
                />
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
                            {clubInfo?.logoUrl ? (
                               <Image src={clubInfo.logoUrl} alt={clubInfo.name} width={80} height={80} className="mx-auto rounded-md"/>
                            ) : (
                                <Logo />
                            )}
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
                <CardHeader className="text-center">
                   {clubInfo?.logoUrl ? (
                        <Image src={clubInfo.logoUrl} alt={clubInfo.name} width={80} height={80} className="mx-auto rounded-md"/>
                    ) : (
                        <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
                           <Logo />
                        </div>
                    )}
                    <h2 className="text-xl font-semibold pt-2">{clubInfo?.name}</h2>
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

const FormItem = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("space-y-2", className)} {...props} />
const FormLabel = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<typeof Label>>(({className, ...props}, ref) => <Label ref={ref} className={className} {...props} />)
FormLabel.displayName = 'FormLabel';
const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => <div ref={ref} className={className} {...props} />)
FormControl.displayName = 'FormControl';

    