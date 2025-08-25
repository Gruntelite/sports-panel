
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomFormField, RegistrationForm } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
import { DialogFooter, DialogClose } from "./ui/dialog";


const initialFormFields: CustomFormField[] = [
    { id: "name", label: "Nombre y Apellidos", type: 'text', required: true, custom: false },
    { id: "email", label: "Correo Electrónico", type: 'email', required: true, custom: false },
    { id: "phone", label: "Teléfono", type: 'tel', required: false, custom: false },
    { id: "teamName", label: "Nombre del Equipo (si aplica)", type: 'text', required: false, custom: false },
    { id: "age", label: "Edad", type: 'number', required: false, custom: false },
    { id: "notes", label: "Notas / Comentarios", type: 'textarea', required: false, custom: false },
];


const formSchema = z.object({
  title: z.string().min(3, "El título del evento es obligatorio."),
  description: z.string().optional(),
  selectedFieldIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Tienes que seleccionar al menos un campo.",
  }),
});

type FormData = z.infer<typeof formSchema>;

type RegistrationFormCreatorProps = {
  onFormCreated: () => void;
};

export function RegistrationFormCreator({ onFormCreated }: RegistrationFormCreatorProps) {
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
      selectedFieldIds: ["name", "email"],
    },
  });
  
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
        const newFormDoc: Omit<RegistrationForm, "id"> = {
            title: values.title,
            description: values.description,
            fields: fieldsToSave,
            createdAt: Timestamp.now(),
            clubId: clubId,
            status: 'active',
            submissionCount: 0,
        };

        await addDoc(collection(db, "clubs", clubId, "registrationForms"), newFormDoc);
        
        onFormCreated();
        
        toast({
            title: "¡Formulario Generado!",
            description: "Tu formulario de inscripción público está listo.",
        });

    } catch (error) {
        console.error("Error creating form:", error);
        toast({
            variant: "destructive",
            title: "Fallo en la Generación",
            description: "No se pudo guardar el formulario en la base de datos.",
        });
    }

    setLoading(false);
  }

  return (
    <div className="p-1">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-8">
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

                 <div className="space-y-3 pt-2">
                    <h4 className="font-medium">Añadir Campo Personalizado</h4>
                        <div className="flex items-end space-x-2">
                            <div className="flex-grow space-y-1.5">
                            <Label htmlFor="new-field-name">Nombre del Campo</Label>
                            <Input 
                                id="new-field-name"
                                placeholder="p.ej., Talla de camiseta" 
                                value={newFieldName} 
                                onChange={(e) => setNewFieldName(e.target.value)} 
                            />
                            </div>
                            <div className="space-y-1.5">
                            <Label htmlFor="new-field-type">Tipo</Label>
                            <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as CustomFormField['type'])}>
                                <SelectTrigger id="new-field-type" className="w-[150px]">
                                <SelectValue placeholder="Tipo de campo" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="text">Texto Corto</SelectItem>
                                <SelectItem value="textarea">Texto Largo</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="tel">Teléfono</SelectItem>
                                <SelectItem value="number">Número</SelectItem>
                                </SelectContent>
                            </Select>
                            </div>
                            <Button type="button" size="icon" onClick={handleAddCustomField}>
                            <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
            </div>

            <FormField
                control={form.control}
                name="selectedFieldIds"
                render={() => (
                <FormItem>
                    <div className="mb-4">
                        <FormLabel>Campos del Formulario</FormLabel>
                        <FormDescription>
                        Selecciona la información que quieres solicitar a los inscritos.
                        </FormDescription>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-4">
                    {allFields.map((item) => (
                    <FormField
                        key={item.id}
                        control={form.control}
                        name="selectedFieldIds"
                        render={({ field }) => {
                        return (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="flex items-center gap-4">
                                {item.custom && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveCustomField(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <div className="space-y-0.5">
                                    <FormLabel className={!item.custom ? 'pl-10' : ''}>{item.label}</FormLabel>
                                    <FormDescription className={!item.custom ? 'pl-10' : ''}>
                                    Tipo: {item.type}
                                    </FormDescription>
                                </div>
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
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <div className="md:col-span-2">
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
                        'Crear Formulario'
                        )}
                    </Button>
                </DialogFooter>
            </div>
            
        </form>
        </Form>
    </div>
  );
}

