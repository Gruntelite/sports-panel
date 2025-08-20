
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
import { Loader2, CircleDollarSign, AlertTriangle, CheckCircle2, FileText, PlusCircle, MoreHorizontal } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, where, addDoc } from "firebase/firestore";
import type { Player, Team, OneTimePayment } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function TreasuryDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);

  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  
  const [stats, setStats] = useState({
      pending: 0,
      totalFees: 0,
  });

  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [newPaymentConcept, setNewPaymentConcept] = useState("");
  const [newPaymentDescription, setNewPaymentDescription] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | string>("");
  const [selectedTeamsForPayment, setSelectedTeamsForPayment] = useState<string[]>([]);
  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);


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
      
      const paymentsQuery = query(collection(db, "clubs", clubId, "oneTimePayments"));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OneTimePayment));
      setOneTimePayments(paymentsList);

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
  
  const handleCreatePayment = async () => {
    if (!clubId || !newPaymentConcept || !newPaymentAmount || selectedTeamsForPayment.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "El concepto, la cantidad y al menos un equipo destinatario son obligatorios." });
        return;
    }
    setSaving(true);
    try {
        const paymentData: Omit<OneTimePayment, 'id'> = {
            concept: newPaymentConcept,
            description: newPaymentDescription,
            amount: Number(newPaymentAmount),
            status: "pending",
            issueDate: new Date().toISOString(),
            targetTeamIds: selectedTeamsForPayment,
        };

        await addDoc(collection(db, "clubs", clubId, "oneTimePayments"), paymentData);
        toast({ title: "Pago creado", description: "El nuevo pago puntual se ha guardado correctamente." });
        
        setIsCreatePaymentOpen(false);
        setNewPaymentConcept("");
        setNewPaymentDescription("");
        setNewPaymentAmount("");
        setSelectedTeamsForPayment([]);

        fetchData(clubId);

    } catch (error) {
        console.error("Error creating payment:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear el pago." });
    } finally {
        setSaving(false);
    }
  }


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

  const getTargetTeamNames = (teamIds: string[]): string => {
    if (teamIds.length === teams.length) return "Todos los equipos";
    if (teamIds.length > 2) return `${teamIds.length} equipos`;
    return teamIds.map(id => teams.find(t => t.id === id)?.name || id).join(', ');
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
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
                <TabsTrigger value="other">Pagos Adicionales</TabsTrigger>
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
                            <TableCell>{player.monthlyFee ? `${player.monthlyFee.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}` : 'No definida'}</TableCell>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pagos Puntuales</CardTitle>
                <CardDescription>
                  Crea y gestiona cobros únicos para campus, torneos, material, etc.
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreatePaymentOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Nuevo Pago
              </Button>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha de Emisión</TableHead>
                    <TableHead>Destinatarios</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oneTimePayments.length > 0 ? (
                    oneTimePayments.map((payment) => {
                      const status = getStatusVariant(payment.status);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.concept}</TableCell>
                          <TableCell>{payment.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</TableCell>
                          <TableCell>{new Date(payment.issueDate).toLocaleDateString('es-ES')}</TableCell>
                          <TableCell>{getTargetTeamNames(payment.targetTeamIds)}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {getStatusText(payment.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No has creado ningún pago puntual todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    <Dialog open={isCreatePaymentOpen} onOpenChange={setIsCreatePaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Pago Puntual</DialogTitle>
            <DialogDescription>
              Define los detalles del cobro único que quieres generar. Se notificará a los equipos seleccionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-concept">Concepto</Label>
              <Input id="payment-concept" placeholder="p.ej., Inscripción Campus Verano" value={newPaymentConcept} onChange={(e) => setNewPaymentConcept(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-description">Descripción (Opcional)</Label>
              <Textarea id="payment-description" placeholder="Información adicional sobre el pago." value={newPaymentDescription} onChange={(e) => setNewPaymentDescription(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="payment-amount">Cantidad (€)</Label>
              <Input id="payment-amount" type="number" placeholder="30.00" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label>Destinatarios</Label>
               <Popover open={isTeamSelectOpen} onOpenChange={setIsTeamSelectOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {selectedTeamsForPayment.length > 0 ? getTargetTeamNames(selectedTeamsForPayment) : "Seleccionar equipos..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar equipo..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron equipos.</CommandEmpty>
                      <CommandGroup>
                        {teams.map((team) => (
                          <CommandItem
                            key={team.id}
                            value={team.name}
                            onSelect={() => {
                              const isSelected = selectedTeamsForPayment.includes(team.id);
                              if (isSelected) {
                                setSelectedTeamsForPayment(selectedTeamsForPayment.filter(id => id !== team.id));
                              } else {
                                setSelectedTeamsForPayment([...selectedTeamsForPayment, team.id]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTeamsForPayment.includes(team.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {team.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreatePayment} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
