
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, Timestamp, updateDoc, getDocs } from "firebase/firestore";
import type { RegistrationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";


const buildSchema = (fields: RegistrationForm['fields']) => {
    const shape: Record<string, z.ZodType<any, any>> = {};
    fields.forEach(field => {
        let fieldSchema;
        switch (field.type) {
            case 'email':
                fieldSchema = z.string().email({ message: "Debe ser un correo electrónico válido."});
                break;
            case 'tel':
                fieldSchema = z.string();
                break;
            case 'number':
                fieldSchema = z.preprocess(
                    (a) => parseInt(z.string().parse(a), 10),
                    z.number({ invalid_type_error: "Debe ser un número." })
                );
                break;
            default:
                fieldSchema = z.string();
        }
        if (field.required) {
            fieldSchema = fieldSchema.min(1, { message: "Este campo es obligatorio." });
        } else {
            fieldSchema = fieldSchema.optional();
        }
        shape[field.id] = fieldSchema;
    });
    return z.object(shape);
};


export default function PublicFormPage() {
    const params = useParams();
    const formId = params.formId as string;
    const { toast } = useToast();

    const [formDef, setFormDef] = useState<RegistrationForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    
    const formSchema = useMemo(() => formDef ? buildSchema(formDef.fields) : z.object({}), [formDef]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (!formId) return;

        const fetchFormDefinition = async () => {
            try {
                const clubsSnapshot = await getDocs(collection(db, "clubs"));
                let foundForm = null;
                let clubId = '';

                for (const clubDoc of clubsSnapshot.docs) {
                    const formRef = doc(db, "clubs", clubDoc.id, "registrationForms", formId);
                    const formSnap = await getDoc(formRef);
                    if (formSnap.exists()) {
                        clubId = clubDoc.id;
                        foundForm = { id: formSnap.id, ...formSnap.data(), clubId } as RegistrationForm;
                        break;
                    }
                }
                
                if (foundForm) {
                    const now = new Date();
                    
                    const startDate = foundForm.registrationStartDate ? foundForm.registrationStartDate.toDate() : null;
                    if(startDate) startDate.setHours(0,0,0,0);
                    
                    const endDate = foundForm.registrationDeadline ? foundForm.registrationDeadline.toDate() : null;
                    if(endDate) endDate.setHours(23,59,59,999);
                    
                    const maxSubmissions = foundForm.maxSubmissions;
                    const currentSubmissions = foundForm.submissionCount || 0;

                    let isActive = true;
                    
                    if (startDate && now < startDate) {
                        isActive = false;
                    }
                    if (endDate && now > endDate) {
                        isActive = false;
                    }
                    if (maxSubmissions && currentSubmissions >= maxSubmissions) {
                      isActive = false;
                    }
                    
                    if(isActive){
                        setFormDef(foundForm);
                    } else {
                        setFormDef(null); // Form is not active
                    }
                } else {
                    notFound();
                }

            } catch (error) {
                console.error("Error fetching form definition:", error);
                notFound();
            } finally {
                setLoading(false);
            }
        };

        fetchFormDefinition();
    }, [formId]);

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!formDef) return;
        setSubmitting(true);
        try {
            const formRef = doc(db, "clubs", formDef.clubId, "registrationForms", formId);
            await addDoc(collection(formRef, "submissions"), {
                submittedAt: Timestamp.now(),
                data: data
            });

            await updateDoc(formRef, {
              submissionCount: (formDef.submissionCount || 0) + 1,
            });

            setSubmitted(true);
            toast({
                title: "¡Inscripción Enviada!",
                description: "Gracias por registrarte. Hemos recibido tus datos correctamente.",
            });
        } catch (error) {
            console.error("Error submitting form:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo enviar tu inscripción. Por favor, inténtalo de nuevo.",
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
        )
    }

    if (!formDef) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                         <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
                            <Logo />
                        </div>
                        <CardTitle className="text-2xl">Inscripción No Disponible</CardTitle>
                        <CardDescription>El periodo de inscripción para este evento ha finalizado, no está disponible o se han alcanzado el número máximo de plazas. Contacta con el club para más información.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }
    
    if (submitted) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                         <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
                            <Logo />
                        </div>
                        <CardTitle className="text-2xl">¡Inscripción completada!</CardTitle>
                        <CardDescription>Gracias por registrarte en {formDef.title}. Hemos recibido tus datos correctamente.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">{formDef.title}</CardTitle>
                    {formDef.description && (
                        <CardDescription>{formDef.description}</CardDescription>
                    )}
                     {formDef.price > 0 && (
                        <p className="font-semibold text-lg pt-2">Precio: {formDef.price}€</p>
                    )}
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {formDef.fields.map(field => (
                            <div key={field.id} className="space-y-2">
                                <Label htmlFor={field.id}>
                                    {field.label}
                                    {field.required && <span className="text-destructive"> *</span>}
                                </Label>
                                <Controller
                                    name={field.id}
                                    control={form.control}
                                    render={({ field: controllerField, fieldState }) => {
                                        const commonProps = {...controllerField, id: field.id};
                                        return (
                                            <>
                                                {field.type === 'textarea' ? (
                                                    <Textarea {...commonProps} />
                                                ) : (
                                                    <Input type={field.type} {...commonProps} />
                                                )}
                                                {fieldState.error && (
                                                    <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                                                )}
                                            </>
                                        )
                                    }}
                                />
                            </div>
                        ))}
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Inscripción
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
