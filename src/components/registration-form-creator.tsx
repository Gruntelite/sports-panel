

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
import { Loader2, PlusCircle, Trash2, Info, Settings, FileText, Check, ChevronsUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomRegistrationFormField, RegistrationForm } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { DialogFooter, DialogClose } from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { useTranslation } from "./i18n-provider";


const initialFormFields: CustomRegistrationFormField[] = [
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
type ActiveTab = 'general' | 'config' | 'fields';

type RegistrationFormCreatorProps = {
  onFormSaved: () => void;
  initialData?: RegistrationForm | null;
  mode: 'add' | 'edit';
};

export function RegistrationFormCreator({ onFormSaved, initialData, mode }: RegistrationFormCreatorProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [allFields, setAllFields] = useState<CustomRegistrationFormField[]>(initialFormFields);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomRegistrationFormField['type']>('text');
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [isFieldSelectOpen, setIsFieldSelectOpen] = useState(false);

  const TABS: { id: ActiveTab, label: string, icon: React.ElementType }[] = [
    { id: 'general', label: t('registrations.modal.tabs.general'), icon: Info },
    { id: 'config', label: t('registrations.modal.tabs.config'), icon: Settings },
    { id: 'fields', label: t('registrations.modal.tabs.fields'), icon: FileText },
];

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
        toast({ variant: "destructive", title: t('registrations.modal.errors.emptyFieldName')});
        return;
    }
    const fieldId = newFieldName.toLowerCase().replace(/[^a-z0-9]/g, '_') + `_${Date.now()}`;
    const newField: CustomRegistrationFormField = {
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
                title: t('registrations.modal.updateSuccessTitle'),
                description: t('registrations.modal.updateSuccessDesc'),
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
                title: t('registrations.modal.createSuccessTitle'),
                description: t('registrations.modal.createSuccessDesc'),
            });
        }
        
        onFormSaved();

    } catch (error) {
        console.error("Error saving form:", error);
        toast({
            variant: "destructive",
            title: t('registrations.modal.errors.saveErrorTitle'),
            description: t('registrations.modal.errors.saveErrorDesc'),
        });
    }

    setLoading(false);
  }

  return (
    <div className="p-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
             <div className="sm:hidden">
                <Select value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('registrations.modal.selectSection')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TABS.map((tab) => (
                      <SelectItem key={tab.id} value={tab.id}>
                        <div className="flex items-center gap-2">
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                {TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                        activeTab === tab.id && 'bg-background text-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/20%)]'
                    )}
                    >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                ))}
              </div>
          </div>
            
          <div className={cn('mt-6', activeTab !== 'general' && 'hidden')}>
              <div className="space-y-6">
                  <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>{t('registrations.modal.formTitle')}</FormLabel>
                          <FormControl>
                          <Input placeholder={t('registrations.modal.formTitlePlaceholder')} {...field} />
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
                          <FormLabel>{t('registrations.modal.description')}</FormLabel>
                          <FormControl>
                          <Textarea placeholder={t('registrations.modal.descriptionPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="eventStartDate" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.eventStartDate')}</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                      )}/>
                        <FormField control={form.control} name="eventEndDate" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.eventEndDate')}</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                      )}/>
                  </div>
              </div>
          </div>

          <div className={cn('mt-6', activeTab !== 'config' && 'hidden')}>
              <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="price" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.price')}</FormLabel><Input type="number" placeholder="0" {...field} /><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="maxSubmissions" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.maxSubmissions')}</FormLabel><Input type="number" placeholder="0 (sin límite)" {...field} /><FormMessage /></FormItem>
                      )}/>
                  </div>

                  {price != null && price > 0 && (
                      <FormField control={form.control} name="paymentIBAN" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.paymentIBAN')}</FormLabel><Input placeholder="ES00 0000 0000 00 0000000000" {...field} /><FormMessage /></FormItem>
                      )}/>
                  )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="registrationStartDate" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.regStartDate')}</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                      )}/>
                        <FormField control={form.control} name="registrationDeadline" render={({ field }) => (
                          <FormItem><FormLabel>{t('registrations.modal.regEndDate')}</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
                      )}/>
                  </div>
              </div>
          </div>
          
          <div className={cn('mt-6', activeTab !== 'fields' && 'hidden')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div className="space-y-4">
                    <h4 className="font-medium">{t('registrations.modal.formFields')}</h4>
                     <FormField
                        control={form.control}
                        name="selectedFieldIds"
                        render={({ field }) => (
                          <FormItem>
                            <Popover open={isFieldSelectOpen} onOpenChange={setIsFieldSelectOpen}>
                                <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal">
                                    {field.value?.length > 0 ? t('registrations.modal.selectedFields', { count: field.value.length }) : t('registrations.modal.selectFields')}
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0" align="start">
                                <Command>
                                    <CommandInput placeholder={t('registrations.modal.searchField')} />
                                    <CommandList>
                                        <CommandEmpty>{t('registrations.modal.noFieldFound')}</CommandEmpty>
                                        <CommandGroup>
                                            {allFields.map(item => (
                                                 <CommandItem
                                                    key={item.id}
                                                    value={item.label}
                                                    onSelect={() => {
                                                        if (item.required) return;
                                                        const isSelected = field.value.includes(item.id);
                                                        const newSelection = isSelected
                                                            ? field.value.filter(id => id !== item.id)
                                                            : [...field.value, item.id];
                                                        field.onChange(newSelection);
                                                    }}
                                                 >
                                                    <Check className={cn("mr-2 h-4 w-4", field.value.includes(item.id) ? "opacity-100" : "opacity-0")} />
                                                    {item.label}
                                                    {item.required && <span className="ml-2 text-xs text-muted-foreground">({t('registrations.modal.required')})</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                   <div className="space-y-4">
                      <h4 className="font-medium">{t('registrations.modal.addCustomField')}</h4>
                      <div className="space-y-2">
                          <Label htmlFor="new-field-name">{t('registrations.modal.fieldName')}</Label>
                          <Input id="new-field-name" placeholder={t('registrations.modal.fieldNamePlaceholder')} value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} />
                      </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-field-type">{t('registrations.modal.fieldType')}</Label>
                          <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as CustomRegistrationFormField['type'])}>
                              <SelectTrigger id="new-field-type"><SelectValue placeholder="Tipo" /></SelectTrigger>
                              <SelectContent>
                              <SelectItem value="text">{t('registrations.modal.fieldTypes.text')}</SelectItem>
                              <SelectItem value="textarea">{t('registrations.modal.fieldTypes.textarea')}</SelectItem>
                              <SelectItem value="email">{t('registrations.modal.fieldTypes.email')}</SelectItem>
                              <SelectItem value="tel">{t('registrations.modal.fieldTypes.tel')}</SelectItem>
                              <SelectItem value="number">{t('registrations.modal.fieldTypes.number')}</SelectItem>
                              </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" className="w-full" variant="outline" onClick={handleAddCustomField}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          {t('registrations.modal.addField')}
                      </Button>
                    </div>
              </div>
          </div>

          <DialogFooter>
              <DialogClose asChild>
                  <Button variant="secondary">{t('common.cancel')}</Button>
              </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('registrations.modal.saving')}
                  </>
                  ) : (
                  mode === 'add' ? t('registrations.modal.createButton') : t('common.saveChanges')
                  )}
              </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}
