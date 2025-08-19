
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, MoreHorizontal, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, updateDoc, writeBatch, setDoc, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'Entrenamiento' | 'Partido' | 'Evento';
  location?: string;
  teamName?: string;
  color?: string;
};

type ScheduleTemplate = {
  id: string;
  name: string;
  weeklySchedule: any;
};

type DayOverride = {
  date: string; // YYYY-MM-DD
  templateId: string;
  templateName: string;
};


function CalendarView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());

  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (clubId) {
      fetchTemplatesAndConfig(clubId);
    }
  }, [clubId]);

  useEffect(() => {
    if (clubId && defaultTemplateId !== null) {
      fetchCalendarData(clubId, currentDate);
    }
  }, [clubId, currentDate, defaultTemplateId, templates, overrides]);

  const fetchTemplatesAndConfig = async (clubId: string) => {
      try {
        const schedulesCol = collection(db, "clubs", clubId, "schedules");
        const schedulesSnapshot = await getDocs(schedulesCol);
        const fetchedTemplates = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleTemplate));
        setTemplates(fetchedTemplates);

        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          const currentDefaultId = settingsData?.defaultScheduleTemplateId;
          // Ensure the default template exists before setting it
          if (fetchedTemplates.some(t => t.id === currentDefaultId)) {
            setDefaultTemplateId(currentDefaultId);
          } else if (fetchedTemplates.length > 0) {
            // Fallback to the first available template if the saved one doesn't exist
            setDefaultTemplateId(fetchedTemplates[0].id);
          }
        } else if (fetchedTemplates.length > 0) {
            // If no settings doc, set first template as default
            setDefaultTemplateId(fetchedTemplates[0].id);
        }
      } catch (error) {
          console.error("Error fetching templates and config:", error);
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las plantillas de horarios."});
      }
  };

  const fetchCalendarData = async (clubId: string, date: Date) => {
    setLoading(true);
    try {
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Fetch overrides for the current month view
      const overridesQuery = query(collection(db, "clubs", clubId, "calendarOverrides"), 
          where('date', '>=', firstDayOfMonth.toISOString().split('T')[0]),
          where('date', '<=', lastDayOfMonth.toISOString().split('T')[0])
      );
      const overridesSnapshot = await getDocs(overridesQuery);
      const monthOverrides = new Map<string, string>();
      overridesSnapshot.forEach(doc => {
          monthOverrides.set(doc.data().date, doc.data().templateId);
      });
      setOverrides(monthOverrides);

      let allEvents: CalendarEvent[] = [];
      const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

      for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
          const dayStr = d.toISOString().split('T')[0];
          const templateIdToUse = monthOverrides.get(dayStr) || defaultTemplateId;

          if (!templateIdToUse) continue;
          
          const template = templates.find(t => t.id === templateIdToUse);
          if (!template) continue;

          const weeklySchedule = template.weeklySchedule;
          const dayName = daysOfWeek[d.getDay()];
          const daySchedule = weeklySchedule?.[dayName] || [];

          daySchedule.forEach((training: any) => {
              const [hours, minutes] = training.startTime.split(':');
              const eventDate = new Date(d);
              eventDate.setHours(Number(hours), Number(minutes), 0, 0);

              allEvents.push({
                  id: `${training.id}-${d.toISOString().split('T')[0]}`,
                  title: `${training.startTime} - ${training.teamName}`,
                  date: eventDate,
                  type: 'Entrenamiento',
                  location: training.venueName,
                  color: 'bg-green-100 dark:bg-green-900/50',
              });
          });
      }

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (amount: number) => {
    setSelectedDays(new Set()); // Clear selection when changing month
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };
  
  const handleDayClick = (day: number) => {
    const dayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    const newSelectedDays = new Set(selectedDays);
    if (newSelectedDays.has(dayStr)) {
        newSelectedDays.delete(dayStr);
    } else {
        newSelectedDays.add(dayStr);
    }
    setSelectedDays(newSelectedDays);
  }

  const handleSetDefaultTemplate = async (templateId: string) => {
    if (!clubId) return;
    setIsUpdating(true);
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await updateDoc(settingsRef, { defaultScheduleTemplateId: templateId });
        setDefaultTemplateId(templateId);
        toast({ title: "Plantilla por Defecto Actualizada", description: "Se ha establecido la nueva plantilla de horarios por defecto." });
    } catch(e) {
        console.error("Error setting default template:", e);
        // Try to create if it doesn't exist
        if ((e as any).code === 'not-found') {
            try {
                const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                await setDoc(settingsRef, { defaultScheduleTemplateId: templateId });
                setDefaultTemplateId(templateId);
                toast({ title: "Plantilla por Defecto Guardada", description: "Se ha establecido la nueva plantilla de horarios por defecto." });
            } catch (createError) {
                 console.error("Error creating settings for default template:", createError);
                 toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la plantilla por defecto."});
            }
        } else {
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la plantilla por defecto."});
        }
    } finally {
        setIsUpdating(false);
    }
  }
  
  const handleApplyTemplateToSelection = async (templateId: string) => {
    if (!clubId || selectedDays.size === 0) return;
    setIsUpdating(true);
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    try {
        const batch = writeBatch(db);
        selectedDays.forEach(dayStr => {
            const overrideRef = doc(db, "clubs", clubId, "calendarOverrides", dayStr);
            batch.set(overrideRef, {
                date: dayStr,
                templateId: templateId,
                templateName: template.name
            });
        });
        await batch.commit();
        toast({ title: "Plantillas Asignadas", description: `${selectedDays.size} días han sido actualizados con la nueva plantilla.`});
        setSelectedDays(new Set());
        if (clubId) fetchCalendarData(clubId, currentDate); // Refresh view
    } catch(e) {
        console.error("Error applying template override:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo asignar la plantilla a los días seleccionados."});
    } finally {
        setIsUpdating(false);
    }
  }

  const handleRevertToDefault = async () => {
    if (!clubId || selectedDays.size === 0) return;
    setIsUpdating(true);
    try {
        const batch = writeBatch(db);
        selectedDays.forEach(dayStr => {
            const overrideRef = doc(db, "clubs", clubId, "calendarOverrides", dayStr);
            batch.delete(overrideRef);
        });
        await batch.commit();
        toast({ title: "Plantillas Revertidas", description: `Los horarios de ${selectedDays.size} días han sido revertidos a la plantilla por defecto.`});
        setSelectedDays(new Set());
        if (clubId) fetchCalendarData(clubId, currentDate); // Refresh view
    } catch(e) {
        console.error("Error reverting templates:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo revertir la plantilla de los días seleccionados."});
    } finally {
        setIsUpdating(false);
    }
  }

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const placeholders = Array.from({ length: startDay }, (_, i) => i);
  
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();
  const selectedTemplateName = templates.find(t => t.id === defaultTemplateId)?.name || 'Seleccionar Plantilla';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-xl capitalize min-w-[150px] text-center">{monthName} {year}</CardTitle>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" disabled={isUpdating || templates.length === 0} className="min-w-[180px]">
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {selectedTemplateName}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                 <Command>
                    <CommandInput placeholder="Buscar plantilla..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ninguna plantilla.</CommandEmpty>
                      <CommandGroup>
                        {templates.map((template) => (
                          <CommandItem
                            key={template.id}
                            value={template.name}
                            onSelect={() => handleSetDefaultTemplate(template.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                defaultTemplateId === template.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {template.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
            </PopoverContent>
          </Popover>
          
          {selectedDays.size > 0 ? (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="gap-1" disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Acciones ({selectedDays.size})
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Asignar Plantilla a Días</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {templates.map(template => (
                                <DropdownMenuItem key={template.id} onSelect={() => handleApplyTemplateToSelection(template.id)}>
                                    {template.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleRevertToDefault}>
                        Volver a la Plantilla por Defecto
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          ) : (
            <Button className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                Añadir Evento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(loading && !isUpdating) ? (
             <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-7 gap-px border-t border-l border-border bg-border">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center font-semibold py-2 bg-card text-muted-foreground text-sm">{day}</div>
                ))}
                {placeholders.map(i => <div key={`placeholder-${i}`} className="bg-card min-h-[120px]"></div>)}
                {days.map(day => {
                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dayStr = dayDate.toISOString().split('T')[0];
                    const isSelected = selectedDays.has(dayStr);

                    const dayEvents = events.filter(e => 
                        e.date.getDate() === day && 
                        e.date.getMonth() === currentDate.getMonth() &&
                        e.date.getFullYear() === currentDate.getFullYear()
                    ).sort((a,b) => a.date.getTime() - b.date.getTime());
                    
                    const overrideTemplateId = overrides.get(dayStr);
                    const overrideTemplate = overrideTemplateId ? templates.find(t => t.id === overrideTemplateId) : null;

                    return (
                    <div 
                        key={day} 
                        className={cn("p-1 bg-card min-h-[120px] flex flex-col gap-1 cursor-pointer transition-colors", {
                            "bg-primary/10": isSelected,
                            "hover:bg-muted/50": !isSelected
                        })}
                        onClick={() => handleDayClick(day)}
                    >
                        <span className="font-bold self-end text-sm pr-1">{day}</span>
                         {overrideTemplate && (
                            <div className="text-xs font-semibold p-1 bg-accent/50 text-accent-foreground rounded-sm truncate text-center">
                                {overrideTemplate.name}
                            </div>
                         )}
                        <div className="flex-grow space-y-1 overflow-y-auto">
                            {dayEvents.map(event => (
                            <div key={event.id} className={`text-xs p-1.5 rounded-md ${event.color || 'bg-blue-100 dark:bg-blue-900/50'}`}>
                                <p className="font-semibold truncate">{event.title}</p>
                                {event.location && <p className="truncate text-muted-foreground">{event.location}</p>}
                            </div>
                            ))}
                        </div>
                    </div>
                    )
                })}
            </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Calendario de Eventos</h1>
        <p className="text-muted-foreground">
          Consulta y gestiona todos los entrenamientos, partidos y eventos del club.
        </p>
      </div>
      <CalendarView />
    </div>
  )
}


    