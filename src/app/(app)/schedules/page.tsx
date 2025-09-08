

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, X, Loader2, MoreVertical, Edit, GripVertical, Settings, CalendarRange, Trash, Hourglass, Calendar, Eye, Download, RefreshCw, Palette, MoreHorizontal, Check, ChevronsUpDown, Calendar as CalendarIcon, UserSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, query, orderBy, writeBatch, where, addDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Team, CalendarEvent, ScheduleTemplate } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse, parseISO, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";


type Venue = {
    id: string;
    name: string;
}

type Assignment = {
    id: string;
    teamId: string;
    teamName: string;
    startTime: string;
    endTime: string;
    venueId: string;
    venueName: string;
}

type DailyScheduleEntry = {
    id: string; 
    teamId: string;
    teamName: string;
    startTime: string;
    endTime: string;
    venueId: string;
    venueName: string;
};

type WeeklySchedule = {
  Lunes: DailyScheduleEntry[];
  Martes: DailyScheduleEntry[];
  Miércoles: DailyScheduleEntry[];
  Jueves: DailyScheduleEntry[];
  Viernes: DailyScheduleEntry[];
  Sábado: DailyScheduleEntry[];
  Domingo: DailyScheduleEntry[];
};

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
type DayOfWeek = typeof daysOfWeek[number];

const TEMPLATE_COLORS = [
    { name: "Default", value: "hsl(210 40% 96.1%)", css: "bg-muted/50"}, // muted
    { name: "Green", value: "#dcfce7", css: "bg-green-100/60"},
    { name: "Blue", value: "#dbeafe", css: "bg-blue-100/60"},
    { name: "Yellow", value: "#fef9c3", css: "bg-yellow-100/60"},
    { name: "Orange", value: "#ffedd5", css: "bg-orange-100/60"},
    { name: "Red", value: "#fee2e2", css: "bg-red-100/60"},
    { name: "Purple", value: "#f3e8ff", css: "bg-purple-100/60"},
    { name: "Pink", value: "#fce7f3", css: "bg-pink-100/60"},
];

const EVENT_COLORS = [
    { name: 'Primary', value: 'bg-primary/20 text-primary border border-primary/50', hex: 'hsl(var(--primary))' },
    { name: 'Green', value: 'bg-green-500/20 text-green-700 border border-green-500/50', hex: '#22c55e' },
    { name: 'Yellow', value: 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/50', hex: '#eab308' },
    { name: 'Orange', value: 'bg-orange-500/20 text-orange-700 border border-orange-500/50', hex: '#f97316' },
    { name: 'Red', value: 'bg-red-500/20 text-red-700 border border-red-500/50', hex: '#ef4444' },
    { name: 'Purple', value: 'bg-purple-500/20 text-purple-700 border border-purple-500/50', hex: '#a855f7' },
];

const TEMPLATE_BG_COLORS: {[key: string]: string} = {
    "hsl(210 40% 96.1%)": "bg-muted/50",
    "#dcfce7": "bg-green-100/60",
    "#dbeafe": "bg-blue-100/60",
    "#fef9c3": "bg-yellow-100/60",
    "#ffedd5": "bg-orange-100/60",
    "#fee2e2": "bg-red-100/60",
    "#f3e8ff": "bg-purple-100/60",
    "#fce7f3": "bg-pink-100/60",
};


const WeeklyScheduleView = ({ template, innerRef }: { template: ScheduleTemplate | undefined, innerRef: React.Ref<HTMLDivElement> }) => {
    if (!template) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No hay plantilla seleccionada para mostrar.</p>
            </div>
        );
    }
    
    const { venues, weeklySchedule, startTime = "16:00", endTime = "23:00", color } = template;
    const templateBg = TEMPLATE_COLORS.find(c => c.value === color)?.css || 'bg-card';


    const timeToMinutes = (time: string) => {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const timeSlots = useMemo(() => {
        const slots = [];
        let current = new Date(`1970-01-01T${startTime}:00`);
        const endDate = new Date(`1970-01-01T${endTime}:00`);
        while (current < endDate) {
            slots.push(current.toTimeString().substring(0, 5));
            current = new Date(current.getTime() + 60 * 60 * 1000); // 1 hour intervals
        }
        return slots;
    }, [startTime, endTime]);

    const processDayEvents = (events: DailyScheduleEntry[]) => {
        if (!events || events.length === 0) return [];

        const sortedEvents = events
            .filter(e => e.startTime && e.endTime)
            .map(e => ({
                ...e,
                start: timeToMinutes(e.startTime),
                end: timeToMinutes(e.endTime),
            }))
            .sort((a, b) => a.start - b.start || a.end - b.end);

        let layout: (DailyScheduleEntry & { start: number; end: number; col: number; numCols: number })[] = [];

        for (const event of sortedEvents) {
            let col = 0;
            let overlaps = layout.filter(e => Math.max(event.start, e.start) < Math.min(event.end, e.end));

            let colNumbers = overlaps.map(e => e.col);
            while (colNumbers.includes(col)) {
                col++;
            }
            
            layout.push({ ...event, col, numCols: 1 });
        }
        
        for (let i = 0; i < layout.length; i++) {
            let overlappingGroup = [layout[i]];
            for (let j = 0; j < layout.length; j++) {
                if (i === j) continue;
                if (Math.max(layout[i].start, layout[j].start) < Math.min(layout[i].end, layout[j].end)) {
                    let isAlreadyInGroup = overlappingGroup.some(groupedEvent => groupedEvent.id === layout[j].id);
                    if (!isAlreadyInGroup) {
                        overlappingGroup.push(layout[j]);
                    }
                }
            }
            const maxCols = overlappingGroup.reduce((max, e) => Math.max(max, e.col), 0) + 1;
            
            for (const eventInGroup of overlappingGroup) {
                const eventToUpdate = layout.find(e => e.id === eventInGroup.id);
                if (eventToUpdate) {
                    eventToUpdate.numCols = maxCols;
                }
            }
        }
        
        return layout;
    };

    const calculateEventPosition = (event: any) => {
        const gridStartMinutes = timeToMinutes(startTime);
        const eventStartMinutes = timeToMinutes(event.startTime);
        const eventEndMinutes = timeToMinutes(event.endTime);

        const startOffsetMinutes = eventStartMinutes - gridStartMinutes;
        const durationMinutes = eventEndMinutes - eventStartMinutes;

        const hourHeight = 80;
        const top = (startOffsetMinutes / 60) * hourHeight;
        const height = (durationMinutes / 60) * hourHeight;
        
        const width = 100 / event.numCols;
        const left = event.col * width;
        
        return { 
            top, 
            height, 
            left: `${left}%`, 
            width: `calc(${width}% - 4px)`
        };
    };

    return (
        <div ref={innerRef} className={cn("p-4", templateBg)}>
          <div className="space-y-8">
            {venues.map(venue => (
                <div key={venue.id}>
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-muted/50 border-b">
                            <CardTitle>{venue.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0">
                            <div className="flex" style={{ minWidth: `${60 + daysOfWeek.length * 220}px` }}>
                                <div className="w-[60px] flex-shrink-0 bg-card">
                                    <div className="h-[41px] border-b">&nbsp;</div> {/* Spacer for day headers */}
                                    {timeSlots.map(time => (
                                        <div key={time} className="h-[80px] relative text-right pr-2 border-r">
                                            <span className="text-xs font-semibold text-muted-foreground absolute -top-2.5 right-2">{time}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-grow">
                                    {daysOfWeek.map(day => {
                                        const dayEvents = processDayEvents(weeklySchedule[day]?.filter(e => e.venueId === venue.id));
                                        return (
                                            <div key={day} className="w-[220px] flex-shrink-0 border-r relative bg-card">
                                                <div className="text-center font-medium p-2 h-[41px] border-b">{day}</div>
                                                <div className="relative h-full">
                                                    {timeSlots.map((_, index) => (
                                                        <div key={index} className="h-[80px] border-b"></div>
                                                    ))}
                                                    {dayEvents.map(event => {
                                                        const { top, height, left, width } = calculateEventPosition(event);
                                                        return (
                                                            <div
                                                                key={event.id}
                                                                className="absolute p-2 py-1 flex flex-col rounded-lg border text-primary bg-primary/20 border-primary/50"
                                                                style={{ top, height, left, width }}
                                                            >
                                                                <span className="font-bold text-sm break-words">{event.teamName}</span>
                                                                <span className="text-xs opacity-90 flex items-center gap-1 mt-auto">
                                                                    <Hourglass className="h-3 w-3"/>{event.startTime} - {event.endTime}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
      </div>
    );
};

function CalendarView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, {templateId: string, color?: string}>>(new Map());

  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [eventData, setEventData] = useState<Partial<CalendarEvent>>({});
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: Date, events: CalendarEvent[] } | null>(null);
  
  const fetchInitialData = useCallback(async (clubId: string) => {
    setLoading(true);
    try {
        const schedulesCol = collection(db, "clubs", clubId, "schedules");
        const schedulesSnapshot = await getDocs(schedulesCol);
        const fetchedTemplates = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleTemplate));
        setTemplates(fetchedTemplates);

        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        const settingsSnap = await getDoc(settingsRef);
        let currentDefaultId = null;
        if (settingsSnap.exists()) {
            currentDefaultId = settingsSnap.data()?.defaultScheduleTemplateId;
        }
        
        if (fetchedTemplates.some(t => t.id === currentDefaultId)) {
            setDefaultTemplateId(currentDefaultId);
        } else if (fetchedTemplates.length > 0) {
            setDefaultTemplateId(fetchedTemplates[0].id);
        } else {
            setDefaultTemplateId(null);
        }
    } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las plantillas."});
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  // Fetch initial data (templates, etc.) once
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchInitialData(currentClubId);
          }
        } else {
             setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchInitialData]);
  
  
  // Fetch calendar events whenever the month or dependencies change
  useEffect(() => {
    const fetchCalendarData = async () => {
        if (!clubId || templates.length === 0 || !defaultTemplateId) {
            setEvents([]);
            return;
        };

        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

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

            let allTemplateEvents: CalendarEvent[] = [];
            const weekDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const dayDate = new Date(year, month, i);
                const dayStr = format(dayDate, "yyyy-MM-dd");
                const dayOfWeek = weekDays[dayDate.getDay()];
                
                const override = monthOverrides.get(dayStr);
                const templateId = override?.templateId || defaultTemplateId;
                
                const template = templates.find(t => t.id === templateId);
                if (!template || !template.weeklySchedule) continue;

                const daySchedule = template.weeklySchedule[dayOfWeek as keyof WeeklySchedule] || [];

                daySchedule.forEach((training: any) => {
                    const startDateTime = parse(`${dayStr} ${training.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                    const endDateTime = parse(`${dayStr} ${training.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

                    allTemplateEvents.push({
                        id: `${training.id}-${dayStr}`,
                        title: `${training.teamName}`,
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
                where('start', '<=', Timestamp.fromMillis(lastDayOfMonth.getTime() + 86400000 - 1))
            );
            const customEventsSnapshot = await getDocs(customEventsQuery);
            const customEvents = customEventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));

            setEvents([...allTemplateEvents, ...customEvents]);
            
        } catch (error) {
            console.error("Error fetching calendar data:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del calendario."});
        } finally {
            setLoading(false);
        }
    };
    
    fetchCalendarData();
  }, [clubId, currentDate, defaultTemplateId, templates, toast]);
  
  
  const handleOpenModal = (mode: 'add' | 'edit', event?: Partial<CalendarEvent>) => {
    setModalMode(mode);
    if(mode === 'add' && selectedDays.size > 0) {
        const firstDay = Array.from(selectedDays)[0];
        const date = new Date(`${firstDay}T12:00:00`);
        setEventData({ start: Timestamp.fromDate(date), end: Timestamp.fromDate(date), color: EVENT_COLORS[0].value, type: "Evento" });
    } else {
        setEventData(event || { color: EVENT_COLORS[0].value, type: "Evento" });
    }
    setIsEventModalOpen(true);
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
        setIsEventModalOpen(false);
        setCurrentDate(new Date(currentDate)); // Trigger refetch
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
        setIsEventModalOpen(false);
        setCurrentDate(new Date(currentDate)); // Trigger refetch
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
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayStr = format(dayDate, "yyyy-MM-dd");

    const newSelectedDays = new Set(selectedDays);
    if (newSelectedDays.has(dayStr)) {
        newSelectedDays.delete(dayStr);
    } else {
        newSelectedDays.add(dayStr);
    }
    setSelectedDays(newSelectedDays);
  }

  const handleShowDayDetails = (day: number) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
    
    const dayEvents = events.filter(e => {
        const eventDate = e.start.toDate();
        return eventDate >= dayStart && eventDate <= dayEnd;
    }).sort((a, b) => a.start.toMillis() - b.start.toMillis());

    setSelectedDayDetails({ date: dayDate, events: dayEvents });
    setIsDayModalOpen(true);
  };


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
        setCurrentDate(new Date(currentDate)); // Trigger refetch
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
        setCurrentDate(new Date(currentDate)); // Trigger refetch
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo revertir la plantilla de los días seleccionados."});
    } finally {
        setIsUpdating(false);
    }
  }
  
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDayRaw = startOfMonth.getDay(); 
  const startDay = startDayRaw === 0 ? 6 : startDayRaw - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const placeholders = Array.from({ length: startDay }, (_, i) => i);
  
  const monthName = addMonths(startOfMonth, 1).toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
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
                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dayStr = format(dayDate, "yyyy-MM-dd");
                    const isSelected = selectedDays.has(dayStr);
                    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
                    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);

                    const dayEvents = events.filter(e => {
                        const eventDate = e.start.toDate();
                        return eventDate >= dayStart && eventDate <= dayEnd;
                    });
                    
                    const override = overrides.get(dayStr);
                    const defaultTemplateColor = templates.find(t => t.id === defaultTemplateId)?.color;
                    const dayColor = override?.color || defaultTemplateColor;
                    const dayBgClass = dayColor ? (TEMPLATE_BG_COLORS[dayColor] || 'bg-card') : 'bg-card';


                    return (
                    <div 
                        key={day} 
                        className={cn("p-1 min-h-[120px] flex flex-col gap-1 cursor-pointer transition-colors border-t border-l border-border relative", dayBgClass, { "ring-2 ring-primary ring-inset z-10": isSelected, "hover:bg-muted/50": !isSelected })}
                        onClick={() => handleDayClick(day)}
                        onDoubleClick={() => handleShowDayDetails(day)}
                    >
                        <span className="font-bold self-end text-sm pr-1">{day}</span>
                        {dayEvents.length > 0 && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary"></div>}
                        <Button variant="ghost" size="icon" className="absolute top-0.5 left-0.5 h-6 w-6" onClick={(e) => {e.stopPropagation(); handleShowDayDetails(day)}}><Eye className="h-3.5 w-3.5"/></Button>
                    </div>
                    )
                })}
            </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
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
                                    const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), oldDate.getHours(), oldDate.getMinutes());
                                    setEventData({ ...eventData, start: Timestamp.fromDate(newDate) });
                                } else if (date) {
                                     setEventData({ ...eventData, start: Timestamp.fromDate(date) });
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
                                    const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), oldDate.getHours(), oldDate.getMinutes());
                                    setEventData({...eventData, end: Timestamp.fromDate(newDate)});
                                } else if (date) {
                                     setEventData({ ...eventData, end: Timestamp.fromDate(date) });
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
                                newDate.setHours(Number(h), Number(m));
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
                                newDate.setHours(Number(h), Number(m));
                                setEventData({...eventData, end: Timestamp.fromDate(newDate)})
                            }
                        }}/>
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
                     <Button variant="secondary" onClick={handleDeleteEvent} disabled={isUpdating}>
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

    <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle className="capitalize">Eventos del {selectedDayDetails && format(selectedDayDetails.date, "eeee, d 'de' LLLL", { locale: es })}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                <div className="space-y-3">
                    {selectedDayDetails && selectedDayDetails.events.length > 0 ? (
                        selectedDayDetails.events.map(event => {
                            const separatorColor = EVENT_COLORS.find(c => c.value === event.color)?.hex || 'hsl(var(--primary))';
                            return (
                                <div key={event.id} className={cn("flex items-center gap-4 p-3 rounded-lg border", event.color)}>
                                    <div className="flex flex-col items-center w-16 md:w-20">
                                        <span className="font-bold text-sm md:text-base">{format(event.start.toDate(), 'HH:mm')}</span>
                                        <span className="text-xs text-muted-foreground">{format(event.end.toDate(), 'HH:mm')}</span>
                                    </div>
                                    <div style={{ backgroundColor: separatorColor }} className="h-10 w-1 rounded-full"></div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm md:text-base">{event.title}</p>
                                        {event.location && <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {event.location}</div>}
                                        {event.type && <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">{event.type === 'Entrenamiento' ? <UserSquare className="h-3.5 w-3.5"/> : <CalendarIcon className="h-3.5 w-3.5"/>} {event.type}</div>}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No hay eventos para este día.</p>
                    )}
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cerrar</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  )
}

const scheduleTabs = [
    { value: "editor", label: "Editor de Plantilla", icon: Edit },
    { value: "calendar", label: "Calendario de Eventos", icon: Calendar },
    { value: "preview", label: "Vista Semanal", icon: Eye },
];

export default function SchedulesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const scheduleViewsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ScheduleTemplate | null>(null);
  const [editedTemplateName, setEditedTemplateName] = useState("");
  
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: [],
  });

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const currentDay: DayOfWeek = daysOfWeek[currentDayIndex];
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);
  const [newVenueName, setNewVenueName] = useState('');

  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("23:00");
  const [templateColor, setTemplateColor] = useState<string>(TEMPLATE_COLORS[0].value);

  const [teams, setTeams] = useState<Team[]>([]);
  
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [currentTab, setCurrentTab] = useState("editor");
  
  const getScheduleRef = useCallback((templateId: string) => {
    if (!clubId || !templateId) return null;
    return doc(db, "clubs", clubId, "schedules", templateId);
  }, [clubId]);

  const loadTemplateData = useCallback((template: ScheduleTemplate) => {
    setVenues(template.venues || []);
    setWeeklySchedule(template.weeklySchedule || {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []});
    setStartTime(template.startTime || "16:00");
    setEndTime(template.endTime || "23:00");
    setTemplateColor(template.color || TEMPLATE_COLORS[0].value);
    setCurrentDayIndex(0); // Reset to Monday on template change
    setCurrentVenueIndex(0);
  }, []);

  const fetchAllData = useCallback(async (currentClubId: string, isRefresh: boolean = false) => {
    if(isRefresh) {
        setIsRefreshing(true);
    } else {
        setLoading(true);
    }
    try {
        const teamsCol = query(collection(db, "clubs", currentClubId, "teams"), orderBy("order"));
        const teamsSnapshot = await getDocs(teamsCol);
        const fetchedTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Team));
        setTeams(fetchedTeams);

        const schedulesCol = collection(db, "clubs", currentClubId, "schedules");
        const schedulesSnapshot = await getDocs(schedulesCol);

        if (schedulesSnapshot.empty) {
            const newTemplateId = "general";
            const newTemplateRef = doc(db, "clubs", currentClubId, "schedules", newTemplateId);
            const initialTemplateData: Omit<ScheduleTemplate, 'id'> = { 
                name: "Plantilla General",
                venues: [{id: 'main-field', name: 'Campo Principal'}],
                weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []},
                startTime: "16:00",
                endTime: "23:00",
                color: TEMPLATE_COLORS[0].value,
            };
            await setDoc(newTemplateRef, initialTemplateData);
            setScheduleTemplates([{ id: newTemplateId, ...initialTemplateData }]);
            setCurrentTemplateId(newTemplateId);
            loadTemplateData({ id: newTemplateId, ...initialTemplateData });
        } else {
            const templates = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleTemplate));
            setScheduleTemplates(templates);
            const templateToLoad = templates.find(t => t.id === currentTemplateId) || templates[0];
            if (templateToLoad) {
                setCurrentTemplateId(templateToLoad.id);
                loadTemplateData(templateToLoad);
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
        if(isRefresh) {
            setIsRefreshing(false);
        } else {
            setLoading(false);
        }
    }
  }, [currentTemplateId, toast, loadTemplateData]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const currentClubId = userData.clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchAllData(currentClubId);
          }
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchAllData]);

  const handleTemplateChange = (templateId: string) => {
    const newTemplate = scheduleTemplates.find(t => t.id === templateId);
    if (newTemplate) {
        setCurrentTemplateId(templateId);
        loadTemplateData(newTemplate);
    }
  };

  const handleAddVenue = async () => {
    if (newVenueName.trim() !== '' && clubId && currentTemplateId) {
        const newVenue = {id: crypto.randomUUID(), name: newVenueName.trim()};
        const updatedVenues = [...venues, newVenue];
        
        const scheduleRef = getScheduleRef(currentTemplateId);
        if (scheduleRef) {
            await updateDoc(scheduleRef, { venues: updatedVenues });
            setVenues(updatedVenues);
            setNewVenueName('');
            toast({ title: "Recinto/Pista añadido", description: "El nuevo recinto/pista se ha guardado." });
        }
    }
  }

  const handleRemoveVenue = async (id: string) => {
    if (!clubId || !currentTemplateId) return;
    const updatedVenues = venues.filter(v => v.id !== id);
    const scheduleRef = getScheduleRef(currentTemplateId);
    if (scheduleRef) {
        await updateDoc(scheduleRef, { venues: updatedVenues });
        setVenues(updatedVenues);
        toast({ title: "Recinto/Pista eliminado", description: "El recinto/pista se ha eliminado." });
    }
  }

  const handleSaveTemplate = async () => {
    if (!clubId || !currentTemplateId) return;

    const updatedWeeklySchedule = {
        ...weeklySchedule,
        [currentDay]: pendingAssignments,
    };

    const scheduleRef = getScheduleRef(currentTemplateId);
    if (scheduleRef) {
        try {
            await updateDoc(scheduleRef, { 
              weeklySchedule: updatedWeeklySchedule,
              startTime: startTime,
              endTime: endTime,
              color: templateColor,
            });
            setWeeklySchedule(updatedWeeklySchedule);
            toast({ title: "Plantilla Guardada", description: `Los horarios para el ${currentDay} se han guardado.` });
        } catch (error) {
            console.error("Error saving template:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la plantilla." });
        }
    }
  };

  const handleCreateTemplate = async () => {
    if (!clubId || !newTemplateName.trim()) return;

    const newTemplateId = newTemplateName.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().substring(0, 4);
    const newTemplateRef = doc(db, "clubs", clubId, "schedules", newTemplateId);
    
    try {
        await setDoc(newTemplateRef, {
            name: newTemplateName.trim(),
            venues: [],
            weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []},
            startTime: "16:00",
            endTime: "23:00",
            color: TEMPLATE_COLORS[0].value,
        });
        toast({ title: "Plantilla creada", description: `La plantilla "${newTemplateName}" ha sido creada.` });
        setIsNewTemplateModalOpen(false);
        setNewTemplateName("");
        if(clubId) fetchAllData(clubId);
    } catch (error) {
        console.error("Error creating template: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la plantilla." });
    }
  };

  const handleEditTemplateName = async () => {
    if (!clubId || !currentTemplateId || !editedTemplateName.trim()) return;
    const scheduleRef = getScheduleRef(currentTemplateId);
    try {
      if(scheduleRef){
        await updateDoc(scheduleRef, { name: editedTemplateName.trim() });
        toast({ title: "Plantilla actualizada", description: `El nombre de la plantilla se ha actualizado.` });
        setIsEditTemplateModalOpen(false);
        setEditedTemplateName("");
        if(clubId) fetchAllData(clubId);
      }
    } catch (error) {
      console.error("Error updating template name:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el nombre." });
    }
  };
  
  const handleDeleteTemplate = async () => {
    if (!clubId || !templateToDelete) return;
    try {
        await deleteDoc(doc(db, "clubs", clubId, "schedules", templateToDelete.id));
        toast({ title: "Plantilla eliminada", description: "La plantilla ha sido eliminada." });
        setTemplateToDelete(null);
        setCurrentTemplateId(null); // Reset current template
        if(clubId) fetchAllData(clubId);
    } catch (error) {
        console.error("Error deleting template:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la plantilla." });
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
        setCurrentDayIndex((prev) => (prev + 1) % daysOfWeek.length);
    } else {
        setCurrentDayIndex((prev) => (prev - 1 + daysOfWeek.length) % daysOfWeek.length);
    }
  };

  const navigateVenue = (direction: 'prev' | 'next') => {
    if (!venues.length) return;
    if (direction === 'next') {
        setCurrentVenueIndex((prev) => (prev + 1) % venues.length);
    } else {
        setCurrentVenueIndex((prev) => (prev - 1 + venues.length) % venues.length);
    }
  };

  const handleUpdateAssignment = (id: string, field: keyof Assignment, value: string) => {
    setPendingAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  
  const handleAssignmentSelectChange = (id: string, field: 'teamId' | 'venueId', value: string) => {
    const nameField = field === 'teamId' ? 'teamName' : 'venueName';
    const selectedItem = field === 'teamId' ? teams.find(t => t.id === value) : venues.find(v => v.id === value);
    const name = selectedItem?.name || '';
    
    setPendingAssignments(prev => prev.map(a => {
        if (a.id === id) {
            const updatedAssignment: any = { ...a, [field]: value };
            if (nameField) {
                updatedAssignment[nameField] = name;
            }
            return updatedAssignment;
        }
        return a;
    }));
  };

  const handleAddAssignmentRow = () => {
    setPendingAssignments(prev => [...prev, {
      id: crypto.randomUUID(),
      teamId: '',
      teamName: '',
      startTime: '',
      endTime: '',
      venueId: '',
      venueName: '',
    }]);
  };

  const handleRemoveAssignment = (id: string) => {
    setPendingAssignments(prev => prev.filter(a => a.id !== id));
  };
  
  useEffect(() => {
    setPendingAssignments(weeklySchedule[currentDay] || []);
  }, [currentDay, weeklySchedule]);

  const timeSlots = useMemo(() => {
    const slots = [];
    if (!startTime || !endTime) return [];
    let current = new Date(`1970-01-01T${startTime}:00`);
    const endDate = new Date(`1970-01-01T${endTime}:00`);
    while (current < endDate) {
      slots.push(current.toTimeString().substring(0, 5));
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
    return slots;
  }, [startTime, endTime]);

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const processOverlaps = (events: DailyScheduleEntry[]) => {
      if (!events || events.length === 0) return [];
  
      const sortedEvents = events
        .filter(e => e.startTime && e.endTime)
        .map(e => ({
          ...e,
          start: timeToMinutes(e.startTime),
          end: timeToMinutes(e.endTime),
        }))
        .sort((a, b) => a.start - b.start || a.end - b.end);
  
      let eventLayouts: (DailyScheduleEntry & { start: number; end: number; col: number; numCols: number })[] = [];

      for(const event of sortedEvents) {
          let col = 0;
          let overlaps = eventLayouts.filter(e => 
              Math.max(event.start, e.start) < Math.min(event.end, e.end)
          );

          let colNumbers = overlaps.map(e => e.col);
          while(colNumbers.includes(col)) {
              col++;
          }
          
          eventLayouts.push({ ...event, col, numCols: 1 });
      }

      for (let i = 0; i < eventLayouts.length; i++) {
        let overlappingGroup = [eventLayouts[i]];
        for (let j = 0; j < eventLayouts.length; j++) {
            if (i === j) continue;
            if (Math.max(eventLayouts[i].start, eventLayouts[j].start) < Math.min(eventLayouts[i].end, eventLayouts[j].end)) {
              let isAlreadyInGroup = overlappingGroup.some(groupedEvent => groupedEvent.id === eventLayouts[j].id);
              if (!isAlreadyInGroup) {
                 overlappingGroup.push(eventLayouts[j]);
              }
            }
        }
        if (overlappingGroup.length > 1) {
          const maxCols = overlappingGroup.length;
          overlappingGroup.forEach(eventInGroup => {
            const layoutEvent = eventLayouts.find(e => e.id === eventInGroup.id);
            if (layoutEvent) {
              layoutEvent.numCols = maxCols;
            }
          });
        }
      }

      return eventLayouts;
  };
  
  const calculateEventPosition = (event: any) => {
    if (!startTime) return { top: 0, height: 0, left: '0%', width: '100%' };
    
    const gridStartMinutes = timeToMinutes(startTime);
    const eventStartMinutes = timeToMinutes(event.startTime);
    const eventEndMinutes = timeToMinutes(event.endTime);

    const startOffsetMinutes = eventStartMinutes - gridStartMinutes;
    const durationMinutes = eventEndMinutes - eventStartMinutes;
    
    const hourHeight = 80; 
    const top = (startOffsetMinutes / 60) * hourHeight;
    const height = (durationMinutes / 60) * hourHeight;
    
    const width = 100 / event.numCols;
    const left = event.col * width;
    return { 
        top, 
        height, 
        left: `${left}%`, 
        width: `calc(${width}% - 4px)`
    };
  };
  
    const handleDownloadPdf = async () => {
    const template = displayTemplate;
    if (!template) return;

    setIsDownloading(true);
    try {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
        });
        
        let isFirstPage = true;

        for (let i = 0; i < template.venues.length; i++) {
            const venueElement = scheduleViewsRef.current[i];
            if (venueElement) {
                const canvas = await html2canvas(venueElement, { 
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: 'hsl(var(--background))' 
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

                if (!isFirstPage) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
                isFirstPage = false;
            }
        }
        
        pdf.save('horario-semanal.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: "Error al generar PDF",
            description: "No se pudo crear el archivo PDF. Inténtalo de nuevo."
        });
    } finally {
        setIsDownloading(false);
    }
  };

  const displayTemplate = useMemo(() => {
    if (!currentTemplateId) return undefined;
    
    const baseTemplate = scheduleTemplates.find(t => t.id === currentTemplateId);
    if (!baseTemplate) return undefined;

    // Create a deep copy to avoid direct state mutation
    const newTemplate = JSON.parse(JSON.stringify(baseTemplate));

    // Overwrite the current day's schedule with pending changes
    newTemplate.weeklySchedule[currentDay] = pendingAssignments;
    
    return newTemplate;
  }, [currentTemplateId, scheduleTemplates, currentDay, pendingAssignments]);


  const currentVenue = displayTemplate?.venues && displayTemplate.venues.length > 0 ? displayTemplate.venues[currentVenueIndex] : null;

  const displayedEvents = useMemo(() => {
    if (!displayTemplate || !currentVenue) return [];
    
    const dailyEvents = displayTemplate.weeklySchedule[currentDay];
    if (!dailyEvents) return [];
    
    const venueEvents = dailyEvents.filter(event => event.venueId === currentVenue.id);
    return processOverlaps(venueEvents);
  }, [displayTemplate, currentDay, currentVenue]);


  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 h-full">
       <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Planificación y Horarios</h1>
          <p className="text-muted-foreground">
            Crea plantillas, gestiona eventos y visualiza el calendario de tu club.
          </p>
        </div>
      <Card>
        <CardHeader className="border-b">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Dialog open={isNewTemplateModalOpen} onOpenChange={setIsNewTemplateModalOpen}>
                    <Dialog open={isEditTemplateModalOpen} onOpenChange={setIsEditTemplateModalOpen}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Plantilla: {displayTemplate?.name || "Seleccionar"}
                                <MoreVertical className="ml-2 h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                            <DropdownMenuRadioGroup value={currentTemplateId || ''} onValueChange={handleTemplateChange}>
                                {scheduleTemplates.map(template => (
                                    <DropdownMenuRadioItem key={template.id} value={template.id}>{template.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setIsNewTemplateModalOpen(true);
                                }}>
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Crear Plantilla
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setEditedTemplateName(displayTemplate?.name || "");
                                    setIsEditTemplateModalOpen(true);
                                }} disabled={!currentTemplateId}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Renombrar
                                </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setTemplateToDelete(displayTemplate || null)} disabled={!currentTemplateId}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Eliminar
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Renombrar Plantilla</DialogTitle>
                                <DialogDescription>Introduce un nuevo nombre para la plantilla "{displayTemplate?.name}".</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label htmlFor="edit-template-name">Nuevo Nombre</Label>
                                <Input id="edit-template-name" value={editedTemplateName} onChange={(e) => setEditedTemplateName(e.target.value)} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                                <Button onClick={handleEditTemplateName}>Guardar Cambios</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Plantilla de Horarios</DialogTitle>
                            <DialogDescription>Introduce un nombre para tu nueva plantilla.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="new-template-name">Nombre de la Plantilla</Label>
                            <Input id="new-template-name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                            <Button onClick={handleCreateTemplate}>Crear Plantilla</Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>
                    <Button onClick={() => clubId && fetchAllData(clubId, true)} variant="outline" size="icon" disabled={isRefreshing}>
                        {isRefreshing ? ( <RefreshCw className="h-4 w-4 animate-spin" /> ) : ( <RefreshCw className="h-4 w-4" /> )}
                    </Button>
                    <Button onClick={handleDownloadPdf} variant="outline" size="icon" disabled={isDownloading}>
                        {isDownloading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Download className="h-4 w-4" /> )}
                    </Button>
                </div>
            </div>
        </CardHeader>
      </Card>
      
       <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex flex-col flex-grow">
          <div className="sm:hidden mb-4">
            <Select value={currentTab} onValueChange={setCurrentTab}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar vista..." />
              </SelectTrigger>
              <SelectContent>
                {scheduleTabs.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:inline-flex">
              {scheduleTabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}><tab.icon className="mr-2 h-4 w-4" />{tab.label}</TabsTrigger>
              ))}
          </TabsList>

        <TabsContent value="editor" className="pt-4 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[420px_1fr] gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Configuración de Horarios</CardTitle>
                      <CardDescription>Define recintos/pistas, rango horario y asigna tiempos a tus equipos para el <span className="font-semibold">{currentDay}</span>.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                      <Accordion type="multiple" className="w-full" defaultValue={['assignments']}>
                        <AccordionItem value="settings">
                          <AccordionTrigger className="text-base font-semibold">
                            <div className="flex items-center gap-2">
                              <Settings className="h-5 w-5" />
                              Configuración General
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Color de la Plantilla</Label>
                                <div className="flex flex-wrap gap-2">
                                    {TEMPLATE_COLORS.map(color => (
                                        <button
                                            key={color.name}
                                            onClick={() => setTemplateColor(color.value)}
                                            className={cn("h-8 w-8 rounded-full border-2 transition-transform", templateColor === color.value ? 'border-ring scale-110' : 'border-transparent')}
                                            style={{backgroundColor: color.value}}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Recintos/Pistas de Entrenamiento</Label>
                              <div className="flex items-center gap-2">
                                  <Input placeholder="Nombre del nuevo recinto/pista" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} />
                                  <Button onClick={handleAddVenue} size="sm"><PlusCircle className="h-4 w-4"/></Button>
                              </div>
                              <div className="space-y-2">
                                  {venues.map(venue => (
                                      <div key={venue.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                                          <span>{venue.name}</span>
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveVenue(venue.id)}>
                                              <Trash2 className="h-4 w-4 text-destructive"/>
                                          </Button>
                                      </div>
                                  ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start-time">Hora de Inicio</Label>
                                    <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end-time">Hora de Fin</Label>
                                    <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="assignments">
                          <AccordionTrigger className="text-base font-semibold">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5" />
                              Asignaciones para el {currentDay}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 space-y-4">
                            <div className="space-y-4">
                              {pendingAssignments.map(assignment => (
                                <div key={assignment.id} className="flex items-end gap-2 p-3 rounded-lg border bg-card shadow-sm">
                                    <div className="grid grid-cols-1 gap-2 flex-1">
                                      <div className="space-y-1">
                                        <Label className="text-xs">Equipo</Label>
                                        <Select value={assignment.teamId} onValueChange={(value) => handleAssignmentSelectChange(assignment.id, 'teamId', value)}>
                                          <SelectTrigger className="h-8"><SelectValue placeholder="Equipo" /></SelectTrigger>
                                          <SelectContent>
                                            {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Recinto/Pista</Label>
                                        <Select value={assignment.venueId} onValueChange={(value) => handleAssignmentSelectChange(assignment.id, 'venueId', value)}>
                                          <SelectTrigger className="h-8"><SelectValue placeholder="Recinto/Pista" /></SelectTrigger>
                                          <SelectContent>
                                            {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex gap-2">
                                        <div className="space-y-1 w-full">
                                          <Label className="text-xs">Inicio</Label>
                                          <Input type="time" value={assignment.startTime} onChange={(e) => handleUpdateAssignment(assignment.id, 'startTime', e.target.value)} className="h-8" />
                                        </div>
                                        <div className="space-y-1 w-full">
                                          <Label className="text-xs">Fin</Label>
                                          <Input type="time" value={assignment.endTime} onChange={(e) => handleUpdateAssignment(assignment.id, 'endTime', e.target.value)} className="h-8" />
                                        </div>
                                      </div>
                                    </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveAssignment(assignment.id)}>
                                    <Trash className="h-4 w-4 text-destructive"/>
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <Button variant="outline" className="w-full" onClick={handleAddAssignmentRow}>
                              <PlusCircle className="mr-2 h-4 w-4"/>
                              Añadir Asignación
                            </Button>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                  </CardContent>
              </Card>
              
              <Card className="sticky top-6 self-start flex flex-col lg:col-span-2 xl:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10 border-b">
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDay('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                          <div className="text-base font-semibold capitalize w-24 text-center">{currentDay}</div>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDay('next')}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateVenue('prev')} disabled={venues.length < 2}><ChevronLeft className="h-4 w-4" /></Button>
                          <div className="text-base font-semibold capitalize w-32 text-center truncate">{currentVenue?.name || "Sin Recintos/Pistas"}</div>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateVenue('next')} disabled={venues.length < 2}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow p-0">
                    <div className="relative overflow-x-auto">
                        <div className="grid grid-cols-[60px_1fr]">
                            <div className="col-start-1 col-end-2 border-r">
                                {timeSlots.map(time => (
                                    <div key={time} className="h-[80px] relative">
                                       <span className="text-xs font-semibold text-muted-foreground absolute -top-2.5 right-2">{time}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="col-start-2 col-end-3 relative">
                                {timeSlots.map((time, index) => (
                                    <div key={index} className="h-[80px] border-b"></div>
                                ))}
                                {displayedEvents.map(event => {
                                  const { top, height, left, width } = calculateEventPosition(event);
                                  return (
                                      <div
                                        key={event.id}
                                        className="absolute p-2 flex flex-col rounded-lg border text-primary bg-primary/20 border-primary/50"
                                        style={{ top, height, left, width }}
                                      >
                                          <span className="font-bold text-sm truncate">{event.teamName}</span>
                                          <span className="text-xs opacity-90 truncate flex items-center gap-1"><MapPin className="h-3 w-3"/>{event.venueName}</span>
                                          <span className="text-xs opacity-90 truncate flex items-center gap-1 mt-auto"><Hourglass className="h-3 w-3"/>{event.startTime} - {event.endTime}</span>
                                      </div>
                                  )
                                })}
                            </div>
                        </div>
                    </div>
                  </CardContent>
                  <div className="p-6 border-t">
                      <Button size="lg" className="w-full gap-2" onClick={handleSaveTemplate}>
                          <Clock className="h-5 w-5"/>
                          Guardar Plantilla
                      </Button>
                  </div>
              </Card>
          </div>
        </TabsContent>
         <TabsContent value="calendar" className="pt-4">
          <CalendarView />
        </TabsContent>
        <TabsContent value="preview" className="pt-0 overflow-auto flex-grow">
             <WeeklyScheduleView 
                template={displayTemplate} 
                innerRef={el => {
                    if (el && displayTemplate?.venues) {
                      // This ref is now for the container of all venue schedules
                    }
                }}
            />
        </TabsContent>
      </Tabs>


       <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la plantilla "{templateToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}



    