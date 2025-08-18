
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTeams } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type Venue = {
    id: string;
    name: string;
}

type Assignment = {
    id: string; // Unique id for the assignment itself
    teamId: string;
    startTime: string;
    endTime: string;
    venueId: string;
}

type Team = {
  id: string;
  name: string;
}

type DailyScheduleEntry = {
    id: string; // Unique ID for each entry
    teamId: string;
    teamName: string;
    time: string; // e.g., "16:00 - 17:00"
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


export default function SchedulesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: [],
  });

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const currentDay: DayOfWeek = daysOfWeek[currentDayIndex];
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [newVenueName, setNewVenueName] = useState('');

  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("23:00");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const scheduleTemplateId = "general"; // For now, we use one general template

  const getScheduleRef = useCallback(() => {
    if (!clubId) return null;
    return doc(db, "clubs", clubId, "schedules", scheduleTemplateId);
  }, [clubId]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const currentClubId = userData.clubId;
          setClubId(currentClubId);
          
          // Fetch teams
          const fetchedTeams = await getTeams(currentClubId);
          setTeams(fetchedTeams);

          // Fetch schedule data
          const scheduleRef = doc(db, "clubs", currentClubId, "schedules", scheduleTemplateId);
          const scheduleSnap = await getDoc(scheduleRef);

          if (scheduleSnap.exists()) {
            const data = scheduleSnap.data();
            setVenues(data.venues || []);
            setWeeklySchedule(data.weeklySchedule || {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []});
          } else {
            // If no schedule exists, create one
            await setDoc(scheduleRef, { 
                name: "Plantilla General",
                venues: [],
                weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []}
            });
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [scheduleTemplateId]);


  const handleAddVenue = async () => {
    if (newVenueName.trim() !== '' && clubId) {
        const newVenue = {id: crypto.randomUUID(), name: newVenueName.trim()};
        const updatedVenues = [...venues, newVenue];
        setVenues(updatedVenues);
        
        const scheduleRef = getScheduleRef();
        if (scheduleRef) {
            await updateDoc(scheduleRef, { venues: updatedVenues });
        }
        setNewVenueName('');
        toast({ title: "Recinto añadido", description: "El nuevo recinto se ha guardado." });
    }
  }

  const handleRemoveVenue = async (id: string) => {
    const updatedVenues = venues.filter(v => v.id !== id);
    setVenues(updatedVenues);
    const scheduleRef = getScheduleRef();
    if (scheduleRef) {
        await updateDoc(scheduleRef, { venues: updatedVenues });
        toast({ title: "Recinto eliminado", description: "El recinto se ha eliminado." });
    }
  }
  
  const generateTimeSlots = (start: string, end: string) => {
    const slots = [];
    let current = new Date(`1970-01-01T${start}:00`);
    const endDate = new Date(`1970-01-01T${end}:00`);

    while (current < endDate) {
      const next = new Date(current.getTime() + 60 * 60 * 1000);
      slots.push(`${current.toTimeString().substring(0, 5)} - ${next.toTimeString().substring(0, 5)}`);
      current = next;
    }
    return slots;
  };
  
  const timeSlots = generateTimeSlots(startTime, endTime);

  const handleSaveSchedules = async () => {
    const newDailySchedule: DailyScheduleEntry[] = [];
    const timeSlotsSet = new Set(timeSlots);

    assignments.forEach(assignment => {
      const team = teams.find(t => t.id === assignment.teamId);
      const venue = venues.find(v => v.id === assignment.venueId);

      if(team && venue && assignment.startTime && assignment.endTime) {
        const start = new Date(`1970-01-01T${assignment.startTime}`);
        const end = new Date(`1970-01-01T${assignment.endTime}`);
        let current = start;

        while(current < end) {
          const next = new Date(current.getTime() + 60 * 60 * 1000);
          const timeSlot = `${current.toTimeString().substring(0,5)} - ${next.toTimeString().substring(0,5)}`;
          if (timeSlotsSet.has(timeSlot)) {
            newDailySchedule.push({
              id: crypto.randomUUID(),
              teamId: team.id,
              teamName: team.name,
              time: timeSlot,
              venueName: venue.name
            });
          }
          current = next;
        }
      }
    });

    const updatedWeeklySchedule = {
        ...weeklySchedule,
        [currentDay]: newDailySchedule,
    };
    
    setWeeklySchedule(updatedWeeklySchedule);
    
    const scheduleRef = getScheduleRef();
    if (scheduleRef) {
        await updateDoc(scheduleRef, { weeklySchedule: updatedWeeklySchedule });
        toast({ title: "Horarios Guardados", description: `Los horarios para el ${currentDay} se han guardado.` });
    }
    setAssignments([]);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setAssignments([]);
    if (direction === 'next') {
        setCurrentDayIndex((prev) => (prev + 1) % daysOfWeek.length);
    } else {
        setCurrentDayIndex((prev) => (prev - 1 + daysOfWeek.length) % daysOfWeek.length);
    }
  };

  const handleAddAssignment = (teamId: string) => {
    if(!teamId) return;
    setAssignments(prev => [...prev, {id: crypto.randomUUID(), teamId, startTime: '', endTime: '', venueId: ''}]);
  };

  const handleRemoveAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };
  
  const handleAssignmentChange = (id: string, field: 'startTime' | 'endTime' | 'venueId', value: string) => {
    setAssignments(prev => prev.map(a => a.id === id ? {...a, [field]: value} : a));
  };
  
  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Plantillas de Horarios</h1>
          <p className="text-muted-foreground">
            Crea y gestiona las plantillas de horarios de entrenamiento semanales.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Select defaultValue="default">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="default">Plantilla General</SelectItem>
                    <SelectItem value="preseason" disabled>Plantilla Pretemporada</SelectItem>
                </SelectContent>
            </Select>
            <Button className="gap-1" disabled>
                <PlusCircle className="h-3.5 w-3.5" />
                Crear Plantilla
            </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 flex-1">
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Horarios</CardTitle>
                <CardDescription>Define recintos, rango horario y asigna tiempos a tus equipos para el <span className="font-semibold">{currentDay}</span>.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold text-base">Gestionar Recintos</h3>
                     <div className="flex items-center gap-2">
                        <Input placeholder="Nombre del nuevo recinto" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} />
                        <Button onClick={handleAddVenue} size="sm"><PlusCircle/></Button>
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="start-time">Hora de Inicio</Label>
                        <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="end-time">Hora de Fin</Label>
                        <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold text-base">Asignar Tiempos y Recintos</h3>
                     <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {assignments.map(assignment => {
                             const team = teams.find(t => t.id === assignment.teamId);
                             return (
                                <div key={assignment.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center">
                                       <Label className="font-semibold">{team?.name}</Label>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAssignment(assignment.id)}>
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2">
                                        <Input type="time" value={assignment.startTime} onChange={(e) => handleAssignmentChange(assignment.id, 'startTime', e.target.value)} />
                                        <Input type="time" value={assignment.endTime} onChange={(e) => handleAssignmentChange(assignment.id, 'endTime', e.target.value)} />
                                         <Select value={assignment.venueId} onValueChange={(value) => handleAssignmentChange(assignment.id, 'venueId', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Recinto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {venues.map(venue => (
                                                    <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                             )
                        })}
                     </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full mt-2">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir horario a un equipo
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                            {teams.map(team => (
                                 <DropdownMenuItem key={team.id} onSelect={() => handleAddAssignment(team.id)}>
                                    {team.name}
                                 </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
                 <Button onClick={handleSaveSchedules} className="w-full">
                    <Clock className="mr-2 h-4 w-4" />
                    Guardar Horarios para el {currentDay}
                </Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                    <CardTitle className="text-xl capitalize w-32 text-center">{currentDay}</CardTitle>
                    <Button variant="outline" size="icon" onClick={() => navigateDay('next')}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[120px_1fr]">
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b border-r">Horas</div>
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b">Equipos y Recintos</div>
                    </div>
                    <div className="grid grid-cols-1 max-h-[600px] overflow-y-auto">
                    {timeSlots.map(slot => (
                        <div key={slot} className="grid grid-cols-[120px_1fr] items-start border-b last:border-b-0 min-h-16">
                            <div className="p-3 text-sm font-semibold text-muted-foreground whitespace-nowrap self-stretch border-r h-full flex items-center">{slot}</div>
                            <div className="p-2 flex flex-wrap gap-2 self-start">
                               {weeklySchedule[currentDay]
                                 .filter(entry => entry.time === slot)
                                 .map(entry => (
                                     <div key={entry.id} className="flex flex-col items-center p-1 bg-muted rounded-md">
                                        <Badge>{entry.teamName}</Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {entry.venueName}
                                        </span>
                                     </div>
                                 ))
                               }
                            </div>
                        </div>
                     ))}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
