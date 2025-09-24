
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
  
  const [eventToDelete, setEventToDelete] = useState<{event: CalendarEvent, type: 'single' | 'all' | 'future'} | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [saveType, setSaveType] = useState<'single' | 'future' | null>(null);

  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  
  const filteredEvents = useMemo(() => {
    let visibleEvents = events;
    
    // Filter out original events that have an exception on the same day
    const exceptions = events.filter(e => e.recurrenceException);
    visibleEvents = visibleEvents.filter(event => {
      if (!event.recurrenceId) return true; // Keep non-recurring events
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

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        return newDate;
    });
  };

  const handleOpenModal = async (mode: 'add' | 'edit', event?: CalendarEvent) => {
    setModalMode(mode);
    if (event) {
        let eventToOpen: Partial<CalendarEvent & { repeat?: 'none' | 'daily' | 'weekly', repeatUntil?: Date }> = { 
            ...event,
            start: event.start.toDate(), 
            end: event.end.toDate(),
            repeat: 'none'
        };

        if(event.recurrenceId) {
            const seriesEventsQuery = query(collection(db, "clubs", clubId!, "calendarEvents"), where('recurrenceId', '==', event.recurrenceId));
            const seriesSnapshot = await getDocs(seriesEventsQuery);
            const seriesEvents = seriesSnapshot.docs
                .map(d => d.data() as CalendarEvent)
                .sort((a,b) => a.start.seconds - b.start.seconds);
            
            if (seriesEvents.length > 1) {
                const firstEvent = seriesEvents[seriesEvents.length - 1];
                const secondEvent = seriesEvents[seriesEvents.length - 2];
                const dayDiff = differenceInMilliseconds(secondEvent.start.toDate(), firstEvent.start.toDate()) / (1000 * 60 * 60 * 24);

                if (dayDiff === 1) {
                    eventToOpen.repeat = 'daily';
                } else if (dayDiff === 7) {
                    eventToOpen.repeat = 'weekly';
                }
                eventToOpen.repeatUntil = seriesEvents[seriesEvents.length - 1].start.toDate();
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
    });
    setIsModalOpen(true);
  };

 const handleSaveEvent = async () => {
    if (!saveType) {
      if (modalMode === 'edit' && eventData.recurrenceId) {
        setSaveConfirmationOpen(true);
        return;
      }
      // If not recurring or adding new, default to 'future'
      setSaveType('future');
      return; 
    }
    if (!clubId || !eventData.title || !eventData.start || !eventData.end) {
      toast({ variant: "destructive", title: t('common.error'), description: "El título y las fechas son obligatorios." });
      return;
    }
    setSaving(true);
    setSaveConfirmationOpen(false);

    try {
      const batch = writeBatch(db);
      const recurrenceId = (modalMode === 'edit' && eventData.recurrenceId) ? eventData.recurrenceId : uuidv4();
      const originalStartDate = eventData.start as Date;

      // ---- Deletion Phase ----
      if (modalMode === 'edit' && eventData.id) {
        if (saveType === 'future' && eventData.recurrenceId) {
            const seriesQuery = query(
                collection(db, "clubs", clubId, "calendarEvents"), 
                where('recurrenceId', '==', eventData.recurrenceId),
                where('start', '>=', Timestamp.fromDate(originalStartDate))
            );
            const snapshot = await getDocs(seriesQuery);
            snapshot.forEach(doc => batch.delete(doc.ref));
        } else { // 'single' or non-recurring edit
             batch.delete(doc(db, "clubs", clubId, "calendarEvents", eventData.id));
        }
      }
      
      // ---- Creation Phase ----
      let newEvents: Partial<CalendarEvent>[] = [];
      const baseEvent: Partial<CalendarEvent> = { ...eventData };
      delete (baseEvent as any).id;
      delete (baseEvent as any).repeat;
      delete (baseEvent as any).repeatUntil;
      baseEvent.recurrenceId = (eventData.repeat !== 'none' || (eventData.recurrenceId && saveType !== 'single')) ? recurrenceId : null;

      if (saveType === 'single' && modalMode === 'edit') {
        baseEvent.recurrenceId = eventData.recurrenceId; // Keep original recurrenceId
        baseEvent.recurrenceException = Timestamp.fromDate(originalStartDate);
        const newDocRef = doc(collection(db, "clubs", clubId, "calendarEvents"));
        batch.set(newDocRef, { ...baseEvent, start: Timestamp.fromDate(eventData.start as Date), end: Timestamp.fromDate(eventData.end as Date) });
      } else { // 'future' or new event
          let currentDate = new Date(eventData.start as Date);
          const repeatUntilDate = eventData.repeatUntil;
          
          const originalEnd = new Date(eventData.end as Date);
          
          let firstEvent = true;
          do {
              const newStart = new Date(currentDate);
              newStart.setHours(originalStartDate.getHours(), originalStartDate.getMinutes());
              const newEnd = new Date(currentDate);
              newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes());

              const newDocRef = doc(collection(db, "clubs", clubId, "calendarEvents"));
              batch.set(newDocRef, { ...baseEvent, start: Timestamp.fromDate(newStart), end: Timestamp.fromDate(newEnd) });
              
              if (eventData.repeat === 'daily') {
                  currentDate = addDays(currentDate, 1);
              } else if (eventData.repeat === 'weekly') {
                  currentDate = addWeeks(currentDate, 1);
              } else {
                  break; // No repeat
              }
              firstEvent = false;
          } while (repeatUntilDate && currentDate <= repeatUntilDate);
      }

      await batch.commit();

      toast({ title: "Evento(s) guardado(s)" });
      setIsModalOpen(false);
      setSaveType(null);
      if (clubId) fetchData(clubId);

    } catch(e) {
      console.error(e);
      toast({ variant: "destructive", title: t('common.error'), description: "No se pudo guardar el evento." });
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteEvent = async () => {
    if (!clubId || !eventToDelete) return;

    if (eventToDelete.event.recurrenceId && eventToDelete.type === null) {
        setDeleteConfirmationOpen(true);
        return;
    }
    setSaving(true);
    setDeleteConfirmationOpen(false);

    try {
        const batch = writeBatch(db);
        if (eventToDelete.type === 'all' && eventToDelete.event.recurrenceId) {
            const seriesQuery = query(collection(db, "clubs", clubId, "calendarEvents"), where('recurrenceId', '==', eventToDelete.event.recurrenceId));
            const snapshot = await getDocs(seriesQuery);
            snapshot.forEach(doc => batch.delete(doc.ref));
        } else if (eventToDelete.type === 'future' && eventToDelete.event.recurrenceId) {
            const seriesQuery = query(collection(db, "clubs", clubId, "calendarEvents"), 
                where('recurrenceId', '==', eventToDelete.event.recurrenceId),
                where('start', '>=', eventToDelete.event.start)
            );
            const snapshot = await getDocs(seriesQuery);
            snapshot.forEach(doc => batch.delete(doc.ref));
        } else { // 'single' or not recurring
             if (eventToDelete.event.recurrenceId) {
                // Create an exception instead of deleting
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
        weekDays.forEach(day => {
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
    }, [filteredEvents, weekDays]);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold whitespace-nowrap capitalize">
              {format(weekDays[0], 'd')} - {format(weekDays[6], 'd ')} 
              de {format(currentDate, 'MMMM, yyyy', { locale: locale === 'ca' ? ca : es })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => changeWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              {t('schedules.calendar.today')}
            </Button>
          </div>
           <div className="flex items-center gap-2">
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tots els Esdeveniments</SelectItem>
                        {EVENT_TYPES.map(type => (
                           <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
               <Button onClick={() => handleOpenModal('add')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Afegir Esdeveniment
                </Button>
           </div>
        </div>

        <div className="flex-grow overflow-auto">
          <div className="grid grid-cols-[60px_1fr]">
            <div className="col-start-1 col-end-2 border-r">
                <div className="sticky top-0 bg-background z-10 h-16"></div>
                {timeSlots.map(time => (
                    <div key={time} className="h-[80px] relative text-right pr-2 border-t">
                        <span className="text-xs font-semibold text-muted-foreground absolute -top-2 right-2">{time}</span>
                    </div>
                ))}
            </div>
            <div className="col-start-2 col-end-3 grid grid-cols-7 relative">
                {weekDays.map((day, dayIndex) => {
                     const dayKey = format(day, 'yyyy-MM-dd');
                     const dayEvents = dailyEventsWithLayout.get(dayKey) || [];
                     return (
                        <div key={day.toString()} className={cn("relative border-r", dayIndex === 6 && "border-r-0")}>
                            <div className="sticky top-0 bg-background z-10 text-center p-2 h-16 border-b">
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
        <DialogContent className="sm:max-w-xl">
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
            <AlertDialogTitle>¿Cómo quieres eliminar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Este evento forma parte de una serie. Puedes eliminar solo esta ocurrencia o toda la serie de eventos (pasados y futuros).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setEventToDelete(prev => prev ? {...prev, type: 'single'} : null); handleDeleteEvent(); }}>Eliminar solo este evento</AlertDialogAction>
            <AlertDialogAction onClick={() => { setEventToDelete(prev => prev ? {...prev, type: 'all'} : null); handleDeleteEvent(); }}>Eliminar toda la serie</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialog open={saveConfirmationOpen} onOpenChange={setSaveConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cómo quieres guardar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás editando un evento recurrente. ¿Quieres aplicar los cambios solo a este evento o a todos los eventos futuros de la serie?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={() => setSaveType(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setSaveType('single'); handleSaveEvent(); }}>Guardar solo este evento</AlertDialogAction>
            <AlertDialogAction onClick={() => { setSaveType('future'); handleSaveEvent(); }}>Guardar todos los eventos futuros</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
