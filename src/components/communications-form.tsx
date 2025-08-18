"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { generateTemplateAction } from "@/lib/actions";
import { GenerateCommunicationTemplateOutput } from "@/ai/flows/generate-communication-template";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2 } from "lucide-react";

const formSchema = z.object({
  communicationGoal: z.string().min(1, "Communication goal is required."),
  targetAudience: z.string().min(1, "Target audience is required."),
  keyInformation: z.string().min(1, "Key information is required."),
  tone: z.string().optional(),
  additionalContext: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CommunicationsForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateCommunicationTemplateOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      communicationGoal: "",
      targetAudience: "",
      keyInformation: "",
      tone: "formal",
      additionalContext: "",
    },
  });

  async function onSubmit(values: FormData) {
    setLoading(true);
    setResult(null);

    const response = await generateTemplateAction(values);

    if (response.success && response.data) {
      setResult(response.data);
      toast({
        title: "Template Generated!",
        description: "Your new communication template is ready below.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: response.error,
      });
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Generate Communication</CardTitle>
          <CardDescription>Fill in the details to generate a personalized communication template using AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="communicationGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication Goal</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Weekly update, Match cancellation" {...field} />
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
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., U12 Eagles, Entire club" {...field} />
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
                    <FormLabel>Key Information</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Practice is moved to 7 PM at North Field due to weather." {...field} />
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
                    <FormLabel>Tone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="informal">Informal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
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
                    <FormLabel>Additional Context (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Mention the upcoming tournament." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Template
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Generated Template</CardTitle>
          <CardDescription>Your AI-generated template will appear here. You can copy and edit it before sending.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
                <p>Generating your template...</p>
              </div>
            </div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject" className="text-lg">Subject</Label>
                <Input id="subject" readOnly value={result.subject} className="mt-1 font-semibold text-base" />
              </div>
              <div>
                <Label htmlFor="body" className="text-lg">Body</Label>
                <Textarea id="body" readOnly value={result.body} className="mt-1 h-64 text-base" />
              </div>
              <Button variant="outline" className="w-full">Copy Template</Button>
            </div>
          )}
          {!result && !loading && (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
                <div className="flex flex-col items-center gap-1 text-center text-muted-foreground">
                  <Wand2 className="h-10 w-10" />
                  <h3 className="text-lg font-bold tracking-tight">
                    Ready to create?
                  </h3>
                  <p className="text-sm">
                    Fill out the form to generate your first template.
                  </p>
                </div>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
