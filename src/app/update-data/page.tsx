
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getMemberDataForUpdate, saveMemberDataFromUpdate } from "@/lib/actions";
import type { Player, Coach, Staff } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, User, Contact, ShieldCheck, Banknote } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO } from "date-fns";

type FieldConfig = Record<string, 'editable' | 'locked' | 'hidden'>;

const playerFields = [
  { id: 'name', label: 'Nombre', section: 'personal' }, { id: 'lastName', label: 'Apellidos', section: 'personal' }, { id: 'birthDate', label: 'Fecha de Nacimiento', section: 'personal' },
  { id: 'dni', label: 'DNI', section: 'personal' }, { id: 'address', label: 'Dirección', section: 'personal' }, { id: 'city', label: 'Ciudad', section: 'personal' }, { id: 'postalCode', label: 'Código Postal', section: 'personal' },
  { id: 'tutorEmail', label: 'Email de Contacto', section: 'contact' }, { id: 'tutorPhone', label: 'Teléfono de Contacto', section: 'contact' }, 
  { id: 'tutorName', label: 'Nombre Tutor/a', section: 'contact' }, { id: 'tutorLastName', label: 'Apellidos Tutor/a', section: 'contact' }, { id: 'tutorDni', label: 'DNI Tutor/a', section: 'contact' },
  { id: 'iban', label: 'IBAN', section: 'payment' }, { id: 'monthlyFee', label: 'Cuota Mensual (€)', section: 'payment' },
  { id: 'jerseyNumber', label: 'Dorsal', section: 'sports' }, { id: 'kitSize', label: 'Talla Equipación', section: 'sports' },
];
const coachFields = [
  { id: 'name', label: 'Nombre', section: 'personal' }, { id: 'lastName', label: 'Apellidos', section: 'personal' }, { id: 'birthDate', label: 'Fecha de Nacimiento', section: 'personal' },
  { id: 'dni', label: 'DNI', section: 'personal' }, { id: 'email', label: 'Email', section: 'contact' }, { id: 'phone', label: 'Teléfono', section: 'contact' },
  { id: 'address', label: 'Dirección', section: 'personal' }, { id: 'city', label: 'Ciudad', section: 'personal' }, { id: 'postalCode', label: 'Código Postal', section: 'personal' },
  { id: 'iban', label: 'IBAN', section: 'payment' }, { id: 'monthlyPayment', label: 'Pago Mensual (€)', section: 'payment' }, { id: 'kitSize', label: 'Talla Equipación', section: 'sports' },
  { id: 'tutorName', label: 'Nombre Tutor/a', section: 'contact' }, { id: 'tutorLastName', label: 'Apellidos Tutor/a', section: 'contact' }, { id: 'tutorDni', label: 'DNI Tutor/a', section: 'contact' },
];
const staffFields = [
    { id: 'name', label: 'Nombre', section: 'personal' }, { id: 'lastName', label: 'Apellidos', section: 'personal' },
    { id: 'role', label: 'Cargo', section: 'personal' }, { id: 'email', label: 'Email', section: 'contact' }, { id: 'phone', label: 'Teléfono', section: 'contact' },
];

const getFieldsForType = (type: string) => {
    switch (type) {
        case 'Jugador': return playerFields;
        case 'Entrenador': return coachFields;
        case 'Staff': return staffFields;
        default: return [];
    }
}

export default function UpdateDataPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [memberData, setMemberData] = useState<Partial<Player | Coach | Staff> | null>(null);
    const [memberType, setMemberType] = useState<string>("");
    const [fieldConfig, setFieldConfig] = useState<FieldConfig>({});
    const [clubName, setClubName] = useState<string>("");
    
    const methods = useForm();
    
    useEffect(() => {
        if (!token) {
            setError("No se ha proporcionado un token de acceso.");
            setLoading(false);
            return;
        }

        async function fetchData() {
            const result = await getMemberDataForUpdate({ token: token! });
            if (result.success && result.data) {
                setMemberData(result.data.memberData);
                setMemberType(result.data.memberType);
                setFieldConfig(result.data.fieldConfig);
                setClubName(result.data.clubName);
                methods.reset(result.data.memberData);
            } else {
                setError(result.error || "No se pudieron cargar los datos.");
            }
            setLoading(false);
        }
        fetchData();
    }, [token, methods]);

    const onSubmit = async (data: any) => {
        if (!token) return;
        setSaving(true);
        
        const result = await saveMemberDataFromUpdate({ token, updatedData: data });
        
        if(result.success) {
            setSuccess(true);
            toast({ title: "¡Datos Actualizados!", description: "Tu información ha sido guardada correctamente." });
        } else {
            toast({ variant: "destructive", title: "Error al Guardar", description: result.error });
        }
        setSaving(false);
    };
    
    const renderField = (fieldId: string, label: string) => {
        const config = fieldConfig[fieldId];
        if (config === 'hidden') return null;

        const isLocked = config === 'locked';
        const currentValue = methods.watch(fieldId);

        if (fieldId.toLowerCase().includes('date')) {
            return (
                <div key={fieldId} className="space-y-2">
                    <Label htmlFor={fieldId}>{label}</Label>
                    <DatePicker 
                        date={currentValue ? new Date(currentValue) : undefined}
                        onDateChange={(date) => {
                            if (!isLocked && date) {
                                methods.setValue(fieldId, format(date, 'yyyy-MM-dd'));
                            }
                        }}
                    />
                </div>
            )
        }
        
        return (
            <div key={fieldId} className="space-y-2">
                <Label htmlFor={fieldId}>{label}</Label>
                <Input 
                    id={fieldId} 
                    {...methods.register(fieldId)}
                    readOnly={isLocked}
                    className={isLocked ? 'bg-muted/50' : ''}
                />
            </div>
        )
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive text-center">Error</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p>{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
     if (success) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                          <ShieldCheck className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="mt-4">¡Información Guardada!</CardTitle>
                        <CardDescription>Gracias por mantener tus datos actualizados. Ya puedes cerrar esta ventana.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    const fields = getFieldsForType(memberType);
    const personalFields = fields.filter(f => f.section === 'personal' && fieldConfig[f.id] !== 'hidden');
    const contactFields = fields.filter(f => f.section === 'contact' && fieldConfig[f.id] !== 'hidden');
    const paymentFields = fields.filter(f => f.section === 'payment' && fieldConfig[f.id] !== 'hidden');
    const sportsFields = fields.filter(f => f.section === 'sports' && fieldConfig[f.id] !== 'hidden');
    const isOwnTutor = methods.watch("isOwnTutor");


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-3xl">
                <div className="text-center mb-8">
                    <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h1 className="text-3xl font-bold tracking-tight">Actualización de Datos</h1>
                    <p className="text-muted-foreground">Formulario seguro para {clubName}</p>
                </div>
                 <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/>Datos Personales</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {personalFields.map(field => renderField(field.id, field.label))}
                               </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Contact className="h-5 w-5"/>Datos de Contacto</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {fieldConfig['isOwnTutor'] !== 'hidden' && (
                                     <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="isOwnTutor" 
                                            {...methods.register("isOwnTutor")} 
                                            checked={isOwnTutor}
                                            onCheckedChange={(checked) => methods.setValue('isOwnTutor', checked)}
                                            disabled={fieldConfig['isOwnTutor'] === 'locked'}
                                        />
                                        <label htmlFor="isOwnTutor" className="text-sm font-medium leading-none">Soy mi propio tutor/a (mayor de edad)</label>
                                    </div>
                                )}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {contactFields.map(field => {
                                        if (isOwnTutor && (field.id.startsWith('tutor') && field.id !== 'tutorEmail' && field.id !== 'tutorPhone')) return null;
                                        let label = field.label;
                                        if (isOwnTutor) {
                                            if (field.id === 'tutorEmail') label = 'Email';
                                            if (field.id === 'tutorPhone') label = 'Teléfono';
                                        }
                                        return renderField(field.id, label);
                                    })}
                               </div>
                            </CardContent>
                        </Card>

                        {sportsFields.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/>Datos Deportivos</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {sportsFields.map(field => renderField(field.id, field.label))}
                                </CardContent>
                            </Card>
                        )}

                        {paymentFields.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5"/>Datos Bancarios</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {paymentFields.map(field => renderField(field.id, field.label))}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    {saving ? "Guardando..." : "Guardar mis datos"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
}
