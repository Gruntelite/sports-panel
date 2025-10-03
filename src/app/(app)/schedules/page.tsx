
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  MapPin,
  Clock,
  User,
  Shield,
  Calendar as CalendarIcon,
  Repeat,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Team, CalendarEvent, Coach } from "@/lib/types";
import { DatePicker } from "@/components/ui/date-picker";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addDays,
  addWeeks,
  differenceInMilliseconds,
} from "date-fns";
import { es, ca } from "date-fns/locale";
import { useTranslation } from "@/components/i18n-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from 'uuid';

const EVENT_TYPES = [
    { value: 'Entrenamiento', label: 'Entrenamiento', color: 'bg-blue-500/20 text-blue-700 border-blue-500/50', icon: Shield },
    { value: 'Partido', label: 'Partido', color: 'bg-red-500/20 text-red-700 border-red-500/50', icon: CalendarIcon },
    { value: 'Evento', label: 'Evento', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50', icon: User },
    { value: 'Otro', label: 'Otro', color: 'bg-gray-500/20 text-gray-700 border-gray-500/50', icon: PlusCircle },
];

const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const calculateEventPosition = (event: CalendarEvent) => {
    const gridStartHour = 0; 
    const eventStart = event.start.toDate();
    const eventEnd = event.end.toDate();

    const startOffsetMinutes = (eventStart.getHours() - gridStartHour) * 60 + eventStart.getMinutes();
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);

    const hourHeight = 80;
    const top = (startOffsetMinutes / 60) * hourHeight + 64; 
    const height = (durationMinutes / 60) * hourHeight;

    return { top, height: Math.max(height, 40) }; // Minimum height
};


export default function SchedulesPage() {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [eventData, setEventData] = useState<Partial<CalendarEvent & { repeat?: 'none' | 'daily' | 'weekly', repeatUntil?: Date }>>({});
  
  const [eventToDelete, setEventToDelete] = useState<{event: CalendarEvent, type: 'single' | 'all' | 'future' | null} | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);


  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [view, setView] = useState<'week' | 'day'>('week');

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  
  const dayToShow = view === 'day' ? [currentDate] : weekDays;

  const filteredEvents = useMemo(() => {
    let visibleEvents = events;
    
    const exceptions = events.filter(e => e.recurrenceException);
    visibleEvents = visibleEvents.filter(event => {
      if (!event.recurrenceId) return true; 
      const hasException = exceptions.some(ex => 
        ex.recurrenceId === event.recurrenceId && 
        isSameDay(ex.recurrenceException!.toDate(), event.start.toDate())
      );
      return !hasException;
    });

    if(eventTypeFilter === 'all') return visibleEvents;
    return visibleEvents.filter(event => event.type === eventTypeFilter);
  }, [events, eventTypeFilter]);


  const fetchData = useCallback(async (currentClubId: string) => {
    setLoading(true);
    try {
        const teamsQuery = query(collection(db, "clubs", currentClubId, "teams"));
        const teamsSnapshot = await getDocs(teamsQuery);
        setTeams(teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
        
        const coachesQuery = query(collection(db, "clubs", currentClubId, "coaches"));
        const coachesSnapshot = await getDocs(coachesQuery);
        setCoaches(coachesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coach)));

        const firstDay = startOfWeek(currentDate, { weekStartsOn: 1 });
        const lastDay = endOfWeek(currentDate, { weekStartsOn: 1 });

        const eventsQuery = query(collection(db, "clubs", currentClubId, "calendarEvents"),
            where('start', '>=', firstDay),
            where('start', '<=', lastDay)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        setEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent)));
    } catch (error) {
        console.error("Error fetching schedule data:", error);
        toast({ variant: "destructive", title: t('common.error'), description: "No se pudieron cargar los datos del horario." });
    }
    setLoading(false);
  }, [toast, currentDate, t]);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setView('day');
        } else {
            setView('week');
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        getDoc(doc(db, "users", user.uid)).then(userDoc => {
          if (userDoc.exists()) {
            const id = userDoc.data().clubId;
            setClubId(id);
            fetchData(id);
          }
        });
      }
    });
    return () => unsubscribe();
  }, [fetchData]);
  
  const changeDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        if (view === 'week') {
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -7));
        }
        return newDate;
    });
  };

  const handleOpenModal = (mode: 'add' | 'edit', event?: CalendarEvent) => {
    setModalMode(mode);
    if (event) {
        let eventToOpen: Partial<CalendarEvent & { repeat?: 'none' | 'daily' | 'weekly', repeatUntil?: Date }> = { 
            ...event,
            start: event.start.toDate(), 
            end: event.end.toDate(),
            repeat: 'none' // Default to none, can be determined later if needed
        };
        // Simple check to infer recurrence, avoids complex queries
        if (event.recurrenceId) {
             const seriesEvents = events.filter(e => e.recurrenceId === event.recurrenceId).sort((a,b) => a.start.seconds - b.start.seconds);
             if (seriesEvents.length > 1) {
                const firstEvent = seriesEvents[0].start.toDate();
                const secondEvent = seriesEvents[1].start.toDate();
                const dayDiff = Math.round(differenceInMilliseconds(secondEvent, firstEvent) / (1000 * 60 * 60 * 24));
                 if (dayDiff === 1) eventToOpen.repeat = 'daily';
                 else if (dayDiff === 7) eventToOpen.repeat = 'weekly';
             }
        }
        setEventData(eventToOpen);
    } else {
        setEventData({ 
            type: 'Evento',
            color: EVENT_TYPES[2].color,
            start: new Date(), 
            end: new Date(),
            repeat: 'none',
            repeatUntil: undefined,
        });
    }
    setIsModalOpen(true);
};
  
  const handleTimeslotClick = (day: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date(day);
    startDate.setHours(hours, minutes);
    
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    setModalMode('add');
    setEventData({
        type: 'Evento',
        color: EVENT_TYPES[2].color,
        start: startDate,
        end: endDate,
        repeat: 'none',
        repeatUntil: undefined,
    });
    setIsModalOpen(true);
  };

const handleSaveEvent = async () => {
    if (modalMode === 'edit' && eventData.recurrenceId) {
        setSaveConfirmationOpen(true);
    } else {
        await executeSave('single');
    }
};

const executeSave = async (saveType: 'single' | 'future') => {
    if (!clubId || !eventData.title || !eventData.start || !eventData.end) {
      toast({ variant: "destructive", title: t('common.error'), description: "El título y las fechas son obligatorios." });
      return;
    }
    setSaving(true);
    setSaveConfirmationOpen(false);

    try {
        const batch = writeBatch(db);
        const originalStartDate = eventData.id ? (await getDoc(doc(db, "clubs", clubId, "calendarEvents", eventData.id))).data()?.start.toDate() : eventData.start as Date;

        let recurrenceId = eventData.recurrenceId;
        if (modalMode === 'add' && eventData.repeat !== 'none') {
            recurrenceId = uuidv4();
        }
        
        const baseEvent: Partial<CalendarEvent> = { ...eventData, recurrenceId: recurrenceId || undefined };
        delete (baseEvent as any).id;
        delete (baseEvent as any).repeat;
        delete (baseEvent as any).repeatUntil;
        
        if (modalMode === 'edit' && eventData.id) {
            if (saveType === 'future' && recurrenceId) {
                const seriesQuery = query(collection(db, "clubs", clubId, "calendarEvents"), 
                    where('recurrenceId', '==', recurrenceId),
                    where('start', '>=', Timestamp.fromDate(originalStartDate))
                );
                const snapshot = await getDocs(seriesQuery);
                snapshot.forEach(doc => batch.delete(doc.ref));

            } else if (saveType === 'single') {
                 if (recurrenceId) {
                    const originalEventRef = doc(db, "clubs", clubId, "calendarEvents", eventData.id);
                    batch.update(originalEventRef, { recurrenceException: eventData.start });
                    
                    const newEventData = {
                        ...baseEvent,
                        start: Timestamp.fromDate(eventData.start as Date),
                        end: Timestamp.fromDate(eventData.end as Date),
                        recurrenceId: null, 
                        recurrenceException: null,
                    };
                    const newExceptionRef = doc(collection(db, "clubs", clubId, "calendarEvents"));
                    batch.set(newExceptionRef, newEventData);

                 } else { // It's not a recurring event, just update it
                    const eventRef = doc(db, "clubs", clubId, "calendarEvents", eventData.id);
                    batch.update(eventRef, { ...baseEvent, start: Timestamp.fromDate(eventData.start as Date), end: Timestamp.fromDate(eventData.end as Date) });
                }
                 await batch.commit();
                 toast({ title: "Evento actualizado" });
                 setIsModalOpen(false);
                 if (clubId) fetchData(clubId);
                 setSaving(false);
                 return;
            }
        }
        
        let currentDate = new Date(eventData.start as Date);
        const repeatUntilDate = eventData.repeatUntil;

        if (eventData.repeat !== 'none' && (saveType === 'future' || modalMode === 'add')) {
            const durationMs = (eventData.end as Date).getTime() - (eventData.start as Date).getTime();
            while (!repeatUntilDate || currentDate <= repeatUntilDate) {
                const newStart = new Date(currentDate);
                const newEnd = new Date(newStart.getTime() + durationMs);

                const newDocRef = doc(collection(db, "clubs", clubId, "calendarEvents"));
                batch.set(newDocRef, { ...baseEvent, start: Timestamp.fromDate(newStart), end: Timestamp.fromDate(newEnd), recurrenceId: recurrenceId || undefined });
                
                if (eventData.repeat === 'daily') {
                    currentDate = addDays(currentDate, 1);
                } else if (eventData.repeat === 'weekly') {
                    currentDate = addWeeks(currentDate, 1);
                } else {
                    break;
                }
                if (!repeatUntilDate) break; // Avoid infinite loop if no end date
            }
        } else {
             const newDocRef = doc(collection(db, "clubs", clubId, "calendarEvents"));
            batch.set(newDocRef, { ...baseEvent, start: Timestamp.fromDate(eventData.start as Date), end: Timestamp.fromDate(eventData.end as Date) });
        }


      await batch.commit();

      toast({ title: "Evento(s) guardado(s)" });
      setIsModalOpen(false);
      
      if (clubId) fetchData(clubId);

    } catch(e) {
      console.error(e);
      toast({ variant: "destructive", title: t('common.error'), description: "No se pudo guardar el evento." });
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteEvent = async (deleteType: 'single' | 'future' | 'all') => {
    if (!clubId || !eventToDelete) return;
    
    setDeleteConfirmationOpen(false);
    setSaving(true);

    try {
        const batch = writeBatch(db);
        if (deleteType === 'all' && eventToDelete.event.recurrenceId) {
            const seriesQuery = query(collection(db, "clubs", clubId, "calendarEvents"), where('recurrenceId', '==', eventToDelete.event.recurrenceId));
            const snapshot = await getDocs(seriesQuery);
            snapshot.forEach(doc => batch.delete(doc.ref));
        } else if (deleteType === 'future' && eventToDelete.event.recurrenceId) {
            const seriesQuery = query(collection(db, "clubs", clubId, "calendarEvents"), 
                where('recurrenceId', '==', eventToDelete.event.recurrenceId),
                where('start', '>=', eventToDelete.event.start)
            );
            const snapshot = await getDocs(seriesQuery);
            snapshot.forEach(doc => batch.delete(doc.ref));
        } else { 
             if (eventToDelete.event.recurrenceId) {
                batch.update(doc(db, "clubs", clubId, "calendarEvents", eventToDelete.event.id), {
                    recurrenceException: eventToDelete.event.start
                });
             } else {
                batch.delete(doc(db, "clubs", clubId, "calendarEvents", eventToDelete.event.id));
             }
        }
        await batch.commit();

        toast({ title: "Evento(s) eliminado(s)" });
        if(clubId) fetchData(clubId);

    } catch(e) {
        console.error(e);
        toast({ variant: "destructive", title: t('common.error'), description: "No se pudo eliminar el evento." });
    } finally {
        setSaving(false);
        setEventToDelete(null);
    }
  };
  
    const handleEventTypeChange = (type: string) => {
        const eventType = EVENT_TYPES.find(et => et.value === type);
        setEventData(prev => ({...prev, type: type as CalendarEvent['type'], color: eventType?.color || '' }));
    }

    const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const dailyEventsWithLayout = useMemo(() => {
        const daily = new Map<string, any[]>();
        const daysToProcess = view === 'day' ? [currentDate] : weekDays;
        
        daysToProcess.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const eventsForDay = filteredEvents
                .filter(event => isSameDay(event.start.toDate(), day))
                .sort((a, b) => a.start.seconds - b.start.seconds);

            const processedEvents: any[] = [];

            eventsForDay.forEach((event, index) => {
                let overlaps = 0;
                let maxOverlaps = 1;
                
                for (let i = 0; i < processedEvents.length; i++) {
                    const otherEvent = processedEvents[i];
                    if (
                        (event.start.seconds < otherEvent.end.seconds && event.end.seconds > otherEvent.start.seconds)
                    ) {
                        otherEvent.maxOverlaps = Math.max(otherEvent.maxOverlaps, maxOverlaps + 1);
                        maxOverlaps = Math.max(maxOverlaps, otherEvent.maxOverlaps);
                        if (otherEvent.overlaps <= overlaps) {
                           overlaps = otherEvent.overlaps + 1;
                        }
                    }
                }
                
                processedEvents.push({
                    ...event,
                    ...calculateEventPosition(event),
                    overlaps: overlaps,
                    maxOverlaps: maxOverlaps
                });

                for (let i = 0; i < processedEvents.length - 1; i++) {
                    const otherEvent = processedEvents[i];
                    if (
                       (event.start.seconds < otherEvent.end.seconds && event.end.seconds > otherEvent.start.seconds)
                    ) {
                        otherEvent.maxOverlaps = Math.max(otherEvent.maxOverlaps, maxOverlaps);
                    }
                }
            });
            
            const finalLayout = processedEvents.map(event => ({
                ...event,
                layout: {
                    top: event.top,
                    height: event.height,
                    width: `${100 / event.maxOverlaps}%`,
                    left: `${(100 / event.maxOverlaps) * event.overlaps}%`,
                }
            }))
            
            daily.set(dayKey, finalLayout);
        });
        return daily;
    }, [filteredEvents, weekDays, view, currentDate]);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
         <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b gap-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeDate('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-bold whitespace-nowrap capitalize">
                      {view === 'week' ? 
                        `${format(weekDays[0], 'd')} - ${format(weekDays[6], 'd ')} de ${format(currentDate, 'MMMM, yyyy', { locale: locale === 'ca' ? ca : es })}` :
                        format(currentDate, "d 'de' MMMM, yyyy", { locale: locale === 'ca' ? ca : es })
                      }
                    </h2>
                    <Button variant="outline" size="icon" onClick={() => changeDate('next')}>
                    <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                 <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setCurrentDate(new Date())}>
                    {t('schedules.calendar.today')}
                </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
                 <Button variant="outline" className="w-full sm:hidden" onClick={() => setCurrentDate(new Date())}>
                    {t('schedules.calendar.today')}
                </Button>
                 <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filtrar por tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tots els Esdeveniments</SelectItem>
                        {EVENT_TYPES.map(type => (
                           <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
               <Button onClick={() => handleOpenModal('add')} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Afegir Esdeveniment
                </Button>
            </div>
        </div>
        
        <div className="md:hidden flex justify-around border-b">
            {weekDays.map(day => (
                <Button key={day.toString()} variant={isSameDay(day, currentDate) ? 'secondary' : 'ghost'} size="sm" onClick={() => setCurrentDate(day)}>
                    {format(day, 'EEE', { locale: locale === 'ca' ? ca : es })}
                </Button>
            ))}
        </div>


        <div className="flex-grow overflow-auto">
          <div className={cn("grid", view === 'week' ? 'grid-cols-[60px_1fr]' : 'grid-cols-[60px_1fr]')}>
            <div className="col-start-1 col-end-2 border-r">
                <div className="sticky top-0 bg-background z-10 h-16"></div>
                {timeSlots.map(time => (
                    <div key={time} className="h-[80px] relative text-right pr-2 border-t">
                        <span className="text-xs font-semibold text-muted-foreground absolute -top-2 right-2">{time}</span>
                    </div>
                ))}
            </div>
            <div className={cn("col-start-2 col-end-3 grid relative", view === 'week' ? 'grid-cols-7' : 'grid-cols-1')}>
                {dayToShow.map((day, dayIndex) => {
                     const dayKey = format(day, 'yyyy-MM-dd');
                     const dayEvents = dailyEventsWithLayout.get(dayKey) || [];
                     return (
                        <div key={day.toString()} className={cn("relative border-r", view === 'week' && dayIndex === 6 && "border-r-0")}>
                             <div className="hidden md:block sticky top-0 bg-background z-10 text-center p-2 h-16 border-b">
                                <span className="text-sm font-medium text-muted-foreground">{format(day, 'EEE', { locale: locale === 'ca' ? ca : es })}</span>
                                <p className={cn("text-2xl font-bold", isSameDay(day, new Date()) && "text-primary")}>{format(day, 'd')}</p>
                            </div>
                            {timeSlots.map(time => <div key={time} className="h-[80px] border-t cursor-pointer" onClick={() => handleTimeslotClick(day, time)}></div>)}
                            
                            {dayEvents.map(event => {
                                 return (
                                     <div 
                                        key={event.id}
                                        className={cn("absolute p-2 rounded-lg border flex flex-col cursor-pointer hover:ring-2 hover:ring-primary break-words", event.color)}
                                        style={{ top: `${event.layout.top}px`, height: `${event.layout.height}px`, width: event.layout.width, left: event.layout.left }}
                                        onClick={() => handleOpenModal('edit', event)}
                                     >
                                        <h4 className="font-semibold text-xs leading-tight">{event.title}</h4>
                                        <div className="text-[10px] space-y-0.5 mt-1">
                                            <div className="flex items-center gap-1"><Clock className="h-2.5 w-2.5"/> {format(event.start.toDate(), 'HH:mm')} - {format(event.end.toDate(), 'HH:mm')}</div>
                                            {event.location && <div className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5"/> {event.location}</div>}
                                        </div>
                                     </div>
                                 );
                            })}
                        </div>
                    )
                })}
            </div>
          </div>
        </div>
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? 'Afegir Nou Esdeveniment' : 'Editar Esdeveniment'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="event-title">Títol de l'esdeveniment</Label>
                    <Input id="event-title" value={eventData.title || ''} onChange={(e) => setEventData({...eventData, title: e.target.value})}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Tipus d'Esdeveniment</Label>
                        <Select value={eventData.type} onValueChange={handleEventTypeChange}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {EVENT_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Repetició</Label>
                        <Select value={eventData.repeat || 'none'} onValueChange={(value: 'none' | 'daily' | 'weekly') => setEventData(prev => ({...prev, repeat: value}))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No es repeteix</SelectItem>
                                <SelectItem value="daily">Cada dia</SelectItem>
                                <SelectItem value="weekly">Cada setmana</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label>Data de l'esdeveniment</Label>
                        <DatePicker date={eventData.start instanceof Date ? eventData.start : undefined} onDateChange={(date) => {
                            if (date) {
                                const newStart = new Date(eventData.start as Date);
                                newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                const newEnd = new Date(eventData.end as Date);
                                newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                setEventData({...eventData, start: newStart, end: newEnd})
                            }
                        }} />
                    </div>
                    <div className="space-y-2">
                        <Label>Hora d'inici</Label>
                        <Input type="time" value={eventData.start ? format(eventData.start as Date, 'HH:mm') : ''} onChange={(e) => { if(eventData.start) { const [h,m] = e.target.value.split(':'); const newDate = new Date(eventData.start as Date); newDate.setHours(Number(h), Number(m)); setEventData({...eventData, start: newDate})}}}/>
                    </div>
                     <div className="space-y-2">
                        <Label>Hora de fi</Label>
                        <Input type="time" value={eventData.end ? format(eventData.end as Date, 'HH:mm') : ''} onChange={(e) => { if(eventData.end) { const [h,m] = e.target.value.split(':'); const newDate = new Date(eventData.end as Date); newDate.setHours(Number(h), Number(m)); setEventData({...eventData, end: newDate})}}}/>
                    </div>
                </div>
                
                 {eventData.repeat && eventData.repeat !== 'none' && (
                    <div className="space-y-2">
                        <Label>Repetir fins</Label>
                         <DatePicker 
                             date={eventData.repeatUntil instanceof Date ? eventData.repeatUntil : undefined} 
                             onDateChange={(date) => setEventData(prev => ({...prev, repeatUntil: date}))}
                         />
                    </div>
                 )}
                 <div className="space-y-2">
                    <Label>Ubicació</Label>
                    <Textarea value={eventData.location || ''} onChange={(e) => setEventData({...eventData, location: e.target.value})} />
                </div>
            </div>
            <DialogFooter className="justify-between">
                <div>
                  {modalMode === 'edit' && (
                     <Button variant="destructive" onClick={() => {
                        setEventToDelete({event: eventData as CalendarEvent, type: null});
                        setDeleteConfirmationOpen(true);
                     }}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Eliminar
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                    <DialogClose asChild><Button variant="secondary">Cancel·lar</Button></DialogClose>
                    <Button onClick={handleSaveEvent} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Desar Esdeveniment
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Com vols eliminar aquest esdeveniment?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquest esdeveniment forma part d'una sèrie. Pots eliminar només aquesta ocurrència o tota la sèrie d'esdeveniments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:gap-2">
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteEvent('single')}>Eliminar només aquest</AlertDialogAction>
            <AlertDialogAction onClick={() => handleDeleteEvent('future')}>Eliminar aquest i futurs</AlertDialogAction>
            <AlertDialogAction onClick={() => handleDeleteEvent('all')}>Eliminar tota la sèrie</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialog open={saveConfirmationOpen} onOpenChange={setSaveConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Com vols desar els canvis?</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs editant un esdeveniment recurrent. Vols aplicar els canvis només a aquest esdeveniment o a tots els esdeveniments futurs de la sèrie?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:gap-2">
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeSave('single')}>Desar només aquest esdeveniment</AlertDialogAction>
            <AlertDialogAction onClick={() => executeSave('future')}>Desar tots els esdeveniments futurs</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    