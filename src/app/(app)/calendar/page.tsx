
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, MoreHorizontal, Check, ChevronsUpDown, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, updateDoc, writeBatch, setDoc, where, deleteDoc, addDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Team, CalendarEvent, ScheduleTemplate } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";


const EVENT_COLORS = [
    { name: 'Primary', value: 'bg-primary/20 text-primary border border-primary/50', hex: 'hsl(var(--primary))' },
    { name: 'Green', value: 'bg-green-500/20 text-green-700 border border-green-500/50', hex: '#22c55e' },
    { name: 'Yellow', value: 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/50', hex: '#eab308' },
    { name: 'Orange', value: 'bg-orange-500/20 text-orange-700 border border-orange-500/50', hex: '#f97316' },
    { name: 'Red', value: 'bg-red-500/20 text-red-700 border border-red-500/50', hex: '#ef4444' },
    { name: 'Purple', value: 'bg-purple-500/20 text-purple-700 border border-purple-500/50', hex: '#a855f7' },
];

const TEMPLATE_BG_COLORS: {[key: string]: string} = {
    "#dcfce7": "bg-green-100/60",
    "#dbeafe": "bg-blue-100/60",
    "#fef9c3": "bg-yellow-100/60",
    "#ffedd5": "bg-orange-100/60",
    "#fee2e2": "bg-red-100/60",
    "#f3e8ff": "bg-purple-100/60",
    "#fce7f3": "bg-pink-100/60",
};


function CalendarView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, {templateId: string, color?: string}>>(new Map());

  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [eventData, setEventData] = useState<Partial<CalendarEvent>>({});
  

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
      fetchTeams(clubId);
    }
  }, [clubId]);

  useEffect(() => {
    if (clubId && templates.length > 0) {
      fetchCalendarData(currentDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentDate, defaultTemplateId, templates]);

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
          if (fetchedTemplates.some(t => t.id === currentDefaultId)) {
            setDefaultTemplateId(currentDefaultId);
          } else if (fetchedTemplates.length > 0) {
            setDefaultTemplateId(fetchedTemplates[0].id);
          }
        } else if (fetchedTemplates.length > 0) {
            setDefaultTemplateId(fetchedTemplates[0].id);
        }
      } catch (error) {
          console.error("Error fetching templates and config:", error);
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las plantillas de horarios."});
      }
  };

  const fetchTeams = async (clubId: string) => {
    try {
        const teamsSnapshot = await getDocs(collection(db, "clubs", clubId, "teams"));
        setTeams(teamsSnapshot.docs.map(d => ({...d.data(), id: d.id } as Team)));
    } catch(e) {
        console.error(e);
    }
  }

  const fetchCalendarData = async (date: Date) => {
    if (!clubId || !defaultTemplateId) return;
    setLoading(true);
    try {
      const firstDayOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
      const lastDayOfMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));

      const overridesQuery = query(collection(db, "clubs", clubId, "calendarOverrides"), 
          where('date', '>=', format(firstDayOfMonth, "yyyy-MM-dd")),
          where('date', '<=', format(lastDayOfMonth, "yyyy-MM-dd"))
      );
      const overridesSnapshot = await getDocs(overridesQuery);
      const monthOverrides = new Map<string, {templateId: string, color?: string}>();
      overridesSnapshot.forEach(doc => {
          monthOverrides.set(doc.data().date, { templateId: doc.data().templateId, color: doc.data().color });
      });
      setOverrides(monthOverrides);

      let allEvents: CalendarEvent[] = [];
      const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      
      const loopStartDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
      const loopEndDate = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));

      for (let d = new Date(loopStartDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
          const dayStr = format(d, "yyyy-MM-dd");
          const override = monthOverrides.get(dayStr);
          const templateIdToUse = override?.templateId || defaultTemplateId;

          if (!templateIdToUse) continue;
          
          const template = templates.find(t => t.id === templateIdToUse);
          if (!template) continue;

          const weeklySchedule = template.weeklySchedule;
          const dayName = daysOfWeek[d.getUTCDay()];
          const daySchedule = weeklySchedule?.[dayName as keyof typeof weeklySchedule] || [];

          daySchedule.forEach((training: any) => {
              const startDateTime = new Date(`${dayStr}T${training.startTime}:00`);
              const endDateTime = new Date(`${dayStr}T${training.endTime}:00`);
              allEvents.push({
                  id: `${training.id}-${dayStr}`,
                  title: `${training.startTime} - ${training.teamName}`,
                  start: Timestamp.fromDate(startDateTime),
                  end: Timestamp.fromDate(endDateTime),
                  type: 'Entrenamiento',
                  location: training.venueName,
                  color: 'bg-primary/20 text-primary border border-primary/50',
                  isTemplateBased: true,
              });
          });
      }

      const customEventsQuery = query(collection(db, "clubs", clubId, "calendarEvents"), 
          where('start', '>=', Timestamp.fromDate(firstDayOfMonth)),
          where('start', '<=', Timestamp.fromDate(lastDayOfMonth))
      );
      const customEventsSnapshot = await getDocs(customEventsQuery);
      customEventsSnapshot.forEach(doc => {
          allEvents.push({ id: doc.id, ...doc.data() } as CalendarEvent);
      });

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
       toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del calendario."});
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenModal = (mode: 'add' | 'edit', event?: Partial<CalendarEvent>) => {
    setModalMode(mode);
    if(mode === 'add' && selectedDays.size > 0) {
        const firstDay = Array.from(selectedDays)[0];
        const date = new Date(`${firstDay}T12:00:00Z`);
        setEventData({ start: Timestamp.fromDate(date), end: Timestamp.fromDate(date), color: EVENT_COLORS[0].value, type: "Evento" });
    } else {
        setEventData(event || { color: EVENT_COLORS[0].value, type: "Evento" });
    }
    setIsModalOpen(true);
  };
  
  const handleSaveEvent = async () => {
    if (!clubId || !eventData.title || !eventData.start || !eventData.end) return;
    setIsUpdating(true);
    try {
        if(modalMode === 'edit' && eventData.id) {
            const eventRef = doc(db, "clubs", clubId, "calendarEvents", eventData.id);
            await updateDoc(eventRef, eventData);
            toast({ title: "Evento actualizado"});
        } else {
            await addDoc(collection(db, "clubs", clubId, "calendarEvents"), eventData);
            toast({ title: "Evento creado"});
        }
        setIsModalOpen(false);
        fetchCalendarData(currentDate);
    } catch(e) {
        console.error("Error saving event:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el evento."});
    } finally {
        setIsUpdating(false);
    }
  }

  const handleDeleteEvent = async () => {
    if (!clubId || !eventData.id) return;
    setIsUpdating(true);
    try {
        await deleteDoc(doc(db, "clubs", clubId, "calendarEvents", eventData.id));
        toast({ title: "Evento Eliminado"});
        setIsModalOpen(false);
        fetchCalendarData(currentDate);
    } catch(e) {
        console.error("Error deleting event:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el evento."});
    } finally {
        setIsUpdating(false);
    }
  }

  const changeMonth = (amount: number) => {
    setSelectedDays(new Set());
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };
  
  const handleDayClick = (day: number) => {
    const dayDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), day));
    const dayStr = format(dayDate, "yyyy-MM-dd");

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
        await setDoc(settingsRef, { defaultScheduleTemplateId: templateId }, { merge: true });
        setDefaultTemplateId(templateId);
        toast({ title: "Plantilla por Defecto Actualizada", description: "Se ha establecido la nueva plantilla de horarios por defecto." });
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la plantilla por defecto."});
    } finally {
        setIsUpdating(false);
        fetchCalendarData(currentDate);
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
                templateName: template.name,
                color: template.color,
            });
        });
        await batch.commit();
        toast({ title: "Plantillas Asignadas", description: `${selectedDays.size} días han sido actualizados con la nueva plantilla.`});
        setSelectedDays(new Set());
        fetchCalendarData(currentDate);
    } catch(e) {
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
        fetchCalendarData(currentDate);
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo revertir la plantilla de los días seleccionados."});
    } finally {
        setIsUpdating(false);
    }
  }
  
  const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const endOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
  const daysInMonth = endOfMonth.getUTCDate();
  const startDayRaw = startOfMonth.getUTCDay(); 
  const startDay = startDayRaw === 0 ? 6 : startDayRaw - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const placeholders = Array.from({ length: startDay }, (_, i) => i);
  
  const monthName = startOfMonth.toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
  const year = startOfMonth.getUTCFullYear();
  const selectedTemplateName = templates.find(t => t.id === defaultTemplateId)?.name || 'Seleccionar Plantilla';

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b sticky top-0 z-10 bg-card">
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
                              className={cn( "mr-2 h-4 w-4", defaultTemplateId === template.id ? "opacity-100" : "opacity-0")}
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
                    <DropdownMenuItem onSelect={() => handleOpenModal('add')}>Añadir Evento a Día Seleccionado</DropdownMenuItem>
                    <DropdownMenuSeparator />
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
            <Button className="gap-1" onClick={() => handleOpenModal('add')}>
                <PlusCircle className="h-3.5 w-3.5" />
                Añadir Evento
            </Button>
          )}
        </div>
      </CardHeader>
      <div className="sticky top-[89px] z-10 bg-card">
         <div className="grid grid-cols-7 border-b border-border">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center font-semibold py-2 text-muted-foreground text-sm">{day}</div>
            ))}
        </div>
      </div>
      <CardContent className="p-0">
        {(loading && !isUpdating) ? (
             <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-7 gap-px bg-border">
                {placeholders.map(i => <div key={`placeholder-${i}`} className="bg-card min-h-[120px]"></div>)}
                {days.map(day => {
                    const dayDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), day));
                    const dayStr = format(dayDate, "yyyy-MM-dd");
                    const isSelected = selectedDays.has(dayStr);
                    const dayStart = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), 0, 0, 0, 0));
                    const dayEnd = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), 23, 59, 59, 999));

                    const dayEvents = events.filter(e => {
                        const eventDate = e.start.toDate();
                        return eventDate >= dayStart && eventDate <= dayEnd;
                    }).sort((a,b) => a.start.toMillis() - b.start.toMillis());
                    
                    const override = overrides.get(dayStr);
                    const defaultTemplateColor = templates.find(t => t.id === defaultTemplateId)?.color;
                    const dayColor = override?.color || defaultTemplateColor;
                    const dayBgClass = dayColor ? (TEMPLATE_BG_COLORS[dayColor] || 'bg-card') : 'bg-card';


                    return (
                    <div 
                        key={day} 
                        className={cn("p-1 min-h-[120px] flex flex-col gap-1 cursor-pointer transition-colors border-t border-l border-border", dayBgClass, { "ring-2 ring-primary ring-inset": isSelected, "hover:bg-muted/50": !isSelected })}
                        onClick={() => handleDayClick(day)}
                    >
                        <span className="font-bold self-end text-sm pr-1">{day}</span>
                        <div className="flex-grow space-y-1 overflow-y-auto">
                            {dayEvents.map(event => (
                            <div key={event.id} className={cn('text-xs p-1.5 rounded-md cursor-default', event.color)} onClick={(e) => { e.stopPropagation(); if(!event.isTemplateBased) handleOpenModal('edit', event); }}>
                                <p className="font-semibold truncate">{event.title}</p>
                                {event.location && <p className="truncate text-muted-foreground opacity-80">{event.location}</p>}
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

    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? 'Añadir Nuevo Evento' : 'Editar Evento'}</DialogTitle>
                <DialogDescription>
                    Rellena los detalles del evento.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="event-title">Título del Evento</Label>
                    <Input id="event-title" value={eventData.title || ''} onChange={(e) => setEventData({...eventData, title: e.target.value})} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Fecha de Inicio</Label>
                        <DatePicker 
                            date={eventData.start ? eventData.start.toDate() : undefined}
                            onDateChange={(date) => {
                                if (date && eventData.start) {
                                    const oldDate = eventData.start.toDate();
                                    const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), oldDate.getUTCHours(), oldDate.getUTCMinutes()));
                                    setEventData({ ...eventData, start: Timestamp.fromDate(newDate) });
                                }
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Fecha de Fin</Label>
                         <DatePicker 
                            date={eventData.end ? eventData.end.toDate() : undefined}
                            onDateChange={(date) => {
                                if(date && eventData.end) {
                                    const oldDate = eventData.end.toDate();
                                    const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), oldDate.getUTCHours(), oldDate.getUTCMinutes()));
                                    setEventData({...eventData, end: Timestamp.fromDate(newDate)});
                                }
                            }}
                        />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-start-time">Hora de Inicio</Label>
                        <Input id="event-start-time" type="time" value={eventData.start ? format(eventData.start.toDate(), 'HH:mm') : ''} onChange={(e) => {
                             if(eventData.start) {
                                const [h, m] = e.target.value.split(':');
                                const newDate = eventData.start.toDate();
                                newDate.setUTCHours(Number(h), Number(m));
                                setEventData({...eventData, start: Timestamp.fromDate(newDate)})
                            }
                        }}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event-end-time">Hora de Fin</Label>
                        <Input id="event-end-time" type="time" value={eventData.end ? format(eventData.end.toDate(), 'HH:mm') : ''} onChange={(e) => {
                             if(eventData.end) {
                                const [h, m] = e.target.value.split(':');
                                const newDate = eventData.end.toDate();
                                newDate.setUTCHours(Number(h), Number(m));
                                setEventData({...eventData, end: Timestamp.fromDate(newDate)})
                            }
                        }}/>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Tipo de Evento</Label>
                        <Select value={eventData.type || ''} onValueChange={(value) => setEventData({...eventData, type: value as any})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Evento">Evento</SelectItem>
                                <SelectItem value="Partido">Partido</SelectItem>
                                <SelectItem value="Entrenamiento">Entrenamiento</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Equipo (Opcional)</Label>
                        <Select 
                            value={eventData.teamId || 'none'} 
                            onValueChange={(value) => setEventData({...eventData, teamId: value === 'none' ? undefined : value})}
                        >
                            <SelectTrigger><SelectValue placeholder="Ninguno"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguno</SelectItem>
                                {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="event-location">Ubicación (Opcional)</Label>
                    <Input id="event-location" value={eventData.location || ''} onChange={(e) => setEventData({...eventData, location: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Color del Evento</Label>
                    <div className="flex gap-2 flex-wrap">
                        {EVENT_COLORS.map(color => (
                            <button key={color.name} onClick={() => setEventData({...eventData, color: color.value})} className={cn("h-8 w-8 rounded-full border-2 transition-transform", eventData.color === color.value ? 'border-ring scale-110' : 'border-transparent')} style={{backgroundColor: color.hex}}/>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter className="justify-between">
                <div>
                  {modalMode === 'edit' && (
                     <Button variant="destructive" onClick={handleDeleteEvent} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Eliminar Evento
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                    <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                    <Button onClick={handleSaveEvent} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Evento
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
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

    