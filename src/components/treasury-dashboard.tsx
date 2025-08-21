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
import { Loader2, CircleDollarSign, AlertTriangle, CheckCircle2, FileText, PlusCircle, MoreHorizontal, Edit, Link, Trash2, Save, Settings, Handshake, TrendingUp, TrendingDown, Repeat, CalendarIcon } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, where, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Player, Team, OneTimePayment, User, Sponsorship, Coach, RecurringExpense, OneOffExpense } from "@/lib/types";
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
import { format, getMonth, getYear, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

function FinancialChart({ players, oneTimePayments, coaches, sponsorships, recurringExpenses, oneOffExpenses }: { 
    players: Player[], 
    oneTimePayments: OneTimePayment[], 
    coaches: Coach[], 
    sponsorships: Sponsorship[], 
    recurringExpenses: RecurringExpense[], 
    oneOffExpenses: OneOffExpense[] 
}) {
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [chartData, setChartData] = useState<any[]>([]);
    
    useEffect(() => {
        const processData = () => {
            const monthlyData: { [key: number]: { Ingresos: number, Gastos: number } } = {};
            
            for(let i=0; i<12; i++) {
                monthlyData[i] = { Ingresos: 0, Gastos: 0 };
            }
            
            // Income
            players.forEach(p => {
                if(p.monthlyFee) {
                    for(let i=0; i<12; i++) monthlyData[i].Ingresos += p.monthlyFee;
                }
            });
            oneTimePayments.forEach(p => {
                const pDate = parseISO(p.issueDate);
                if(getYear(pDate) === year) {
                    const pMonth = getMonth(pDate);
                    const numTargets = (p.targetTeamIds?.length || 0) + (p.targetUserIds?.length || 0);
                    monthlyData[pMonth].Ingresos += Number(p.amount) * numTargets;
                }
            });
            sponsorships.forEach(s => {
                if(s.frequency === 'monthly') {
                    for(let i=0; i<12; i++) monthlyData[i].Ingresos += s.amount;
                } else { // annual
                     monthlyData[0].Ingresos += s.amount;
                }
            });

            // Expenses
            coaches.forEach(c => {
                 if(c.monthlyPayment) {
                    for(let i=0; i<12; i++) monthlyData[i].Gastos += c.monthlyPayment;
                }
            });
            recurringExpenses.forEach(e => {
                 for(let i=0; i<12; i++) {
                    if((i + 1) % e.recurrenceInMonths === 0) {
                       monthlyData[i].Gastos += e.amount;
                    }
                 }
            });
            oneOffExpenses.forEach(e => {
                const eDate = parseISO(e.date);
                if(getYear(eDate) === year) {
                    const eMonth = getMonth(eDate);
                    monthlyData[eMonth].Gastos += e.amount;
                }
            });
            
            const formattedData = Object.keys(monthlyData).map(monthIndex => ({
                name: format(new Date(year, Number(monthIndex)), "MMM", { locale: es }),
                Ingresos: monthlyData[Number(monthIndex)].Ingresos,
                Gastos: monthlyData[Number(monthIndex)].Gastos
            }));
            setChartData(formattedData);
        };
        processData();
    }, [year, players, oneTimePayments, coaches, sponsorships, recurringExpenses, oneOffExpenses]);

    const chartConfig: ChartConfig = {
        Ingresos: { label: "Ingresos", color: "hsl(var(--chart-1))" },
        Gastos: { label: "Gastos", color: "hsl(var(--chart-2))" }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Análisis Financiero</CardTitle>
                    <CardDescription>Evolución de ingresos y gastos durante el año.</CardDescription>
                </div>
                 <Select value={year.toString()} onValueChange={(val) => setYear(Number(val))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-Ingresos)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-Ingresos)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillGastos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-Gastos)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-Gastos)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                          tickFormatter={(value) =>
                            `€${
                              typeof value === 'number'
                                ? new Intl.NumberFormat('es-ES', {
                                    notation: 'compact',
                                    compactDisplay: 'short',
                                  }).format(value)
                                : ''
                            }`
                          }
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Area dataKey="Ingresos" type="monotone" fill="url(#fillIngresos)" stroke="var(--color-Ingresos)" stackId="1" />
                        <Area dataKey="Gastos" type="monotone" fill="url(#fillGastos)" stroke="var(--color-Gastos)" stackId="2" />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}


export function TreasuryDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [oneOffExpenses, setOneOffExpenses] = useState<OneOffExpense[]>([]);

  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  
  const [stats, setStats] = useState({
      expectedIncome: 0,
      coachPayments: 0,
      sponsorshipIncome: 0,
      monthlyExpenses: 0,
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState<'add' | 'edit'>('add');
  const [paymentData, setPaymentData] = useState<Partial<OneTimePayment>>({});
  
  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<OneTimePayment | null>(null);
  
  const [isSponsorshipModalOpen, setIsSponsorshipModalOpen] = useState(false);
  const [sponsorshipModalMode, setSponsorshipModalMode] = useState<'add' | 'edit'>('add');
  const [sponsorshipData, setSponsorshipData] = useState<Partial<Sponsorship>>({});
  const [sponsorshipToDelete, setSponsorshipToDelete] = useState<Sponsorship | null>(null);
  
  const [isRecurringExpenseModalOpen, setIsRecurringExpenseModalOpen] = useState(false);
  const [recurringExpenseModalMode, setRecurringExpenseModalMode] = useState<'add' | 'edit'>('add');
  const [recurringExpenseData, setRecurringExpenseData] = useState<Partial<RecurringExpense>>({});
  const [recurringExpenseToDelete, setRecurringExpenseToDelete] = useState<RecurringExpense | null>(null);
  
  const [isOneOffExpenseModalOpen, setIsOneOffExpenseModalOpen] = useState(false);
  const [oneOffExpenseModalMode, setOneOffExpenseModalMode] = useState<'add' | 'edit'>('add');
  const [oneOffExpenseData, setOneOffExpenseData] = useState<Partial<OneOffExpense>>({});
  const [oneOffExpenseToDelete, setOneOffExpenseToDelete] = useState<OneOffExpense | null>(null);


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
      
      const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
      const coachesSnapshot = await getDocs(coachesQuery);
      const coachesList = coachesSnapshot.docs.map(doc => doc.data() as Coach);
      setCoaches(coachesList);

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
      
      const sponsorshipsQuery = query(collection(db, "clubs", clubId, "sponsorships"));
      const sponsorshipsSnapshot = await getDocs(sponsorshipsQuery);
      const sponsorshipsList = sponsorshipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsorship));
      setSponsorships(sponsorshipsList);
      
      const recurringExpensesQuery = query(collection(db, "clubs", clubId, "recurringExpenses"));
      const recurringExpensesSnapshot = await getDocs(recurringExpensesQuery);
      const recurringExpensesList = recurringExpensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringExpense));
      setRecurringExpenses(recurringExpensesList);
      
      const oneOffExpensesQuery = query(collection(db, "clubs", clubId, "oneOffExpenses"));
      const oneOffExpensesSnapshot = await getDocs(oneOffExpensesQuery);
      const oneOffExpensesList = oneOffExpensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OneOffExpense));
      setOneOffExpenses(oneOffExpensesList);


      const monthlyFeesTotal = playersList.reduce((acc, player) => acc + (player.monthlyFee || 0), 0);
      const coachPaymentsTotal = coachesList.reduce((acc, coach) => acc + (coach.monthlyPayment || 0), 0);
      const sponsorshipIncomeTotal = sponsorshipsList.filter(s => s.frequency === 'monthly').reduce((acc, s) => acc + s.amount, 0);

      const currentMonthIndex = getMonth(new Date()); // 0-indexed
      const oneTimePaymentsThisMonth = paymentsList
        .filter(payment => getMonth(new Date(payment.issueDate)) === currentMonthIndex)
        .reduce((acc, payment) => {
            const amount = typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amount);
            if (isNaN(amount)) return acc;
            
            const teamMemberCount = playersList.filter(p => payment.targetTeamIds?.includes(p.teamId || '')).length;
            const userCount = payment.targetUserIds?.length || 0;

            return acc + (amount * (teamMemberCount + userCount));
        }, 0);

      const expectedTotal = monthlyFeesTotal + oneTimePaymentsThisMonth;

      const recurringMonthlyExpenses = recurringExpensesList.reduce((acc, expense) => {
        if ((currentMonthIndex % expense.recurrenceInMonths) === 0) {
            return acc + expense.amount;
        }
        return acc;
      }, 0);
      const oneOffCurrentMonthExpenses = oneOffExpensesList.filter(e => getMonth(new Date(e.date)) === currentMonthIndex).reduce((acc, e) => acc + e.amount, 0);
      const totalMonthlyExpenses = recurringMonthlyExpenses + oneOffCurrentMonthExpenses;

      setStats({ 
        expectedIncome: expectedTotal,
        coachPayments: coachPaymentsTotal,
        sponsorshipIncome: sponsorshipIncomeTotal,
        monthlyExpenses: totalMonthlyExpenses
      });

    } catch (error) {
      console.error("Error fetching treasury data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (mode: 'add' | 'edit', payment?: OneTimePayment) => {
    setPaymentModalMode(mode);
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
        if (paymentModalMode === 'edit' && paymentData.id) {
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

  const handleOpenSponsorshipModal = (mode: 'add' | 'edit', sponsorship?: Sponsorship) => {
    setSponsorshipModalMode(mode);
    setSponsorshipData(sponsorship || { sponsorName: "", amount: "", frequency: "monthly", description: "", teamId: "all" });
    setIsSponsorshipModalOpen(true);
  };
  
  const handleSaveSponsorship = async () => {
    if (!clubId || !sponsorshipData.sponsorName || !sponsorshipData.amount) {
      toast({ variant: "destructive", title: "Error", description: "El nombre del patrocinador y la cantidad son obligatorios." });
      return;
    }
    setSaving(true);
    
    const teamId = sponsorshipData.teamId === 'all' ? null : sponsorshipData.teamId;
    const teamName = teamId ? teams.find(t => t.id === teamId)?.name : 'Todo el club';

    const dataToSave = {
      ...sponsorshipData,
      amount: Number(sponsorshipData.amount),
      teamId,
      teamName,
    };
    
    try {
      if (sponsorshipModalMode === 'edit' && sponsorshipData.id) {
        const sponsorshipRef = doc(db, "clubs", clubId, "sponsorships", sponsorshipData.id);
        await updateDoc(sponsorshipRef, dataToSave);
        toast({ title: "Patrocinio actualizado" });
      } else {
        await addDoc(collection(db, "clubs", clubId, "sponsorships"), dataToSave);
        toast({ title: "Patrocinio añadido" });
      }
      setIsSponsorshipModalOpen(false);
      fetchData(clubId);
    } catch (error) {
      console.error("Error saving sponsorship:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el patrocinio." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSponsorship = async () => {
    if (!clubId || !sponsorshipToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "clubs", clubId, "sponsorships", sponsorshipToDelete.id));
      toast({ title: "Patrocinio eliminado" });
      setSponsorshipToDelete(null);
      fetchData(clubId);
    } catch (error) {
      console.error("Error deleting sponsorship:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el patrocinio." });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRecurringExpenseModal = (mode: 'add' | 'edit', expense?: RecurringExpense) => {
    setRecurringExpenseModalMode(mode);
    setRecurringExpenseData(expense || { title: "", amount: "", recurrenceInMonths: 1 });
    setIsRecurringExpenseModalOpen(true);
  };
  
  const handleSaveRecurringExpense = async () => {
    if (!clubId || !recurringExpenseData.title || !recurringExpenseData.amount) {
      toast({ variant: "destructive", title: "Error", description: "El título y la cantidad son obligatorios." });
      return;
    }
    setSaving(true);
    
    const dataToSave = { ...recurringExpenseData, amount: Number(recurringExpenseData.amount) };
    
    try {
      if (recurringExpenseModalMode === 'edit' && recurringExpenseData.id) {
        await updateDoc(doc(db, "clubs", clubId, "recurringExpenses", recurringExpenseData.id), dataToSave);
        toast({ title: "Gasto recurrente actualizado" });
      } else {
        await addDoc(collection(db, "clubs", clubId, "recurringExpenses"), dataToSave);
        toast({ title: "Gasto recurrente añadido" });
      }
      setIsRecurringExpenseModalOpen(false);
      fetchData(clubId);
    } catch (error) {
      console.error("Error saving recurring expense:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el gasto recurrente." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecurringExpense = async () => {
    if (!clubId || !recurringExpenseToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "clubs", clubId, "recurringExpenses", recurringExpenseToDelete.id));
      toast({ title: "Gasto recurrente eliminado" });
      setRecurringExpenseToDelete(null);
      fetchData(clubId);
    } catch (error) {
      console.error("Error deleting recurring expense:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el gasto." });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOneOffExpenseModal = (mode: 'add' | 'edit', expense?: OneOffExpense) => {
    setOneOffExpenseModalMode(mode);
    setOneOffExpenseData(expense || { title: "", amount: "", date: new Date().toISOString().split('T')[0] });
    setIsOneOffExpenseModalOpen(true);
  };

  const handleSaveOneOffExpense = async () => {
    if (!clubId || !oneOffExpenseData.title || !oneOffExpenseData.amount) {
      toast({ variant: "destructive", title: "Error", description: "El título y la cantidad son obligatorios." });
      return;
    }
    setSaving(true);

    const dataToSave = { ...oneOffExpenseData, amount: Number(oneOffExpenseData.amount) };

    try {
      if (oneOffExpenseModalMode === 'edit' && oneOffExpenseData.id) {
        await updateDoc(doc(db, "clubs", clubId, "oneOffExpenses", oneOffExpenseData.id), dataToSave);
        toast({ title: "Gasto actualizado" });
      } else {
        await addDoc(collection(db, "clubs", clubId, "oneOffExpenses"), dataToSave);
        toast({ title: "Gasto añadido" });
      }
      setIsOneOffExpenseModalOpen(false);
      fetchData(clubId);
    } catch (error) {
      console.error("Error saving one-off expense:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el gasto." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOneOffExpense = async () => {
    if (!clubId || !oneOffExpenseToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "clubs", clubId, "oneOffExpenses", oneOffExpenseToDelete.id));
      toast({ title: "Gasto eliminado" });
      setOneOffExpenseToDelete(null);
      fetchData(clubId);
    } catch (error) {
      console.error("Error deleting one-off expense:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el gasto." });
    } finally {
      setSaving(false);
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
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.expectedIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">Suma de cuotas mensuales y pagos puntuales del mes.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagos a Entrenadores (Mes)</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.coachPayments.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">Suma de todos los pagos a entrenadores.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos por Patrocinios (Mes)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.sponsorshipIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">Suma de todos los patrocinios mensuales.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos Mensuales</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.monthlyExpenses.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">Suma de gastos recurrentes y puntuales este mes.</p>
                </CardContent>
            </Card>
        </div>
        
        <FinancialChart 
            players={players} 
            oneTimePayments={oneTimePayments}
            coaches={coaches}
            sponsorships={sponsorships}
            recurringExpenses={recurringExpenses}
            oneOffExpenses={oneOffExpenses}
        />
        
      <Tabs defaultValue="fees">
        <div className="flex items-center justify-between">
            <TabsList>
                <TabsTrigger value="fees">Cuotas de Jugadores</TabsTrigger>
                <TabsTrigger value="sponsorships">Patrocinios</TabsTrigger>
                <TabsTrigger value="expenses">Gastos</TabsTrigger>
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
        <TabsContent value="sponsorships" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gestión de Patrocinios</CardTitle>
                    <CardDescription>
                    Añade, edita y gestiona los patrocinios del club.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenSponsorshipModal('add')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Patrocinio
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Patrocinador</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Equipo Destinatario</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {sponsorships.length > 0 ? (
                        sponsorships.map((spon) => (
                        <TableRow key={spon.id}>
                            <TableCell className="font-medium">{spon.sponsorName}</TableCell>
                            <TableCell>{spon.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})} ({spon.frequency === 'monthly' ? 'Mes' : 'Año'})</TableCell>
                            <TableCell>
                                <Badge variant="secondary">{spon.teamName || 'Todo el club'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleOpenSponsorshipModal('edit', spon)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onSelect={() => setSponsorshipToDelete(spon)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            No has añadido ningún patrocinio todavía.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="expenses" className="mt-4 grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gastos Recurrentes</CardTitle>
                        <CardDescription>Gastos fijos como alquileres o suministros.</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenRecurringExpenseModal('add')}><PlusCircle className="mr-2 h-4 w-4" />Añadir</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Importe</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {recurringExpenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.title} <span className="text-xs text-muted-foreground">(cada {expense.recurrenceInMonths} mes/es)</span></TableCell>
                                    <TableCell>{expense.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent><DropdownMenuItem onSelect={() => handleOpenRecurringExpenseModal('edit', expense)}>Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setRecurringExpenseToDelete(expense)}>Eliminar</DropdownMenuItem></DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gastos Puntuales</CardTitle>
                        <CardDescription>Gastos únicos para material, eventos, etc.</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenOneOffExpenseModal('add')}><PlusCircle className="mr-2 h-4 w-4" />Añadir</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Importe</TableHead><TableHead>Fecha</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                        <TableBody>
                             {oneOffExpenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.title}</TableCell>
                                    <TableCell>{expense.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</TableCell>
                                    <TableCell>{format(new Date(expense.date), "LLL yyyy", { locale: es })}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent><DropdownMenuItem onSelect={() => handleOpenOneOffExpenseModal('edit', expense)}>Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setOneOffExpenseToDelete(expense)}>Eliminar</DropdownMenuItem></DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
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
            <DialogTitle>{paymentModalMode === 'add' ? 'Crear Nuevo Pago Puntual' : 'Editar Pago Puntual'}</DialogTitle>
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
    
    <Dialog open={isSponsorshipModalOpen} onOpenChange={setIsSponsorshipModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sponsorshipModalMode === 'add' ? 'Añadir Nuevo Patrocinio' : 'Editar Patrocinio'}</DialogTitle>
            <DialogDescription>
              Rellena la información del acuerdo de patrocinio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="spon-name">Nombre del Patrocinador</Label>
              <Input id="spon-name" placeholder="p.ej., Empresa S.L." value={sponsorshipData.sponsorName || ''} onChange={(e) => setSponsorshipData(prev => ({...prev, sponsorName: e.target.value}))} />
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="spon-amount">Cantidad (€)</Label>
                <Input id="spon-amount" type="number" value={sponsorshipData.amount || ''} onChange={(e) => setSponsorshipData(prev => ({...prev, amount: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spon-freq">Frecuencia</Label>
                <Select value={sponsorshipData.frequency} onValueChange={(value: 'monthly' | 'annual') => setSponsorshipData(prev => ({...prev, frequency: value}))}>
                  <SelectTrigger id="spon-freq"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="spon-team">Equipo Destinatario</Label>
              <Select value={sponsorshipData.teamId || 'all'} onValueChange={(value) => setSponsorshipData(prev => ({...prev, teamId: value}))}>
                  <SelectTrigger id="spon-team"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el club</SelectItem>
                    {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spon-desc">Descripción (Opcional)</Label>
              <Textarea id="spon-desc" placeholder="Detalles del acuerdo, contacto, etc." value={sponsorshipData.description || ''} onChange={(e) => setSponsorshipData(prev => ({...prev, description: e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveSponsorship} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Patrocinio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!sponsorshipToDelete} onOpenChange={(open) => !open && setSponsorshipToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el patrocinio de "{sponsorshipToDelete?.sponsorName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSponsorship} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <Dialog open={isRecurringExpenseModalOpen} onOpenChange={setIsRecurringExpenseModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>{recurringExpenseModalMode === 'add' ? 'Añadir Gasto Recurrente' : 'Editar Gasto Recurrente'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2"><Label htmlFor="re-title">Concepto</Label><Input id="re-title" placeholder="p.ej., Alquiler de campos" value={recurringExpenseData.title || ''} onChange={(e) => setRecurringExpenseData(prev => ({...prev, title: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="re-amount">Importe (€)</Label><Input id="re-amount" type="number" value={recurringExpenseData.amount || ''} onChange={(e) => setRecurringExpenseData(prev => ({...prev, amount: e.target.value}))} /></div>
                    <div className="space-y-2"><Label htmlFor="re-recurrence">Se repite cada (meses)</Label><Input id="re-recurrence" type="number" value={recurringExpenseData.recurrenceInMonths || ''} onChange={(e) => setRecurringExpenseData(prev => ({...prev, recurrenceInMonths: Number(e.target.value)}))} /></div>
                </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose><Button onClick={handleSaveRecurringExpense} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar</Button></DialogFooter>
        </DialogContent>
    </Dialog>
    <AlertDialog open={!!recurringExpenseToDelete} onOpenChange={(open) => !open && setRecurringExpenseToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente el gasto recurrente "{recurringExpenseToDelete?.title}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRecurringExpense} disabled={saving}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>

    <Dialog open={isOneOffExpenseModalOpen} onOpenChange={setIsOneOffExpenseModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>{oneOffExpenseModalMode === 'add' ? 'Añadir Gasto Puntual' : 'Editar Gasto Puntual'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2"><Label htmlFor="oe-title">Concepto</Label><Input id="oe-title" placeholder="p.ej., Compra de balones" value={oneOffExpenseData.title || ''} onChange={(e) => setOneOffExpenseData(prev => ({...prev, title: e.target.value}))} /></div>
                <div className="space-y-2"><Label htmlFor="oe-desc">Descripción (Opcional)</Label><Textarea id="oe-desc" value={oneOffExpenseData.description || ''} onChange={(e) => setOneOffExpenseData(prev => ({...prev, description: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="oe-amount">Importe (€)</Label><Input id="oe-amount" type="number" value={oneOffExpenseData.amount || ''} onChange={(e) => setOneOffExpenseData(prev => ({...prev, amount: e.target.value}))} /></div>
                    <div className="space-y-2"><Label htmlFor="oe-date">Fecha</Label><Input id="oe-date" type="date" value={oneOffExpenseData.date?.split('T')[0] || ''} onChange={(e) => setOneOffExpenseData(prev => ({...prev, date: e.target.value}))} /></div>
                </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose><Button onClick={handleSaveOneOffExpense} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar</Button></DialogFooter>
        </DialogContent>
    </Dialog>
    <AlertDialog open={!!oneOffExpenseToDelete} onOpenChange={(open) => !open && setOneOffExpenseToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente el gasto "{oneOffExpenseToDelete?.title}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteOneOffExpense} disabled={saving}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    </>
  );
}
