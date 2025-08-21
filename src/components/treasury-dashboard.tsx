
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
import { Loader2, CircleDollarSign, AlertTriangle, CheckCircle2, FileText, PlusCircle, MoreHorizontal, Edit, Link, Trash2, Save, Settings } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, where, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Player, Team, OneTimePayment, User } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function TreasuryDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);

  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  
  const [stats, setStats] = useState({
      expectedIncome: 0,
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [paymentData, setPaymentData] = useState<Partial<OneTimePayment>>({});
  const [billingDay, setBillingDay] = useState(1);
  const [isSavingBillingDay, setIsSavingBillingDay] = useState(false);

  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<OneTimePayment | null>(null);


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
      const settingsRef = doc(db, "clubs", clubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
          setBillingDay(settingsSnap.data().billingDay || 1);
      }

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
          } as Player
      });
      setPlayers(playersList);
      setFilteredPlayers(playersList);

      const usersQuery = query(collection(db, "clubs", clubId, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setUsers(usersList);
      
      const paymentsQuery = query(collection(db, "clubs", clubId, "oneTimePayments"));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OneTimePayment));
      setOneTimePayments(paymentsList);

      const expectedTotal = playersList.reduce((acc, player) => {
          return acc + (player.monthlyFee || 0);
      }, 0);
      setStats({ expectedIncome: expectedTotal });

    } catch (error) {
      console.error("Error fetching treasury data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (mode: 'add' | 'edit', payment?: OneTimePayment) => {
    setModalMode(mode);
    if (mode === 'edit' && payment) {
        setPaymentData(payment);
    } else {
        setPaymentData({
            concept: "",
            description: "",
            amount: "",
            targetTeamIds: [],
            targetUserIds: [],
        });
    }
    setIsPaymentModalOpen(true);
  }
  
  const handleSavePayment = async () => {
    if (!clubId || !paymentData.concept || !paymentData.amount || ((paymentData.targetTeamIds?.length || 0) === 0 && (paymentData.targetUserIds?.length || 0) === 0)) {
        toast({ variant: "destructive", title: "Error", description: "El concepto, la cantidad y al menos un destinatario son obligatorios." });
        return;
    }
    setSaving(true);
    
    const dataToSave = {
        ...paymentData,
        amount: Number(paymentData.amount),
    };

    try {
        if (modalMode === 'edit' && paymentData.id) {
            const paymentRef = doc(db, "clubs", clubId, "oneTimePayments", paymentData.id);
            await updateDoc(paymentRef, dataToSave);
            toast({ title: "Pago actualizado", description: "El pago puntual se ha actualizado correctamente." });
        } else {
            await addDoc(collection(db, "clubs", clubId, "oneTimePayments"), {
                ...dataToSave,
                status: "pending",
                issueDate: new Date().toISOString(),
            });
            toast({ title: "Pago creado", description: "El nuevo pago puntual se ha guardado correctamente." });
        }
        
        setIsPaymentModalOpen(false);
        fetchData(clubId);

    } catch (error) {
        console.error("Error creating/updating payment:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el pago." });
    } finally {
        setSaving(false);
    }
  }

  const handleDeletePayment = async () => {
    if (!clubId || !paymentToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "clubs", clubId, "oneTimePayments", paymentToDelete.id));
      toast({ title: "Pago eliminado", description: "El pago ha sido eliminado." });
      setPaymentToDelete(null);
      fetchData(clubId);
    } catch(e) {
      console.error("Error deleting payment", e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el pago." });
    } finally {
      setSaving(false);
    }

  }

  const handleSaveBillingDay = async (day: number) => {
    if(!clubId) return;
    setIsSavingBillingDay(true);
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await updateDoc(settingsRef, { billingDay: day });
        setBillingDay(day);
        toast({ title: "Día de Cobro Guardado", description: `Las cuotas se procesarán el día ${day} de cada mes.`});
    } catch (e) {
        console.error("Error saving billing day", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el día de cobro." });
    } finally {
        setIsSavingBillingDay(false);
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
    if (!teamIds || teamIds.length === 0) return "";
    if (teamIds.length === teams.length) return "Todos los equipos";
    if (teamIds.length > 2) return `${teamIds.length} equipos`;
    return teamIds.map(id => teams.find(t => t.id === id)?.name || id).join(', ');
  }

  const getTargetUserNames = (userIds: string[]): string => {
    if (!userIds || userIds.length === 0) return "";
    if (userIds.length > 2) return `${userIds.length} usuarios`;
    return userIds.map(id => users.find(u => u.id === id)?.name || id).join(', ');
  }

  const getCombinedTargetNames = (payment: OneTimePayment): string => {
      const teamNames = getTargetTeamNames(payment.targetTeamIds || []);
      const userNames = getTargetUserNames(payment.targetUserIds || []);

      if (teamNames && userNames) {
          return `${teamNames}, ${userNames}`;
      }
      return teamNames || userNames || 'N/A';
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
                    <CardTitle className="text-sm font-medium">Ingresos Previstos (Mes)</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.expectedIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">Suma de todas las cuotas mensuales de jugadores.</p>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/>Configuración de Cobros</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Label htmlFor="billing-day">Día de cobro de cuotas mensuales:</Label>
                    <Select value={billingDay.toString()} onValueChange={(value) => handleSaveBillingDay(Number(value))} disabled={isSavingBillingDay}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {isSavingBillingDay && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
            </CardContent>
        </Card>
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
              <CardTitle>Listado de Cuotas Mensuales</CardTitle>
              <CardDescription>
                Consulta las cuotas asignadas a cada jugador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Cuota Mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => {
                      return (
                        <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name} {player.lastName}</TableCell>
                            <TableCell>{player.teamName}</TableCell>
                            <TableCell>{player.monthlyFee ? `${player.monthlyFee.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}` : 'No definida'}</TableCell>
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
              <Button onClick={() => handleOpenPaymentModal('add')}>
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
                    <TableHead className="text-right">Acciones</TableHead>
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
                          <TableCell>{getCombinedTargetNames(payment)}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {getStatusText(payment.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => handleOpenPaymentModal('edit', payment)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled>
                                    <Link className="mr-2 h-4 w-4" />
                                    Generar Link de Pago
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onSelect={() => setPaymentToDelete(payment)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
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
    <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Crear Nuevo Pago Puntual' : 'Editar Pago Puntual'}</DialogTitle>
            <DialogDescription>
              Define los detalles del cobro único que quieres generar. Se notificará a los destinatarios seleccionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-concept">Concepto</Label>
              <Input id="payment-concept" placeholder="p.ej., Inscripción Campus Verano" value={paymentData.concept || ''} onChange={(e) => setPaymentData(prev => ({...prev, concept: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-description">Descripción (Opcional)</Label>
              <Textarea id="payment-description" placeholder="Información adicional sobre el pago." value={paymentData.description || ''} onChange={(e) => setPaymentData(prev => ({...prev, description: e.target.value}))} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="payment-amount">Cantidad (€)</Label>
              <Input id="payment-amount" type="number" placeholder="30.00" value={paymentData.amount || ''} onChange={(e) => setPaymentData(prev => ({...prev, amount: e.target.value}))} />
            </div>
             <div className="space-y-2">
              <Label>Equipos Destinatarios</Label>
               <Popover open={isTeamSelectOpen} onOpenChange={setIsTeamSelectOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {(paymentData.targetTeamIds?.length || 0) > 0 ? getTargetTeamNames(paymentData.targetTeamIds!) : "Seleccionar equipos..."}
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
                              const selected = paymentData.targetTeamIds || [];
                              const isSelected = selected.includes(team.id);
                              if (isSelected) {
                                setPaymentData(prev => ({...prev, targetTeamIds: selected.filter(id => id !== team.id)}));
                              } else {
                                setPaymentData(prev => ({...prev, targetTeamIds: [...selected, team.id]}));
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                paymentData.targetTeamIds?.includes(team.id) ? "opacity-100" : "opacity-0"
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
            <div className="space-y-2">
              <Label>Usuarios Individuales</Label>
               <Popover open={isUserSelectOpen} onOpenChange={setIsUserSelectOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {(paymentData.targetUserIds?.length || 0) > 0 ? getTargetUserNames(paymentData.targetUserIds!) : "Seleccionar usuarios..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar usuario..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                               const selected = paymentData.targetUserIds || [];
                               const isSelected = selected.includes(user.id);
                               if (isSelected) {
                                  setPaymentData(prev => ({...prev, targetUserIds: selected.filter(id => id !== user.id)}));
                               } else {
                                  setPaymentData(prev => ({...prev, targetUserIds: [...selected, user.id]}));
                               }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                paymentData.targetUserIds?.includes(user.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {user.name}
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
            <Button onClick={handleSavePayment} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el pago "{paymentToDelete?.concept}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
