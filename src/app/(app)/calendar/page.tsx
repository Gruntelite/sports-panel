
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Star, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'Entrenamiento' | 'Partido' | 'Evento';
  location?: string;
  teamName?: string;
  color?: string; // e.g., 'bg-blue-200'
};

function CalendarView() {
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

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
      fetchCalendarData(clubId, currentDate);
    }
  }, [clubId, currentDate]);

  const fetchCalendarData = async (clubId: string, date: Date) => {
    setLoading(true);
    try {
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      let allEvents: CalendarEvent[] = [];

      // Fetch recurring trainings from the 'general' schedule template
      const scheduleRef = doc(db, "clubs", clubId, "schedules", "general");
      const scheduleSnap = await getDoc(scheduleRef);

      if (scheduleSnap.exists()) {
        const scheduleData = scheduleSnap.data();
        const weeklySchedule = scheduleData.weeklySchedule;
        const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

        for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
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
      }

      // Fetch one-off events from the 'events' collection
      // This is a placeholder for where you would query an 'events' collection in Firestore
      // For now, we will add some example static data.
      const staticEvents: CalendarEvent[] = [
        // { id: 'evt1', title: 'Partido: Senior vs Rivales', date: new Date(new Date().setDate(10)), type: 'Partido', location: 'Campo Principal', color: 'bg-red-100 dark:bg-red-900/50' },
        // { id: 'evt2', title: 'Torneo Benéfico', date: new Date(new Date().setDate(20)), type: 'Evento', location: 'Polideportivo', color: 'bg-yellow-100 dark:bg-yellow-900/50' },
      ];
      
      allEvents = [...allEvents, ...staticEvents];

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const placeholders = Array.from({ length: startDay }, (_, i) => i);
  
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-xl capitalize min-w-[150px] text-center">{monthName} {year}</CardTitle>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>
        <Button className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          Añadir Evento
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
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
                    const dayEvents = events.filter(e => 
                        e.date.getDate() === day && 
                        e.date.getMonth() === currentDate.getMonth() &&
                        e.date.getFullYear() === currentDate.getFullYear()
                    ).sort((a,b) => a.date.getTime() - b.date.getTime());

                    return (
                    <div key={day} className="p-1 bg-card min-h-[120px] flex flex-col gap-1">
                        <span className="font-bold self-end text-sm pr-1">{day}</span>
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
