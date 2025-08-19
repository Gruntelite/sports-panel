
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
import { initialStats, events as manualEvents } from "@/lib/data";
import { ArrowUpRight, Users, Shield, Calendar, CircleDollarSign, Loader2, Clock, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, getCountFromServer, where, Timestamp } from "firebase/firestore";

const iconMap = {
  Users: Users,
  Shield: Shield,
  Calendar: Calendar,
  CircleDollarSign: CircleDollarSign,
};

type ScheduleEntry = {
    id: string;
    teamName?: string;
    title?: string;
    type: 'Entrenamiento' | 'Partido' | 'Evento';
    time: string;
    location: string;
};


export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [stats, setStats] = useState(initialStats);
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduleEntry[]>([]);
  
  const today = new Date();
  const upcomingEvents = manualEvents.filter(event => event.date >= today).slice(0, 5);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchDashboardData(currentClubId);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async (clubId: string) => {
    setLoading(true);
    try {
        // Fetch counts for stats
        const teamsCol = collection(db, "clubs", clubId, "teams");
        const playersCol = collection(db, "clubs", clubId, "players");

        const teamsCountSnap = await getCountFromServer(teamsCol);
        const playersCountSnap = await getCountFromServer(playersCol);
        
        const teamsCount = teamsCountSnap.data().count;
        const playersCount = playersCountSnap.data().count;

        setStats(prevStats => prevStats.map(stat => {
            if (stat.id === 'players') return { ...stat, value: playersCount.toString() };
            if (stat.id === 'teams') return { ...stat, value: teamsCount.toString() };
            return stat;
        }));
        
        // Fetch Today's Schedule
        const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const currentDayName = daysOfWeek[today.getDay()];
        const scheduleRef = doc(db, "clubs", clubId, "schedules", "general");
        const scheduleSnap = await getDoc(scheduleRef);

        let scheduleEntries: ScheduleEntry[] = [];

        if (scheduleSnap.exists()) {
            const scheduleData = scheduleSnap.data();
            const daySchedule = scheduleData.weeklySchedule?.[currentDayName] || [];
            scheduleEntries = daySchedule.map((entry: any) => ({
                id: entry.id,
                teamName: entry.teamName,
                type: 'Entrenamiento',
                time: entry.time,
                location: entry.venueName,
            }));
        }

        // Fetch today's manual events from the calendar
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        
        // This part assumes you have an 'events' collection. 
        // We will use the static events from data.ts for now.
        const manualTodaysEvents = manualEvents
            .filter(e => {
                const eventDate = e.date;
                return eventDate >= startOfDay && eventDate <= endOfDay;
            })
            .map(e => ({
                id: e.id,
                title: e.team, // Assuming event.team stores the title
                type: e.type,
                time: e.time,
                location: e.location,
            }));

        const allTodaysEvents = [...scheduleEntries, ...manualTodaysEvents];
        allTodaysEvents.sort((a, b) => a.time.localeCompare(b.time));

        setTodaysSchedule(allTodaysEvents);


    } catch (error) {
        console.error("Error fetching dashboard data:", error)
    } finally {
        setLoading(false);
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {stats.map((stat, index) => {
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
        })}
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Horarios de Hoy</CardTitle>
              <CardDescription>
                Entrenamientos y eventos programados para hoy.
              </CardDescription>
            </div>
             <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/calendar">
                Ver Calendario
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {todaysSchedule.length > 0 ? (
                    todaysSchedule.map((item) => (
                        <div key={item.id} className="grid grid-cols-[100px_1fr_auto] items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <div className="font-semibold text-sm flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground"/>
                                {item.time.split(' - ')[0]}
                            </div>
                            <div>
                                <div className="font-medium">{item.teamName || item.title}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="h-3 w-3"/>
                                    {item.location}
                                </div>
                            </div>
                            <div>
                                <Badge variant={item.type === 'Partido' ? 'destructive' : item.type === 'Entrenamiento' ? 'secondary' : 'default'}>
                                  {item.type === 'Evento' && <Star className="h-3 w-3 mr-1"/>}
                                  {item.type}
                                </Badge>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>No hay eventos ni entrenamientos programados para hoy.</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
            <CardDescription>
              Partidos y eventos especiales para los próximos días.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-muted p-2 rounded-md w-14">
                   <span className="text-sm font-bold">{event.date.toLocaleString('es-ES', { month: 'short' })}</span>
                   <span className="text-xl font-bold">{event.date.getDate()}</span>
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-medium leading-none flex items-center gap-2">
                    {event.type === 'Partido' ? 
                      <Badge variant="destructive">{event.type}</Badge> : 
                      <Badge variant="secondary">{event.type}</Badge>
                    }
                    <span>{event.team}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
                <div className="ml-auto font-medium">{event.time}</div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No hay próximos eventos.</p>}
             <Button asChild size="sm" className="w-full mt-2">
              <Link href="/calendar">
                Ver Calendario Completo
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
