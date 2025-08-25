
"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle, Trash2, Info, Settings, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomFormField, RegistrationForm } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { DialogFooter, DialogClose } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DatePicker } from "./ui/date-picker";
import { Switch } from "./ui/switch";


const initialFormFields: CustomFormField[] = [
    { id: "name", label: "Nombre y Apellidos", type: 'text', required: true, custom: false },
    { id: "email", label: "Correo Electrónico", type: 'email', required: true, custom: false },
    { id: "phone", label: "Teléfono", type: 'tel', required: false, custom: false },
    { id: "age", label: "Edad", type: 'number', required: false, custom: false },
    { id: "notes", label: "Notas / Comentarios", type: 'textarea', required: false, custom: false },
];


const formSchema = z.object({
  title: z.string().min(3, "El título del evento es obligatorio."),
  description: z.string().optional(),
  price: z.preprocess((val) => Number(val), z.number().min(0).optional()),
  paymentIBAN: z.string().optional(),
  maxSubmissions: z.preprocess((val) => Number(val), z.number().min(0).optional()),
  registrationStartDate: z.date().optional(),
  registrationDeadline: z.date().optional(),
  eventStartDate: z.date().optional(),
  eventEndDate: z.date().optional(),
  selectedFieldIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Tienes que seleccionar al menos un campo.",
  }),
});

type FormData = z.infer<typeof formSchema>;

type RegistrationFormCreatorProps = {
  onFormSaved: () => void;
  initialData?: RegistrationForm | null;
  mode: 'add' | 'edit';
};

export function RegistrationFormCreator({ onFormSaved, initialData, mode }: RegistrationFormCreatorProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [allFields, setAllFields] = useState<CustomFormField[]>(initialFormFields);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFormField['type']>('text');


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      paymentIBAN: "",
      maxSubmissions: 0,
      selectedFieldIds: ["name", "email"],
    },
  });

  const price = useWatch({
    control: form.control,
    name: 'price',
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description,
        price: initialData.price || 0,
        paymentIBAN: initialData.paymentIBAN || "",
        maxSubmissions: initialData.maxSubmissions || 0,
        registrationStartDate: initialData.registrationStartDate?.toDate(),
        registrationDeadline: initialData.registrationDeadline?.toDate(),
        eventStartDate: initialData.eventStartDate?.toDate(),
        eventEndDate: initialData.eventEndDate?.toDate(),
        selectedFieldIds: initialData.fields.map(f => f.id),
      });
      // Combine initial fields with any custom ones from the form
      const existingCustomFields = initialData.fields.filter(f => f.custom);
      const uniqueCustomFields = existingCustomFields.filter(ecf => !initialFormFields.some(iff => iff.id === ecf.id));
      setAllFields([...initialFormFields, ...uniqueCustomFields]);

    } else {
       form.reset({
          title: "",
          description: "",
          price: 0,
          paymentIBAN: "",
          maxSubmissions: 0,
          selectedFieldIds: ["name", "email"],
          registrationStartDate: undefined,
          registrationDeadline: undefined,
          eventStartDate: undefined,
          eventEndDate: undefined,
       });
       setAllFields(initialFormFields);
    }
  }, [initialData, mode, form]);
  
  const handleAddCustomField = () => {
    if (newFieldName.trim() === "") {
        toast({ variant: "destructive", title: "El nombre del campo no puede estar vacío."});
        return;
    }
    const fieldId = newFieldName.toLowerCase().replace(/[^a-z0-9]/g, '_') + `_${Date.now()}`;
    const newField: CustomFormField = {
        id: fieldId,
        label: newFieldName.trim(),
        type: newFieldType,
        required: false,
        custom: true,
    };
    setAllFields(prev => [...prev, newField]);
    setNewFieldName("");
    setNewFieldType('text');
  };
  
  const handleRemoveCustomField = (idToRemove: string) => {
    setAllFields(prev => prev.filter(field => field.id !== idToRemove));
    const currentSelected = form.getValues("selectedFieldIds");
    form.setValue("selectedFieldIds", currentSelected.filter(id => id !== idToRemove));
  };


  async function onSubmit(values: FormData) {
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
        toast({ variant: "destructive", title: "Error de autenticación."});
        setLoading(false);
        return;
    }
    
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        toast({ variant: "destructive", title: "No se encontró tu club."});
        setLoading(false);
        return;
    }
    const clubId = userDocSnap.data().clubId;

    try {
        const fieldsToSave = allFields.filter(f => values.selectedFieldIds.includes(f.id));
        
        const now = new Date();
        const startDate = values.registrationStartDate;
        const endDate = values.registrationDeadline;
        let status: 'active' | 'closed' = 'closed';
        if (startDate) startDate.setHours(0,0,0,0);
        if (endDate) endDate.setHours(23,59,59,999);

        if (!startDate || now >= startDate) {
            if (endDate) {
                if (now <= endDate) {
                    status = 'active';
                }
            } else {
                status = 'active';
            }
        }

        const formData: Omit<RegistrationForm, "id" | "createdAt" | "clubId" | "submissionCount"> = {
            title: values.title,
            description: values.description,
            price: values.price || 0,
            paymentIBAN: values.paymentIBAN,
            maxSubmissions: values.maxSubmissions || null,
            status: status,
            registrationStartDate: values.registrationStartDate ? Timestamp.fromDate(values.registrationStartDate) : null,
            registrationDeadline: values.registrationDeadline ? Timestamp.fromDate(values.registrationDeadline) : null,
            eventStartDate: values.eventStartDate ? Timestamp.fromDate(values.eventStartDate) : null,
            eventEndDate: values.eventEndDate ? Timestamp.fromDate(values.eventEndDate) : null,
            fields: fieldsToSave,
        };
        
        if (mode === 'edit' && initialData?.id) {
            const formRef = doc(db, "clubs", clubId, "registrationForms", initialData.id);
            await updateDoc(formRef, formData);
             toast({
                title: "¡Formulario Actualizado!",
                description: "Los cambios en el formulario se han guardado.",
            });
        } else {
            const newFormDoc = {
                ...formData,
                createdAt: Timestamp.now(),
                clubId: clubId,
                submissionCount: 0,
            };
            await addDoc(collection(db, "clubs", clubId, "registrationForms"), newFormDoc);
             toast({
                title: "¡Formulario Creado!",
                description: "Tu formulario de inscripción público está listo.",
            });
        }
        
        onFormSaved();

    } catch (error) {
        console.error("Error saving form:", error);
        toast({
            variant: "destructive",
            title: "Fallo al Guardar",
            description: "No se pudo guardar el formulario en la base de datos.",
        });
    }

    setLoading(false);
  }

  return (
    <div className="p-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general"><Info className="mr-2 h-4 w-4" />Información General</TabsTrigger>
              <TabsTrigger value="config"><Settings className="mr-2 h-4 w-4" />Configuración</TabsTrigger>
              <TabsTrigger value="fields"><FileText className="mr-2 h-4 w-4" />Campos del Formulario</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
                <div className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Título del Formulario</FormLabel>
                            <FormControl>
                            <Input placeholder="p.ej., Torneo de Verano 3x3, Captación 2024" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                            <Textarea placeholder="Describe brevemente el evento, las fechas, el lugar, el precio, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="eventStartDate" render={({ field }) => (
                            <FormItem><FormLabel>Fecha de Inicio del Evento</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="eventEndDate" render={({ field }) => (
                            <FormItem><FormLabel>Fecha de Fin del Evento</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="config" className="mt-6">
                <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Precio por Inscripción (€)</FormLabel><Input type="number" placeholder="0" {...field} /><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="maxSubmissions" render={({ field }) => (
                            <FormItem><FormLabel>Límite de Inscritos</FormLabel><Input type="number" placeholder="0 (sin límite)" {...field} /><FormMessage /></FormItem>
                        )}/>
                    </div>

                    {price > 0 && (
                        <FormField control={form.control} name="paymentIBAN" render={({ field }) => (
                            <FormItem><FormLabel>IBAN para la Transferencia</FormLabel><Input placeholder="ES00 0000 0000 00 0000000000" {...field} /><FormMessage /></FormItem>
                        )}/>
                    )}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="registrationStartDate" render={({ field }) => (
                            <FormItem><FormLabel>Fecha Inicio de Inscripción</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="registrationDeadline" render={({ field }) => (
                            <FormItem><FormLabel>Fecha Fin de Inscripción</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="fields" className="mt-6">
                 <FormField
                    control={form.control}
                    name="selectedFieldIds"
                    render={() => (
                    <FormItem>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <div className="space-y-4">
                                <h4 className="font-medium">Campos del Formulario</h4>
                                <p className="text-sm text-muted-foreground">Activa los campos que necesites. Los obligatorios no se pueden desactivar.</p>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-4">
                                    {allFields.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name="selectedFieldIds"
                                        render={({ field }) => {
                                        return (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    {item.custom && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveCustomField(item.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                                </div>
                                            <FormControl>
                                                <Switch
                                                checked={field.value?.includes(item.id)}
                                                onCheckedChange={(checked) => {
                                                    if(item.required) return;
                                                    return checked
                                                    ? field.onChange([...field.value, item.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                            (value) => value !== item.id
                                                        )
                                                        )
                                                }}
                                                disabled={item.required}
                                                />
                                            </FormControl>
                                            </FormItem>
                                        )
                                        }}
                                    />
                                    ))}
                                </div>
                            </div>
                             <div className="space-y-4">
                                <h4 className="font-medium">Añadir Campo Personalizado</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="new-field-name">Nombre del Campo</Label>
                                    <Input id="new-field-name" placeholder="p.ej., Talla de camiseta" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} />
                                </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="new-field-type">Tipo de Campo</Label>
                                    <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as CustomFormField['type'])}>
                                        <SelectTrigger id="new-field-type"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="text">Texto Corto</SelectItem>
                                        <SelectItem value="textarea">Texto Largo</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="tel">Teléfono</SelectItem>
                                        <SelectItem value="number">Número</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 </div>
                                 <Button type="button" className="w-full" variant="outline" onClick={handleAddCustomField}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Añadir Campo
                                </Button>
                             </div>
                        </div>
                    </FormItem>
                    )}
                />
            </TabsContent>

          </Tabs>
          
          <DialogFooter>
              <DialogClose asChild>
                  <Button variant="secondary">Cancelar</Button>
              </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                  </>
                  ) : (
                  mode === 'add' ? 'Crear Formulario' : 'Guardar Cambios'
                  )}
              </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}
