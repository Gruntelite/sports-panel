
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
import { Users, Shield, Calendar, CircleDollarSign, Loader2, MapPin, Clock, UserSquare } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, getCountFromServer, where, Timestamp } from "firebase/firestore";
import type { CalendarEvent, ScheduleTemplate, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { es, ca } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";
import { useTranslation } from "@/components/i18n-provider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


const iconMap = {
  Users: Users,
  Shield: Shield,
  Calendar: Calendar,
  CircleDollarSign: CircleDollarSign,
  UserSquare: UserSquare,
};

type TrainingEntry = {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    color: string;
    teamId: string;
}

type EventEntry = {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    color: string;
    type: 'Entrenamiento' | 'Partido' | 'Evento' | 'Otro';
    teamName?: string;
}

function DailyScheduleBlock({ allEvents, blockNumber }: { allEvents: EventEntry[], blockNumber: number }) {
    const { t, locale } = useTranslation();
    const [viewType, setViewType] = useState(blockNumber === 1 ? 'trainings' : 'matches');
    
    const getSeparatorColorFromBorder = (colorClass: string) => {
        if (!colorClass) return 'bg-primary';
        const match = colorClass.match(/border-([a-z]+)-(\d+)/);
        if (match && match[1]) {
            return `bg-${match[1]}-500`;
        }
        return 'bg-primary';
    }

    const getTitle = () => {
        switch(viewType) {
            case 'trainings': return t('dashboard.dailySchedule.trainingsTitle');
            case 'matches': return t('dashboard.dailySchedule.matchesTitle');
            case 'events': return t('dashboard.dailySchedule.eventsTitle');
            default: return t('dashboard.dailySchedule.title');
        }
    }

    const getDescription = () => {
        switch(viewType) {
            case 'trainings': return t('dashboard.dailySchedule.trainingsDescription');
            case 'matches': return t('dashboard.dailySchedule.matchesDescription');
            case 'events': return t('dashboard.dailySchedule.eventsDescription');
            default: return t('dashboard.dailySchedule.title');
        }
    }

    const getNoDataMessage = () => {
        switch(viewType) {
            case 'trainings': return t('dashboard.dailySchedule.noTrainings');
            case 'matches': return t('dashboard.dailySchedule.noMatches');
            case 'events': return t('dashboard.dailySchedule.noEvents');
            default: return "No hay datos";
        }
    }

    const filteredItems = viewType === 'trainings' 
        ? allEvents.filter(e => e.type === 'Entrenamiento')
        : allEvents.filter(e => e.type.toLowerCase() === viewType.slice(0, -1));


    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                    <div>
                        <CardTitle className="capitalize text-lg md:text-xl">{getTitle()}</CardTitle>
                        <CardDescription>{getDescription()}</CardDescription>
                    </div>
                    <Select value={viewType} onValueChange={setViewType}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="trainings">Entrenamientos</SelectItem>
                            <SelectItem value="matches">Partidos</SelectItem>
                            <SelectItem value="events">Eventos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {filteredItems.length > 0 ? (
                    <div className="space-y-3">
                        {filteredItems.map(item => (
                            <div key={item.id} className={cn("flex items-center gap-4 p-3 rounded-lg border", item.color)}>
                                <div className="flex flex-col items-center w-16 md:w-20">
                                    <span className="font-bold text-sm md:text-base">{item.startTime}</span>
                                    <span className="text-xs text-muted-foreground">{item.endTime}</span>
                                </div>
                                <div className={cn("h-10 w-1 rounded-full", viewType === 'trainings' ? 'bg-primary' : getSeparatorColorFromBorder(item.color))}></div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm md:text-base">{item.title}</p>
                                    {item.location && <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {item.location}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>{getNoDataMessage()}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DailyScheduleContainer({ selectedDate, teams }: { selectedDate: Date, teams: Team[] }) {
    const [allEvents, setAllEvents] = useState<EventEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDailySchedule = async (clubId: string) => {
            if (!selectedDate) return;
            setLoading(true);
            
            const finalEvents: EventEntry[] = [];

            try {
                const scheduleDateStr = format(selectedDate, "yyyy-MM-dd");
                const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                const dayName = daysOfWeek[selectedDate.getDay()];

                const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                const settingsSnap = await getDoc(settingsRef);
                const defaultTemplateId = settingsSnap.exists() ? settingsSnap.data()?.defaultScheduleTemplateId : null;

                const overrideRef = doc(db, "clubs", clubId, "calendarOverrides", scheduleDateStr);
                const overrideSnap = await getDoc(overrideRef);
                
                let templateIdToUse = defaultTemplateId;
                if (overrideSnap.exists() && overrideSnap.data().templateId) {
                    templateIdToUse = overrideSnap.data().templateId;
                }
                
                if (templateIdToUse) {
                    const templateRef = doc(db, "clubs", clubId, "schedules", templateIdToUse);
                    const templateSnap = await getDoc(templateRef);

                    if (templateSnap.exists()) {
                        const templateData = templateSnap.data() as ScheduleTemplate;
                        const weeklySchedule = templateData.weeklySchedule;
                        
                        if (weeklySchedule && weeklySchedule[dayName as keyof typeof weeklySchedule]) {
                            const daySchedule = weeklySchedule[dayName as keyof typeof weeklySchedule];
                            daySchedule.forEach((training: any) => {
                                finalEvents.push({
                                    id: `${training.id}-${scheduleDateStr}`,
                                    title: training.teamName,
                                    startTime: training.startTime,
                                    endTime: training.endTime,
                                    location: training.venueName,
                                    color: 'bg-primary/20 text-primary border border-primary/50',
                                    type: 'Entrenamiento'
                                });
                            });
                        }
                    }
                }

                const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
                const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);

                const customEventsQuery = query(collection(db, "clubs", clubId, "calendarEvents"),
                    where('start', '>=', Timestamp.fromDate(dayStart)),
                    where('start', '<=', Timestamp.fromDate(dayEnd))
                );
                const customEventsSnapshot = await getDocs(customEventsQuery);
                
                const exceptionsOnDay: string[] = [];
                customEventsSnapshot.docs.forEach(docSnap => {
                    const event = docSnap.data() as CalendarEvent;
                    if (event.recurrenceException && isSameDay(event.recurrenceException.toDate(), selectedDate)) {
                        exceptionsOnDay.push(event.recurrenceId!);
                    }
                });

                customEventsSnapshot.docs.forEach(docSnap => {
                    const event = docSnap.data() as CalendarEvent;
                    if (event.recurrenceId && exceptionsOnDay.includes(event.recurrenceId)) return;
                    
                    finalEvents.push({
                        id: docSnap.id,
                        title: event.title,
                        startTime: format(event.start.toDate(), 'HH:mm'),
                        endTime: format(event.end.toDate(), 'HH:mm'),
                        location: event.location,
                        color: event.color,
                        type: event.type,
                        teamName: event.teamName
                    });
                });
                setAllEvents(finalEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)));

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

    if(loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card><CardContent className="h-48 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
                <Card><CardContent className="h-48 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <DailyScheduleBlock allEvents={allEvents} blockNumber={1} />
            <DailyScheduleBlock allEvents={allEvents} blockNumber={2} />
        </div>
    )
}

export default function DashboardPage() {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { id: "players", title: "Total de Jugadores", value: "0", change: "", icon: 'Users' },
    { id: "coaches", title: "Total de Entrenadores", value: "0", change: "", icon: 'UserSquare' },
    { id: "teams", title: "Equipos", value: "0", change: "", icon: 'Shield' },
    { id: "fees", title: "Ingresos Previstos (Mes)", value: "0 €", change: "", icon: 'CircleDollarSign' },
  ]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [teams, setTeams] = useState<Team[]>([]);
  
  useEffect(() => {
    const fetchStats = async (clubId: string) => {
        setLoading(true);
        try {
            const teamsCol = collection(db, "clubs", clubId, "teams");
            const playersCol = collection(db, "clubs", clubId, "players");
            const coachesCol = collection(db, "clubs", clubId, "coaches");

            const [teamsSnapshot, playersCountSnap, coachesCountSnap, playersSnapshot] = await Promise.all([
                getDocs(query(teamsCol, orderBy("order"))),
                getCountFromServer(playersCol),
                getCountFromServer(coachesCol),
                getDocs(playersCol)
            ]);
            
            const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsList);

            const playersCount = playersCountSnap.data().count;
            const coachesCount = coachesCountSnap.data().count;

            const expectedIncome = playersSnapshot.docs.reduce((acc, doc) => {
                const player = doc.data();
                return acc + (player.monthlyFee || 0);
            }, 0);

            const monthName = format(new Date(), "LLLL 'de' yyyy", { locale: locale === 'ca' ? ca : es });

            setStats([
                { id: "players", title: t('dashboard.stats.totalPlayers'), value: playersCount.toString(), change: "", icon: 'Users' },
                { id: "coaches", title: t('dashboard.stats.totalCoaches'), value: coachesCount.toString(), change: "", icon: 'UserSquare' },
                { id: "teams", title: t('dashboard.stats.teams'), value: teamsList.length.toString(), change: "", icon: 'Shield' },
                { id: "fees", title: t('dashboard.stats.monthlyIncome'), value: `${expectedIncome.toLocaleString('es-ES')} €`, change: `${t('dashboard.stats.totalIncomeIn')} ${monthName}`, icon: 'CircleDollarSign' },
            ]);

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
  }, [t, locale]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <CardHeader className="flex-col items-start gap-4 space-y-0 md:flex-row md:items-center">
            <div>
              <CardTitle>{t('dashboard.dailySchedule.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
                <DatePicker date={selectedDate} onDateChange={(date) => date && setSelectedDate(date)} />
                <Button variant="outline" onClick={() => setSelectedDate(new Date())}>{t('dashboard.dailySchedule.today')}</Button>
            </div>
        </CardHeader>
      </Card>

      <DailyScheduleContainer selectedDate={selectedDate} teams={teams} />
    </div>
  );
}
