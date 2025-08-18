import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teams } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";

const timeSlots = [
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
];

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function SchedulesPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Plantillas de Horarios</h1>
          <p className="text-muted-foreground">
            Crea y gestiona las plantillas de horarios de entrenamiento semanales para tus equipos.
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
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 flex-1">
        <Card>
            <CardHeader>
                <CardTitle>Equipos</CardTitle>
                <CardDescription>Arrastra un equipo a la parrilla para asignarle un horario.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {teams.map(team => (
                    <div key={team.id} className="p-3 rounded-lg border bg-card cursor-grab">
                       <p className="font-semibold">{team.name}</p>
                       <p className="text-sm text-muted-foreground">{team.category}</p>
                    </div>
                ))}
                {teams.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Aún no has creado equipos.
                    </p>
                )}
            </CardContent>
        </Card>
        <div className="overflow-x-auto">
          <Card className="min-w-[1200px]">
            <div className="grid grid-cols-8 border-b">
                <div className="p-3 font-semibold text-muted-foreground text-sm">Horas</div>
                {daysOfWeek.map(day => (
                    <div key={day} className="p-3 font-semibold text-center text-muted-foreground text-sm border-l">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-1">
            {timeSlots.map(slot => (
                <div key={slot} className="grid grid-cols-8 items-center border-b last:border-b-0">
                    <div className="p-3 text-sm font-semibold text-muted-foreground whitespace-nowrap">{slot}</div>
                    {daysOfWeek.map(day => (
                        <div key={`${day}-${slot}`} className="h-24 p-2 border-l bg-muted/20 hover:bg-muted/40 transition-colors">
                           {/* Drop zone */}
                        </div>
                    ))}
                </div>
             ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
