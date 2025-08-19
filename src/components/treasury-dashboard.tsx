
"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CircleDollarSign, AlertTriangle, CheckCircle2, FileText, PlusCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, where } from "firebase/firestore";
import type { Player, Team } from "@/lib/types";
import { Button } from "./ui/button";

export function TreasuryDashboard() {
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  
  const [stats, setStats] = useState({
      pending: 0,
      totalFees: 0,
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchData(currentClubId);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let currentPlayers = [...players];
    if (selectedTeam !== "all") {
        currentPlayers = players.filter(p => p.teamId === selectedTeam);
    }
    setFilteredPlayers(currentPlayers);
  }, [selectedTeam, players]);


  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
      const teamsQuery = query(collection(db, "clubs", clubId, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);

      const playersQuery = query(collection(db, "clubs", clubId, "players"));
      const playersSnapshot = await getDocs(playersQuery);
      const playersList: Player[] = playersSnapshot.docs.map(doc => {
          const data = doc.data();
          const team = teamsList.find(t => t.id === data.teamId);
          return {
              id: doc.id,
              ...data,
              teamName: team ? team.name : "Sin equipo",
              paymentStatus: data.paymentStatus || 'pending'
          } as Player
      });
      setPlayers(playersList);
      setFilteredPlayers(playersList);
      
      // Calculate Stats
      const pendingCount = playersList.reduce((acc, player) => {
          return acc + (player.monthlyFee || 0);
      }, 0);
      setStats({ pending: pendingCount, totalFees: 0 });

    } catch (error) {
      console.error("Error fetching treasury data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusVariant = (status?: 'paid' | 'pending' | 'overdue'): { variant: "default" | "secondary" | "destructive" | "outline" | null | undefined, icon: React.ElementType } => {
      switch (status) {
          case 'paid': return { variant: 'secondary', icon: CheckCircle2 };
          case 'pending': return { variant: 'outline', icon: AlertTriangle };
          case 'overdue': return { variant: 'destructive', icon: AlertTriangle };
          default: return { variant: 'outline', icon: AlertTriangle };
      }
  }
  
  const getStatusText = (status?: 'paid' | 'pending' | 'overdue'): string => {
      switch (status) {
          case 'paid': return 'Pagado';
          case 'pending': return 'Pendiente';
          case 'overdue': return 'Atrasado';
          default: return 'Pendiente';
      }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cuotas Pendientes</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.pending.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">Total de cuotas por cobrar este mes.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos (Mes)</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">0,00 €</div>
                     <p className="text-xs text-muted-foreground">Total de ingresos por cuotas este mes.</p>
                </CardContent>
            </Card>
        </div>
      <Tabs defaultValue="fees">
        <div className="flex items-center justify-between">
            <TabsList>
                <TabsTrigger value="fees">Cuotas de Jugadores</TabsTrigger>
                <TabsTrigger value="other" disabled>Pagos Adicionales</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por equipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los equipos</SelectItem>
                        {teams.map(team => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Cuotas Mensuales</CardTitle>
              <CardDescription>
                Supervisa el estado de pago de las cuotas de todos los jugadores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Cuota Mensual</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => {
                      const status = getStatusVariant(player.paymentStatus);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name} {player.lastName}</TableCell>
                            <TableCell>{player.teamName}</TableCell>
                            <TableCell>{player.monthlyFee ? `${player.monthlyFee} €` : 'No definida'}</TableCell>
                            <TableCell>
                                <Badge variant={status.variant}>
                                    <StatusIcon className="mr-1 h-3 w-3" />
                                    {getStatusText(player.paymentStatus)}
                                </Badge>
                            </TableCell>
                        </TableRow>
                      )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="other" className="mt-4">
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
                <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <h3 className="text-lg font-bold tracking-tight">
                    Pagos Puntuales
                  </h3>
                  <p className="text-sm max-w-sm mx-auto">
                    Próximamente podrás crear cobros independientes para campus, torneos, material deportivo y más.
                  </p>
                  <Button size="sm" className="mt-4" disabled><PlusCircle className="mr-2 h-4 w-4" />Crear Nuevo Pago</Button>
                </div>
              </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
