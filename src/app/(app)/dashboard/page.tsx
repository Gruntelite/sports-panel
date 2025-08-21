
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Shield, Calendar, CircleDollarSign, Loader2, MapPin, Clock } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, getCountFromServer, where, Timestamp } from "firebase/firestore";
import type { CalendarEvent, ScheduleTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";

const iconMap = {
  Users: Users,
  Shield: Shield,
  Calendar: Calendar,
  CircleDollarSign: CircleDollarSign,
};

type TrainingEntry = {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    color: string;
}

type EventEntry = {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    color: string;
}

function DailySchedule({ selectedDate }: { selectedDate: Date }) {
    const [trainings, setTrainings] = useState<TrainingEntry[]>([]);
    const [events, setEvents] = useState<EventEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDailySchedule = async (clubId: string) => {
            if (!selectedDate) return;
            setLoading(true);

            try {
                const scheduleDate = selectedDate;
                const dateStr = format(scheduleDate, "yyyy-MM-dd");
                const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                const dayName = daysOfWeek[scheduleDate.getDay()];

                // 1. Get default template ID first
                const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                const settingsSnap = await getDoc(settingsRef);
                const defaultTemplateId = settingsSnap.exists() ? settingsSnap.data()?.defaultScheduleTemplateId : null;

                // 2. Check for an override for the selected date
                const overrideRef = doc(db, "clubs", clubId, "calendarOverrides", dateStr);
                const overrideSnap = await getDoc(overrideRef);
                
                // 3. Determine which template ID to use
                let templateIdToUse = defaultTemplateId;
                if (overrideSnap.exists()) {
                    templateIdToUse = overrideSnap.data().templateId;
                }
                
                // 4. Fetch trainings from the determined template
                let todaysTrainings: TrainingEntry[] = [];
                if (templateIdToUse) {
                    const templateRef = doc(db, "clubs", clubId, "schedules", templateIdToUse);
                    const templateSnap = await getDoc(templateRef);

                    if (templateSnap.exists()) {
                        const templateData = templateSnap.data() as ScheduleTemplate;
                        const weeklySchedule = templateData.weeklySchedule;
                        
                        if (weeklySchedule && weeklySchedule[dayName as keyof typeof weeklySchedule]) {
                            const daySchedule = weeklySchedule[dayName as keyof typeof weeklySchedule];
                            todaysTrainings = daySchedule.map((training: any) => ({
                                id: `${training.id}-${dateStr}`,
                                title: training.teamName,
                                startTime: training.startTime,
                                endTime: training.endTime,
                                location: training.venueName,
                                color: 'bg-primary/20 text-primary border border-primary/50'
                            }));
                        }
                    }
                }
                setTrainings(todaysTrainings.sort((a, b) => a.startTime.localeCompare(b.startTime)));

                // 5. Fetch Custom Events for the day
                const dayStart = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 0, 0, 0, 0);
                const dayEnd = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), 23, 59, 59, 999);

                const customEventsQuery = query(collection(db, "clubs", clubId, "calendarEvents"),
                    where('start', '>=', Timestamp.fromDate(dayStart)),
                    where('start', '<=', Timestamp.fromDate(dayEnd))
                );
                const customEventsSnapshot = await getDocs(customEventsQuery);
                const eventEntries = customEventsSnapshot.docs.map(doc => {
                    const event = doc.data() as CalendarEvent;
                    return {
                        id: doc.id,
                        title: event.title,
                        startTime: format(event.start.toDate(), 'HH:mm'),
                        endTime: format(event.end.toDate(), 'HH:mm'),
                        location: event.location,
                        color: event.color
                    };
                });
                setEvents(eventEntries.sort((a, b) => a.startTime.localeCompare(b.startTime)));

            } catch (error) {
                console.error("Error fetching daily schedule:", error);
            } finally {
                setLoading(false);
            }
        };
        
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                getDoc(doc(db, "users", user.uid)).then(userDocSnap => {
                    if (userDocSnap.exists()) {
                        const clubId = userDocSnap.data().clubId;
                        if(clubId) fetchDailySchedule(clubId);
                    } else {
                        setLoading(false);
                    }
                }).catch(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [selectedDate]);

    const titleDate = format(selectedDate, "eeee, d 'de' LLLL", { locale: es });
    
    const getSeparatorColorClass = (colorClass: string) => {
        if (!colorClass) return 'bg-primary';
        const match = colorClass.match(/bg-([a-z]+)-(\d+)/) || colorClass.match(/bg-primary/);
        if (match) {
            if(match[0] === 'bg-primary') return 'bg-primary';
            return `bg-${match[1]}-500`;
        }
        return 'bg-primary';
    }


    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="capitalize">Entrenamientos del {titleDate}</CardTitle>
                    <CardDescription>
                        Sesiones programadas según la plantilla de horarios activa para este día.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : trainings.length > 0 ? (
                        <div className="space-y-3">
                            {trainings.map(item => (
                                <div key={item.id} className={cn("flex items-center gap-4 p-3 rounded-lg border", item.color)}>
                                    <div className="flex flex-col items-center w-20">
                                        <span className="font-bold text-base">{item.startTime}</span>
                                        <span className="text-xs text-muted-foreground">{item.endTime}</span>
                                    </div>
                                    <div className="h-10 w-1 bg-primary rounded-full"></div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{item.title}</p>
                                        {item.location && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {item.location}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No hay entrenamientos programados para este día.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="capitalize">Otros Eventos del {titleDate}</CardTitle>
                    <CardDescription>
                        Partidos, reuniones y otros eventos creados en el calendario.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : events.length > 0 ? (
                        <div className="space-y-3">
                            {events.map(item => {
                                const separatorColor = getSeparatorColorClass(item.color);
                                return (
                                <div key={item.id} className={cn("flex items-center gap-4 p-3 rounded-lg border", item.color)}>
                                    <div className="flex flex-col items-center w-20">
                                        <span className="font-bold text-base">{item.startTime}</span>
                                        <span className="text-xs text-muted-foreground">{item.endTime}</span>
                                    </div>
                                    <div className={cn("h-10 w-1 rounded-full", separatorColor)}></div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{item.title}</p>
                                        {item.location && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {item.location}</div>}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No hay otros eventos para este día.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { id: "players", title: "Total de Jugadores", value: "0", change: "", icon: 'Users' },
    { id: "teams", title: "Equipos", value: "0", change: "", icon: 'Shield' },
    { id: "users", title: "Total de Usuarios", value: "0", change: "", icon: 'Users' },
    { id: "fees", title: "Ingresos Previstos (Mes)", value: "0 €", change: "", icon: 'CircleDollarSign' },
  ]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  useEffect(() => {
    const fetchStats = async (clubId: string) => {
        setLoading(true);
        try {
            const teamsCol = collection(db, "clubs", clubId, "teams");
            const playersCol = collection(db, "clubs", clubId, "players");
            const usersCol = query(collection(db, "clubs", clubId, "users"));

            const [teamsCountSnap, playersCountSnap, usersCountSnap, playersSnapshot] = await Promise.all([
                getCountFromServer(teamsCol),
                getCountFromServer(playersCol),
                getCountFromServer(usersCol),
                getDocs(playersCol)
            ]);
            
            const teamsCount = teamsCountSnap.data().count;
            const playersCount = playersCountSnap.data().count;
            const usersCount = usersCountSnap.data().count;

            const expectedIncome = playersSnapshot.docs.reduce((acc, doc) => {
                const player = doc.data();
                return acc + (player.monthlyFee || 0);
            }, 0);

            const monthName = format(new Date(), "LLLL 'de' yyyy", { locale: es });

            setStats(prevStats => prevStats.map(stat => {
                if (stat.id === 'players') return { ...stat, value: playersCount.toString() };
                if (stat.id === 'teams') return { ...stat, value: teamsCount.toString() };
                if (stat.id === 'users') return { ...stat, value: usersCount.toString() };
                if (stat.id === 'fees') return { ...stat, value: `${expectedIncome.toLocaleString('es-ES')} €`, change: `Total de ingresos en ${monthName}` };
                return stat;
            }));

        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          if (currentClubId) {
            fetchStats(currentClubId);
          } else {
             setLoading(false);
          }
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {loading ? (
            Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                </Card>
            ))
        ) : (
            stats.map((stat, index) => {
            const Icon = iconMap[stat.icon as keyof typeof iconMap];
            return (
                <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground capitalize">{stat.change}</p>
                </CardContent>
                </Card>
            );
            })
        )}
      </div>
      
       <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <CardTitle>Agenda del Día</CardTitle>
          <div className="flex items-center gap-2">
            <DatePicker date={selectedDate} onDateChange={(date) => date && setSelectedDate(date)} />
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>Hoy</Button>
          </div>
        </CardHeader>
      </Card>

      <DailySchedule selectedDate={selectedDate} />
    </div>
  );
}
