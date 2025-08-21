
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
import { initialStats } from "@/lib/data";
import { Users, Shield, Calendar, CircleDollarSign, Loader2, Clock, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, getCountFromServer, where, Timestamp } from "firebase/firestore";
import type { CalendarEvent, ScheduleTemplate } from "@/lib/types";

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
    type: 'Entrenamiento' | 'Partido' | 'Evento' | 'Otro';
    time: string;
    location?: string;
};


export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [stats, setStats] = useState(initialStats);
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduleEntry[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  
  useEffect(() => {
    const now = new Date();
    setCurrentDateTime(now);
    
    // Update time every minute
    const timerId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); 

    return () => clearInterval(timerId);
  }, []);

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

  const fetchDashboardData = async (clubId: string) => {
    setLoading(true);
    try {
        // Fetch counts for stats
        const teamsCol = collection(db, "clubs", clubId, "teams");
        const playersCol = collection(db, "clubs", clubId, "players");
        const usersCol = query(collection(db, "clubs", clubId, "users"));

        const teamsCountSnap = await getCountFromServer(teamsCol);
        const playersCountSnap = await getCountFromServer(playersCol);
        const usersCountSnap = await getCountFromServer(usersCol);
        
        const teamsCount = teamsCountSnap.data().count;
        const playersCount = playersCountSnap.data().count;
        const usersCount = usersCountSnap.data().count;

        const playersSnapshot = await getDocs(playersCol);
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
        
        // --- Fetch Today's Schedule ---
        let scheduleEntries: ScheduleEntry[] = [];
        const today = new Date();
        const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const todayStr = today.toISOString().split('T')[0];
        
        // 1. Fetch templates and settings
        const schedulesCol = collection(db, "clubs", clubId, "schedules");
        const schedulesSnapshot = await getDocs(schedulesCol);
        const templates = schedulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleTemplate));

        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        const settingsSnap = await getDoc(settingsRef);
        const defaultTemplateId = settingsSnap.exists() ? settingsSnap.data().defaultScheduleTemplateId : null;
        
        // 2. Determine which template to use for today
        const overrideRef = doc(db, "clubs", clubId, "calendarOverrides", todayStr);
        const overrideSnap = await getDoc(overrideRef);
        const templateIdToUse = overrideSnap.exists() ? overrideSnap.data().templateId : defaultTemplateId;

        // 3. Get schedule entries from the correct template
        if (templateIdToUse) {
            const template = templates.find(t => t.id === templateIdToUse);
            if (template) {
                const currentDayName = daysOfWeek[today.getDay()];
                const daySchedule = template.weeklySchedule?.[currentDayName] || [];
                
                daySchedule.forEach((training: any) => {
                    scheduleEntries.push({
                        id: `${training.id}-${todayStr}`,
                        teamName: training.teamName,
                        type: 'Entrenamiento',
                        time: training.startTime,
                        location: training.venueName,
                    });
                });
            }
        }
        
        // 4. Fetch custom events for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const customEventsQuery = query(collection(db, "clubs", clubId, "calendarEvents"), 
            where('start', '>=', Timestamp.fromDate(startOfDay)),
            where('start', '<=', Timestamp.fromDate(endOfDay))
        );
        const customEventsSnapshot = await getDocs(customEventsQuery);
        customEventsSnapshot.forEach(doc => {
            const eventData = doc.data() as CalendarEvent;
            scheduleEntries.push({
                id: doc.id,
                title: eventData.title,
                type: eventData.type,
                time: eventData.start.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                location: eventData.location,
            });
        });

        // 5. Combine and sort all events for today
        scheduleEntries.sort((a, b) => a.time.localeCompare(b.time));
        setTodaysSchedule(scheduleEntries);

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

      <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Horarios de Hoy</CardTitle>
              <CardDescription>
                {currentDateTime ? (
                    `Horarios para el ${currentDateTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                ) : (
                    'Entrenamientos y eventos programados para hoy.'
                )}
              </CardDescription>
            </div>
             <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/calendar">
                Ver Calendario Completo
                <Calendar className="h-4 w-4" />
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
                                {item.time}
                            </div>
                            <div>
                                <div className="font-medium">{item.teamName || item.title}</div>
                                {item.location && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="h-3 w-3"/>
                                    {item.location}
                                </div>
                                )}
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
      </div>
    </div>
  );
}
