
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teams as initialTeams } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScheduleEntry = {
  teamId: string;
  teamName: string;
  time: string;
};

type DailySchedule = ScheduleEntry[];

type WeeklySchedule = {
  Lunes: DailySchedule;
  Martes: DailySchedule;
  Miércoles: DailySchedule;
  Jueves: DailySchedule;
  Viernes: DailySchedule;
  Sábado: DailySchedule;
  Domingo: DailySchedule;
};

type TeamTime = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
type DayOfWeek = typeof daysOfWeek[number];


export default function SchedulesPage() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: [],
  });
  const [teamTimes, setTeamTimes] = useState<TeamTime[]>(initialTeams.map(t => ({ id: t.id, name: t.name, startTime: '', endTime: '' })));
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("23:00");

  const handleTimeChange = (teamId: string, type: 'startTime' | 'endTime', value: string) => {
    setTeamTimes(prev => prev.map(t => t.id === teamId ? { ...t, [type]: value } : t));
  };
  
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
  const currentDay: DayOfWeek = daysOfWeek[currentDayIndex];

  const handleAssignSchedules = () => {
    const newDailySchedule: DailySchedule = [];
    teamTimes.forEach(team => {
      if(team.startTime && team.endTime) {
        const start = new Date(`1970-01-01T${team.startTime}`);
        const end = new Date(`1970-01-01T${team.endTime}`);
        let current = start;

        while(current < end) {
          const next = new Date(current.getTime() + 60 * 60 * 1000);
          const timeSlot = `${current.toTimeString().substring(0,5)} - ${next.toTimeString().substring(0,5)}`;
          if (timeSlots.includes(timeSlot)) {
            newDailySchedule.push({ teamId: team.id, teamName: team.name, time: timeSlot });
          }
          current = next;
        }
      }
    });

    setSchedule(prev => ({
      ...prev,
      [currentDay]: newDailySchedule,
    }));
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
        setCurrentDayIndex((prev) => (prev + 1) % daysOfWeek.length);
    } else {
        setCurrentDayIndex((prev) => (prev - 1 + daysOfWeek.length) % daysOfWeek.length);
    }
  };

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
                    <SelectItem value="preseason">Plantilla Pretemporada</SelectItem>
                </SelectContent>
            </Select>
            <Button className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                Crear Plantilla
            </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 flex-1">
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Horarios</CardTitle>
                <CardDescription>Define el rango horario y asigna tiempos a tus equipos para el día seleccionado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
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

                <div className="space-y-4">
                    <h3 className="font-semibold">Asignar Tiempos a Equipos</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {teamTimes.map(team => (
                        <div key={team.id} className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor={`team-${team.id}`} className="col-span-1 truncate">{team.name}</Label>
                            <Input id={`team-${team.id}-start`} type="time" value={team.startTime} onChange={(e) => handleTimeChange(team.id, 'startTime', e.target.value)} />
                            <Input id={`team-${team.id}-end`} type="time" value={team.endTime} onChange={(e) => handleTimeChange(team.id, 'endTime', e.target.value)} />
                        </div>
                    ))}
                    </div>
                </div>
                 <Button onClick={handleAssignSchedules} className="w-full">
                    <Clock className="mr-2 h-4 w-4" />
                    Asignar Horarios
                </Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                    <CardTitle className="text-xl capitalize w-28 text-center">{currentDay}</CardTitle>
                    <Button variant="outline" size="icon" onClick={() => navigateDay('next')}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[120px_1fr]">
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b border-r">Horas</div>
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b">Equipos</div>
                    </div>
                    <div className="grid grid-cols-1 max-h-[500px] overflow-y-auto">
                    {timeSlots.map(slot => (
                        <div key={slot} className="grid grid-cols-[120px_1fr] items-center border-b last:border-b-0 min-h-16">
                            <div className="p-3 text-sm font-semibold text-muted-foreground whitespace-nowrap self-start border-r">{slot}</div>
                            <div className="p-2 flex flex-wrap gap-2">
                               {schedule[currentDay]
                                 .filter(entry => entry.time === slot)
                                 .map(entry => (
                                     <Badge key={entry.teamId}>{entry.teamName}</Badge>
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
