
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { generateTemplateAction } from "@/lib/actions";
import { GenerateCommunicationTemplateOutput } from "@/ai/flows/generate-communication-template";
import type { OneTimePayment, TemplateHistoryItem } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Copy, Link as LinkIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  communicationGoal: z.string().min(1, "El objetivo de la comunicación es obligatorio."),
  targetAudience: z.string().min(1, "El público objetivo es obligatorio."),
  keyInformation: z.string().min(1, "La información clave es obligatoria."),
  tone: z.string().optional(),
  additionalContext: z.string().optional(),
  paymentId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type EmailTemplateGeneratorProps = {
  onTemplateGenerated: (item: TemplateHistoryItem) => void;
};

export function EmailTemplateGenerator({ onTemplateGenerated }: EmailTemplateGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateCommunicationTemplateOutput | null>(null);
  const [payments, setPayments] = useState<OneTimePayment[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const clubId = userDocSnap.data().clubId;
            if (clubId) {
              const paymentsCol = collection(db, "clubs", clubId, "oneTimePayments");
              const snapshot = await getDocs(paymentsCol);
              setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OneTimePayment)));
            }
          }
        } catch (error) {
          console.error("Error fetching payments:", error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      communicationGoal: "",
      targetAudience: "",
      keyInformation: "",
      tone: "formal",
      additionalContext: "",
      paymentId: "none",
    },
  });

  async function onSubmit(values: FormData) {
    setLoading(true);
    setResult(null);

    const selectedPayment = payments.find(p => p.id === values.paymentId);
    const paymentInfo = selectedPayment 
      ? `Concepto de Pago: ${selectedPayment.concept}, Cantidad: ${selectedPayment.amount}€.` 
      : undefined;

    const response = await generateTemplateAction({
      ...values,
      paymentInfo: paymentInfo,
    });

    if (response.success && response.data) {
      setResult(response.data);
      onTemplateGenerated({
        id: crypto.randomUUID(),
        subject: response.data.subject,
        body: response.data.body,
        date: new Date(),
      });
      toast({
        title: "¡Plantilla Generada!",
        description: "Tu nueva plantilla de comunicación está lista a continuación.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Fallo en la Generación",
        description: response.error,
      });
    }
    setLoading(false);
  }

  const handleCopy = () => {
    if(result) {
      const textToCopy = `Asunto: ${result.subject}\n\n${result.body}`;
      navigator.clipboard.writeText(textToCopy);
      toast({ title: "Copiado", description: "La plantilla se ha copiado al portapapeles." });
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Generador de Plantillas de Email</CardTitle>
          <CardDescription>Describe tu necesidad y la IA creará un borrador de comunicación para que lo uses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="communicationGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo de la Comunicación</FormLabel>
                    <FormControl>
                      <Input placeholder="p.ej., Actualización semanal, Cancelación de partido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público Objetivo</FormLabel>
                    <FormControl>
                      <Input placeholder="p.ej., Águilas Sub-12, Todo el club" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keyInformation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Información Clave</FormLabel>
                    <FormControl>
                      <Textarea placeholder="p.ej., El entrenamiento se traslada a las 19:00 en el Campo Norte por el tiempo." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tono</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tono" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="informal">Informal</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                        <SelectItem value="friendly">Amistoso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contexto Adicional (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="p.ej., Mencionar el próximo torneo." {...field} />
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
                    <FormLabel>Vincular Pago (Opcional)</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un pago para incluir en el email..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No incluir pago</SelectItem>
                        {payments.map(p => (
                          <SelectItem key={p.id} value={p.id!}>{p.concept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    Generar Plantilla
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Plantilla Generada</CardTitle>
          <CardDescription>Tu plantilla generada por IA aparecerá aquí. Puedes copiarla y editarla antes de enviarla.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
                <p>Generando tu plantilla...</p>
              </div>
            </div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject" className="text-lg font-medium">Asunto</Label>
                <Input id="subject" readOnly value={result.subject} className="mt-1 font-semibold text-base" />
              </div>
              <div>
                <Label htmlFor="body" className="text-lg font-medium">Cuerpo</Label>
                <Textarea id="body" readOnly value={result.body} className="mt-1 h-64 text-base" />
              </div>
              <Button variant="outline" className="w-full" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Plantilla
              </Button>
            </div>
          )}
          {!result && !loading && (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
                <div className="flex flex-col items-center gap-1 text-center text-muted-foreground">
                  <Wand2 className="h-10 w-10" />
                  <h3 className="text-lg font-bold tracking-tight">
                    ¿Listo para crear?
                  </h3>
                  <p className="text-sm">
                    Rellena el formulario para generar tu primera plantilla.
                  </p>
                </div>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
