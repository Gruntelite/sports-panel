
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
} from "date-fns";
import { es, ca } from "date-fns/locale";
import { useTranslation } from "@/components/i18n-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

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
    const top = (startOffsetMinutes / 60) * hourHeight; 
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
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  
  const filteredEvents = useMemo(() => {
    if(eventTypeFilter === 'all') return events;
    return events.filter(event => event.type === eventTypeFilter);
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
            where('start', '>=', Timestamp.fromDate(firstDay)),
            where('start', '<=', Timestamp.fromDate(lastDay))
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

  const handleOpenModal = (mode: 'add' | 'edit', event?: CalendarEvent) => {
    setModalMode(mode);
    setEventData(event ? 
        { ...event, repeat: 'none' } : 
        { 
            type: 'Evento',
            color: EVENT_TYPES[2].color,
            start: Timestamp.now(), 
            end: Timestamp.now(),
            repeat: 'none',
        }
    );
    setIsModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!clubId || !eventData.title || !eventData.start || !eventData.end) {
        toast({ variant: "destructive", title: t('common.error'), description: "El título y las fechas son obligatorios." });
        return;
    }
    setSaving(true);
    
    const batch = writeBatch(db);

    try {
        if(modalMode === 'edit' && eventData.id) {
            const dataToUpdate = { ...eventData };
            delete dataToUpdate.repeat;
            delete dataToUpdate.repeatUntil;
            await updateDoc(doc(db, "clubs", clubId, "calendarEvents", eventData.id), dataToUpdate);
            toast({ title: "Evento actualizado" });
        } else {
            const newEvents: Partial<CalendarEvent>[] = [];
            const baseEvent = { ...eventData };
            delete baseEvent.repeat;
            delete baseEvent.repeatUntil;

            let currentDate = eventData.start.toDate();
            const repeatUntilDate = eventData.repeatUntil;
            
            newEvents.push(baseEvent);

            if (eventData.repeat !== 'none' && repeatUntilDate) {
                while(currentDate <= repeatUntilDate) {
                    if(eventData.repeat === 'daily') {
                       currentDate = addDays(currentDate, 1);
                    } else if (eventData.repeat === 'weekly') {
                       currentDate = addWeeks(currentDate, 1);
                    }

                    if (currentDate <= repeatUntilDate) {
                        const newStart = new Date(currentDate);
                        newStart.setHours(eventData.start.toDate().getHours(), eventData.start.toDate().getMinutes());
                        const newEnd = new Date(currentDate);
                        newEnd.setHours(eventData.end.toDate().getHours(), eventData.end.toDate().getMinutes());

                        newEvents.push({
                            ...baseEvent,
                            start: Timestamp.fromDate(newStart),
                            end: Timestamp.fromDate(newEnd),
                        });
                    }
                }
            }

            newEvents.forEach(event => {
                const docRef = doc(collection(db, "clubs", clubId, "calendarEvents"));
                batch.set(docRef, event);
            });
            await batch.commit();

            toast({ title: "Evento(s) creado(s)" });
        }
        setIsModalOpen(false);
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
    setSaving(true);
    try {
        await deleteDoc(doc(db, "clubs", clubId, "calendarEvents", eventToDelete.id));
        toast({ title: "Evento eliminado" });
        setEventToDelete(null);
        if(clubId) fetchData(clubId);
    } catch(e) {
        toast({ variant: "destructive", title: t('common.error'), description: "No se pudo eliminar el evento." });
    } finally {
        setSaving(false);
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
                            {timeSlots.map(time => <div key={time} className="h-[80px] border-t"></div>)}
                            
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
                <DialogDescription>
                    Crea un esdeveniment personalitzat al calendari.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="event-title">Títol de l'esdeveniment</Label>
                    <Textarea id="event-title" value={eventData.title || ''} onChange={(e) => setEventData({...eventData, title: e.target.value})} className="h-10 resize-none"/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label>Equip</Label>
                        <Select value={eventData.teamId} onValueChange={(value) => setEventData(prev => ({...prev, teamId: value, teamName: teams.find(t => t.id === value)?.name}))}>
                          <SelectTrigger><SelectValue placeholder="Cap equip"/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Cap equip</SelectItem>
                             {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label>Data de l'esdeveniment</Label>
                        <DatePicker date={eventData.start?.toDate()} onDateChange={(date) => {
                            if (date) {
                                const newStart = eventData.start?.toDate() || new Date();
                                newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                const newEnd = eventData.end?.toDate() || new Date();
                                newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                setEventData({...eventData, start: Timestamp.fromDate(newStart), end: Timestamp.fromDate(newEnd)})
                            }
                        }} />
                    </div>
                    <div className="space-y-2">
                        <Label>Hora d'inici</Label>
                        <Input type="time" value={eventData.start ? format(eventData.start.toDate(), 'HH:mm') : ''} onChange={(e) => { if(eventData.start) { const [h,m] = e.target.value.split(':'); const newDate = eventData.start.toDate(); newDate.setHours(Number(h), Number(m)); setEventData({...eventData, start: Timestamp.fromDate(newDate)})}}}/>
                    </div>
                     <div className="space-y-2">
                        <Label>Hora de fi</Label>
                        <Input type="time" value={eventData.end ? format(eventData.end.toDate(), 'HH:mm') : ''} onChange={(e) => { if(eventData.end) { const [h,m] = e.target.value.split(':'); const newDate = eventData.end.toDate(); newDate.setHours(Number(h), Number(m)); setEventData({...eventData, end: Timestamp.fromDate(newDate)})}}}/>
                    </div>
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
                 <div className="space-y-2">
                    <Label>Ubicació</Label>
                    <Input value={eventData.location || ''} onChange={(e) => setEventData({...eventData, location: e.target.value})} />
                </div>
            </div>
            <DialogFooter className="justify-between">
                <div>
                  {modalMode === 'edit' && (
                     <Button variant="destructive" onClick={() => { setIsModalOpen(false); setEventToDelete(eventData as CalendarEvent); }}>
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
      
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar l'esdeveniment '{eventToDelete?.title}'? Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
