
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Clipboard, ExternalLink, ClipboardList, PlusCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OneTimePayment, FormHistoryItem } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const initialFormFields = [
    { id: "name", label: "Nombre y Apellidos", required: true, custom: false },
    { id: "email", label: "Correo Electrónico", required: true, custom: false },
    { id: "phone", label: "Teléfono", required: false, custom: false },
    { id: "teamName", label: "Nombre del Equipo (si aplica)", required: false, custom: false },
    { id: "age", label: "Edad", required: false, custom: false },
    { id: "notes", label: "Notas / Comentarios", required: false, custom: false },
];

type FormFieldType = {
  id: string;
  label: string;
  required: boolean;
  custom: boolean;
};

const formSchema = z.object({
  title: z.string().min(3, "El título del evento es obligatorio."),
  description: z.string().optional(),
  fields: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Tienes que seleccionar al menos un campo.",
  }),
  paymentId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type RegistrationFormCreatorProps = {
  onFormCreated: (item: FormHistoryItem) => void;
};

export function RegistrationFormCreator({ onFormCreated }: RegistrationFormCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<{ id: string, url: string } | null>(null);
  const { toast } = useToast();
  
  const [formFields, setFormFields] = useState<FormFieldType[]>(initialFormFields);
  const [newFieldName, setNewFieldName] = useState("");
  const [payments, setPayments] = useState<OneTimePayment[]>([]);

  useEffect(() => {
    const fetchPayments = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = await getDoc(doc(db, "users", user.uid));
        const clubId = userDocRef.data()?.clubId;
        if (clubId) {
          const paymentsCol = collection(db, "clubs", clubId, "oneTimePayments");
          const snapshot = await getDocs(paymentsCol);
          setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OneTimePayment)));
        }
      }
    };
    fetchPayments();
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      fields: ["name", "email"],
      paymentId: "none",
    },
  });
  
  const handleAddCustomField = () => {
    if (newFieldName.trim() === "") {
        toast({ variant: "destructive", title: "El nombre del campo no puede estar vacío."});
        return;
    }
    const fieldId = newFieldName.toLowerCase().replace(/\s+/g, '_') + `_${Date.now()}`;
    const newField: FormFieldType = {
        id: fieldId,
        label: newFieldName.trim(),
        required: false,
        custom: true,
    };
    setFormFields(prev => [...prev, newField]);
    setNewFieldName("");
  };
  
  const handleRemoveCustomField = (idToRemove: string) => {
    setFormFields(prev => prev.filter(field => field.id !== idToRemove));
    const currentSelected = form.getValues("fields");
    form.setValue("fields", currentSelected.filter(id => id !== idToRemove));
  };


  async function onSubmit(values: FormData) {
    setLoading(true);
    setGeneratedForm(null);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const formId = values.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
    const formUrl = `/form/${formId}`;

    const newForm = { id: formId, url: formUrl };
    setGeneratedForm(newForm);
    onFormCreated({
      id: formId,
      title: values.title,
      url: formUrl,
      date: new Date(),
    });

    setLoading(false);
    toast({
      title: "¡Formulario Generado!",
      description: "Tu formulario de inscripción público está listo.",
    });
  }

  const handleCopy = () => {
    if (generatedForm) {
      const fullUrl = `${window.location.origin}${generatedForm.url}`;
      navigator.clipboard.writeText(fullUrl);
      toast({ title: "Enlace Copiado", description: "La URL del formulario se ha copiado." });
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Creador de Formularios de Inscripción</CardTitle>
          <CardDescription>Diseña un formulario público para tu próximo evento, torneo o captación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Título del Formulario</FormLabel>
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
                    <FormLabel className="text-base">Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe brevemente el evento, las fechas, el lugar, el precio, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Vincular Pago (Opcional)</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un pago para este formulario..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No requerir pago</SelectItem>
                        {payments.map(p => (
                          <SelectItem key={p.id} value={p.id!}>{p.concept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Si se vincula, se pedirá el pago al rellenar el formulario.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="fields"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                        <FormLabel className="text-base">Campos del Formulario</FormLabel>
                        <FormDescription>
                        Selecciona la información que quieres solicitar a los inscritos.
                        </FormDescription>
                    </div>
                    <div className="space-y-3">
                    {formFields.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="fields"
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
                     <Separator className="my-6"/>
                     <div className="space-y-3">
                        <h4 className="font-medium">Añadir Campo Personalizado</h4>
                         <div className="flex items-center space-x-2">
                             <Input 
                                placeholder="p.ej., Talla de camiseta, Alergias" 
                                value={newFieldName} 
                                onChange={(e) => setNewFieldName(e.target.value)} 
                             />
                             <Button type="button" size="sm" onClick={handleAddCustomField}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir
                             </Button>
                         </div>
                     </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generar Formulario y Página Pública
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Formulario Generado</CardTitle>
          <CardDescription>Una vez generado, aquí aparecerá el enlace a tu formulario público.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
                <p>Configurando la base de datos y la página pública...</p>
              </div>
            </div>
          )}
          {generatedForm && !loading && (
            <Alert>
              <ClipboardList className="h-4 w-4" />
              <AlertTitle>¡Tu formulario está listo!</AlertTitle>
              <AlertDescription className="mt-2">
                Comparte este enlace para que la gente pueda inscribirse. Las respuestas se guardarán automáticamente.
              </AlertDescription>
                <div className="flex w-full max-w-sm items-center space-x-2 my-4">
                    <Input type="text" readOnly value={`${window.location.origin}${generatedForm.url}`} />
                    <Button type="button" size="icon" onClick={handleCopy}>
                        <Clipboard className="h-4 w-4" />
                    </Button>
                </div>
                 <Button variant="outline" asChild>
                    <a href={generatedForm.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir Formulario en Nueva Pestaña
                    </a>
                </Button>
            </Alert>
          )}
          {!generatedForm && !loading && (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
                <div className="flex flex-col items-center gap-1 text-center text-muted-foreground">
                  <ClipboardList className="h-10 w-10" />
                  <h3 className="text-lg font-bold tracking-tight">
                    Crea tu formulario
                  </h3>
                  <p className="text-sm">
                    Define los campos en el panel de la izquierda y genera tu página.
                  </p>
                </div>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
