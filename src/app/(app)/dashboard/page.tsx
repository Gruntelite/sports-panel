
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
import { format, toDate } from "date-fns";
import { es } from "date-fns/locale";

const iconMap = {
  Users: Users,
  Shield: Shield,
  Calendar: Calendar,
  CircleDollarSign: CircleDollarSign,
};

type ScheduleEntry = {
    id: string;
    title: string;
    type: 'Entrenamiento' | 'Partido' | 'Evento' | 'Otro';
    startTime: string;
    endTime: string;
    location?: string;
    color: string;
}

function TodaySchedule() {
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

     useEffect(() => {
        const fetchTodaysSchedule = async (clubId: string) => {
            setLoading(true);
            try {
                const today = new Date();
                const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
                const todayEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
                const todayStr = todayStart.toISOString().split('T')[0];
                const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                const dayName = daysOfWeek[today.getUTCDay() === 0 ? 6 : today.getUTCDay() - 1];
                
                let allEntries: ScheduleEntry[] = [];
                
                // 1. Get default template and override
                const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                const settingsSnap = await getDoc(settingsRef);
                const defaultTemplateId = settingsSnap.exists() ? settingsSnap.data()?.defaultScheduleTemplateId : null;
        
                const overrideRef = doc(db, "clubs", clubId, "calendarOverrides", todayStr);
                const overrideSnap = await getDoc(overrideRef);
                
                let templateIdToUse = overrideSnap.exists() ? overrideSnap.data().templateId : defaultTemplateId;

                // 2. Fetch and process template events
                if (templateIdToUse) {
                    const templateRef = doc(db, "clubs", clubId, "schedules", templateIdToUse);
                    const templateSnap = await getDoc(templateRef);

                    if (templateSnap.exists()) {
                        const template = templateSnap.data() as ScheduleTemplate;
                        if (template.weeklySchedule && template.weeklySchedule[dayName]) {
                            const daySchedule = template.weeklySchedule[dayName];
                            daySchedule.forEach((training: any) => {
                                allEntries.push({
                                    id: `${training.id}-${todayStr}`,
                                    title: training.teamName,
                                    type: 'Entrenamiento',
                                    startTime: training.startTime,
                                    endTime: training.endTime,
                                    location: training.venueName,
                                    color: 'bg-primary/20 text-primary border border-primary/50'
                                });
                            });
                        }
                    }
                }

                // 3. Fetch custom events
                const customEventsQuery = query(collection(db, "clubs", clubId, "calendarEvents"),
                    where('start', '>=', Timestamp.fromDate(todayStart)),
                    where('start', '<=', Timestamp.fromDate(todayEnd))
                );
                const customEventsSnapshot = await getDocs(customEventsQuery);
                customEventsSnapshot.forEach(doc => {
                    const event = doc.data() as CalendarEvent;
                    allEntries.push({
                        id: doc.id,
                        title: event.title,
                        type: event.type,
                        startTime: format(event.start.toDate(), 'HH:mm', { timeZone: 'UTC' }),
                        endTime: format(event.end.toDate(), 'HH:mm', { timeZone: 'UTC' }),
                        location: event.location,
                        color: event.color
                    });
                });

                allEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
                setSchedule(allEntries);

            } catch (error) {
                console.error("Error fetching today's schedule:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                getDoc(doc(db, "users", user.uid)).then(userDocSnap => {
                    if (userDocSnap.exists()) {
                        const clubId = userDocSnap.data().clubId;
                        if(clubId) fetchTodaysSchedule(clubId);
                    } else {
                        setLoading(false);
                    }
                }).catch(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        const timer = setInterval(() => setCurrentDate(new Date()), 60000); 

        return () => {
            unsubscribe();
            clearInterval(timer);
        };
    }, []);


    const dateString = currentDate.toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Agenda de Hoy</CardTitle>
                <CardDescription>
                    Horarios para el {dateString}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : schedule.length > 0 ? (
                    <div className="space-y-4">
                        {schedule.map(item => (
                            <div key={item.id} className={cn("flex items-center gap-4 p-3 rounded-lg border", item.color.startsWith('bg-') ? item.color : 'bg-muted/50')}>
                                <div className="flex flex-col items-center w-20">
                                    <span className="font-bold text-lg">{item.startTime}</span>
                                    <span className="text-xs text-muted-foreground">{item.endTime}</span>
                                </div>
                                <div className={cn("h-12 w-1.5 rounded-full", item.color.startsWith('bg-') ? 'bg-primary' : '')} style={{ backgroundColor: item.color.startsWith('bg-') ? undefined : item.color }}></div>
                                <div className="flex-1">
                                    <p className="font-semibold">{item.title}</p>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.type}</div>
                                        {item.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.location}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Calendar className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="text-lg font-semibold">No hay nada programado</h3>
                        <p className="text-sm">No tienes entrenamientos ni eventos para el día de hoy.</p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href="/calendar">Ir al Calendario</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { id: "players", title: "Total de Jugadores", value: "0", change: "", icon: 'Users' },
    { id: "teams", title: "Equipos", value: "0", change: "", icon: 'Shield' },
    { id: "users", title: "Total de Usuarios", value: "0", change: "", icon: 'Users' },
    { id: "fees", title: "Cuotas Pendientes", value: "0 €", change: "", icon: 'CircleDollarSign' },
  ]);
  
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

            const pendingFees = playersSnapshot.docs.reduce((acc, doc) => {
                const player = doc.data();
                if (player.paymentStatus !== 'paid' && player.monthlyFee) {
                    return acc + player.monthlyFee;
                }
                return acc;
            }, 0);

            setStats(prevStats => prevStats.map(stat => {
                if (stat.id === 'players') return { ...stat, value: playersCount.toString() };
                if (stat.id === 'teams') return { ...stat, value: teamsCount.toString() };
                if (stat.id === 'users') return { ...stat, value: usersCount.toString() };
                if (stat.id === 'fees') return { ...stat, value: `${pendingFees.toLocaleString('es-ES')} €` };
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
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
                </Card>
            );
            })
        )}
      </div>
      <TodaySchedule />
    </div>
  );
}
