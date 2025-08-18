import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stats, players, events } from "@/lib/data";
import { ArrowUpRight, Users, Shield, Calendar, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const iconMap = {
  Users: Users,
  Shield: Shield,
  Calendar: Calendar,
  CircleDollarSign: CircleDollarSign,
};

export default function DashboardPage() {
  const today = new Date();
  const upcomingEvents = events.filter(event => event.date >= today).slice(0, 5);

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
              <CardTitle>Jugadores Recientes</CardTitle>
              <CardDescription>
                Resumen de jugadores añadidos recientemente al club.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/players">
                Ver Todos
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-right">Posición</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.slice(0, 5).map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="foto persona" />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{player.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{player.team}</TableCell>
                    <TableCell className="text-right">{player.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
            <CardDescription>
              Entrenamientos y partidos programados para los próximos días.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-muted p-2 rounded-md">
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
            ))}
             <Button asChild size="sm" className="w-full">
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
