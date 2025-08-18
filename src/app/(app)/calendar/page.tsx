import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { events } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function CalendarView() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const placeholders = Array.from({ length: startDay }, (_, i) => i);
  
  const monthName = today.toLocaleString('es-ES', { month: 'long' });
  const year = today.getFullYear();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-xl capitalize">{monthName} {year}</CardTitle>
            <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          Programar Evento
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px border-t border-l border-border bg-border">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center font-semibold py-2 bg-card text-muted-foreground text-sm">{day}</div>
          ))}
          {placeholders.map(i => <div key={`placeholder-${i}`} className="bg-card min-h-[120px]"></div>)}
          {days.map(day => {
             const dayEvents = events.filter(e => e.date.getDate() === day && e.date.getMonth() === today.getMonth());
             return (
              <div key={day} className="p-2 bg-card min-h-[120px] flex flex-col gap-1">
                <span className="font-bold">{day}</span>
                {dayEvents.map(event => (
                  <div key={event.id} className="text-xs p-1 rounded-md bg-muted">
                    <p className="font-semibold truncate">{event.team}</p>
                    <Badge variant={event.type === 'Partido' ? 'destructive' : 'secondary'} className="w-full justify-center mt-1">{event.type}</Badge>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
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
          Consulta y gestiona todos los entrenamientos y partidos.
        </p>
      </div>
      <CalendarView />
    </div>
  )
}
