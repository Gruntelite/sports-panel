
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, CircleDollarSign, AlertTriangle, CheckCircle2, FileText, PlusCircle, MoreHorizontal, Edit, Link, Trash2, Save, Settings, Handshake, TrendingUp, TrendingDown, Repeat, Calendar as CalendarIcon, User, ChevronDown, ChevronLeft, ChevronRight, BookUser } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, where, addDoc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import type { Player, Team, OneTimePayment, User as AppUser, Sponsorship, Coach, RecurringExpense, OneOffExpense, ClubSettings, RegistrationForm, FormSubmission, FormWithSubmissions, Staff, Socio } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, getMonth, getYear, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { es, ca } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useTranslation } from "./i18n-provider";

type FeeMember = {
    id: string;
    name: string;
    teamName?: string;
    role: 'Jugador' | 'Entrenador' | 'Socio' | 'Staff';
    fee?: number;
    payment?: number;
};

type MonthlyCategorySummary = {
    category: string;
    amount: number;
    type: 'income' | 'expense';
};


function FinancialChart({ players, oneTimePayments, coaches, sponsorships, recurringExpenses, oneOffExpenses, feeExcludedMonths, coachFeeExcludedMonths, formsWithSubmissions, staff, socios }: { 
    players: Player[], 
    oneTimePayments: OneTimePayment[], 
    coaches: Coach[], 
    sponsorships: Sponsorship[], 
    recurringExpenses: RecurringExpense[], 
    oneOffExpenses: OneOffExpense[],
    feeExcludedMonths: number[],
    coachFeeExcludedMonths: number[],
    formsWithSubmissions: FormWithSubmissions[],
    staff: Staff[],
    socios: Socio[]
}) {
    const { t, locale } = useTranslation();
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
                    for(let i=0; i<12; i++) {
                        if (!feeExcludedMonths.includes(i)) {
                            monthlyData[i].Ingresos += p.monthlyFee;
                        }
                    }
                }
            });
            socios.forEach(s => {
                if (s.paymentType === 'monthly') {
                    for(let i=0; i<12; i++) {
                        if (!s.excludedMonths?.includes(i)) {
                            monthlyData[i].Ingresos += s.fee;
                        }
                    }
                } else { // annual
                    monthlyData[0].Ingresos += s.fee;
                }
            });
            oneTimePayments.forEach(p => {
                const pDate = parseISO(p.issueDate);
                if(getYear(pDate) === year) {
                    const pMonth = getMonth(pDate);
                    let amount = Number(p.amount);
                    if (!p.isEvent) {
                       amount *= ((p.targetTeamIds?.length || 0) + (p.targetUserIds?.length || 0));
                    }
                    monthlyData[pMonth].Ingresos += amount;
                }
            });
            sponsorships.forEach(s => {
                if (s.frequency === 'monthly') {
                    for (let i = 0; i < 12; i++) {
                        if (!s.excludedMonths?.includes(i)) {
                            monthlyData[i].Ingresos += s.amount;
                        }
                    }
                } else { // annual
                    monthlyData[0].Ingresos += s.amount;
                }
            });
             formsWithSubmissions.forEach(form => {
                if (form.price > 0) {
                    form.submissions.forEach(sub => {
                        const subDate = sub.submittedAt.toDate();
                        if (getYear(subDate) === year && sub.paymentStatus === 'paid') {
                            const subMonth = getMonth(subDate);
                            monthlyData[subMonth].Ingresos += form.price;
                        }
                    });
                }
            });


            // Expenses
            coaches.forEach(c => {
                 if(c.monthlyPayment) {
                    for(let i=0; i<12; i++) {
                        if (!coachFeeExcludedMonths.includes(i)) {
                           monthlyData[i].Gastos += c.monthlyPayment;
                        }
                    }
                }
            });
            staff.forEach(s => {
                if(s.payment && s.paymentFrequency === 'monthly') {
                   for(let i=0; i<12; i++) {
                       if (!s.excludedMonths?.includes(i)) {
                          monthlyData[i].Gastos += s.payment;
                       }
                   }
                } else if (s.payment && s.paymentFrequency === 'annual') {
                    monthlyData[0].Gastos += s.payment;
                }
            });
            recurringExpenses.forEach(e => {
                for (let i = 0; i < 12; i++) {
                    if (!e.excludedMonths?.includes(i)) {
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
                name: format(new Date(year, Number(monthIndex)), "MMM", { locale: locale === 'ca' ? ca : es }),
                Ingresos: monthlyData[Number(monthIndex)].Ingresos,
                Gastos: monthlyData[Number(monthIndex)].Gastos
            }));
            setChartData(formattedData);
        };
        processData();
    }, [year, players, oneTimePayments, coaches, sponsorships, recurringExpenses, oneOffExpenses, feeExcludedMonths, coachFeeExcludedMonths, formsWithSubmissions, staff, socios, locale]);

    const chartConfig: ChartConfig = {
        Ingresos: { label: t('treasury.chart.income'), color: "hsl(var(--chart-1))" },
        Gastos: { label: t('treasury.chart.expenses'), color: "hsl(var(--chart-2))" }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('treasury.chart.title')}</CardTitle>
                    <CardDescription>{t('treasury.chart.description')}</CardDescription>
                </div>
                 <Select value={year.toString()} onValueChange={(val) => setYear(Number(val))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder={t('treasury.chart.year')} />
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

const MONTHS = [
    { label: "Enero", value: 0 }, { label: "Febrero", value: 1 }, { label: "Marzo", value: 2 },
    { label: "Abril", value: 3 }, { label: "Mayo", value: 4 }, { label: "Junio", value: 5 },
    { label: "Julio", value: 6 }, { label: "Agosto", value: 7 }, { label: "Septiembre", value: 8 },
    { label: "Octubre", value: 9 }, { label: "Noviembre", value: 10 }, { label: "Diciembre", value: 11 }
];


export function TreasuryDashboard() {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [oneTimePayments, setOneTimePayments] = useState<OneTimePayment[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [oneOffExpenses, setOneOffExpenses] = useState<OneOffExpense[]>([]);
  const [clubSettings, setClubSettings] = useState<ClubSettings>({});
  const [formsWithSubmissions, setFormsWithSubmissions] = useState<FormWithSubmissions[]>([]);

  const [filteredMembers, setFilteredMembers] = useState<FeeMember[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("accounting");
  
  const [stats, setStats] = useState({
      expectedIncome: 0,
      coachPayments: 0,
      sponsorshipIncome: 0,
      monthlyExpenses: 0,
  });
  
  // States for Accounting Tab
  const [accountingDate, setAccountingDate] = useState(new Date());
  const [monthlySummary, setMonthlySummary] = useState<MonthlyCategorySummary[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState({ income: 0, expense: 0, balance: 0 });

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

  const [localFeeExcluded, setLocalFeeExcluded] = useState<number[]>([]);
  const [localCoachFeeExcluded, setLocalCoachFeeExcluded] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [timeRange, setTimeRange] = useState<'monthly' | 'annual'>('monthly');

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
    let combinedMembers: FeeMember[] = [];
    players.forEach(p => combinedMembers.push({ id: p.id, name: `${p.name} ${p.lastName}`, teamName: p.teamName, role: 'Jugador', fee: p.monthlyFee }));
    coaches.forEach(c => combinedMembers.push({ id: c.id, name: `${c.name} ${c.lastName}`, teamName: c.teamName, role: 'Entrenador', payment: c.monthlyPayment }));
    staff.forEach(s => combinedMembers.push({ id: s.id, name: `${s.name} ${s.lastName}`, role: 'Staff', payment: s.payment }));
    socios.forEach(s => combinedMembers.push({ id: s.id, name: `${s.name} ${s.lastName}`, role: 'Socio', fee: s.fee }));

    
    let currentMembers = [...combinedMembers];
    if (selectedTeam !== "all") {
        currentMembers = currentMembers.filter(m => m.teamName === teams.find(t => t.id === selectedTeam)?.name);
    }
    if (selectedRole !== "all") {
        currentMembers = currentMembers.filter(m => m.role === selectedRole);
    }

    setFilteredMembers(currentMembers);
  }, [selectedTeam, selectedRole, players, coaches, teams, staff, socios]);

  useEffect(() => {
    const originalFee = clubSettings.feeExcludedMonths || [];
    const originalCoachFee = clubSettings.coachFeeExcludedMonths || [];
    
    const feeChanged = JSON.stringify(originalFee.sort()) !== JSON.stringify(localFeeExcluded.sort());
    const coachFeeChanged = JSON.stringify(originalCoachFee.sort()) !== JSON.stringify(localCoachFeeExcluded.sort());

    setHasChanges(feeChanged || coachFeeChanged);
  }, [localFeeExcluded, localCoachFeeExcluded, clubSettings]);

 useEffect(() => {
    const calculateMonthlySummary = () => {
        const year = getYear(accountingDate);
        const month = getMonth(accountingDate);
        const summary: { [key: string]: MonthlyCategorySummary } = {};

        const addOrUpdate = (category: string, amount: number, type: 'income' | 'expense') => {
            if (!summary[category]) {
                summary[category] = { category, amount: 0, type };
            }
            summary[category].amount += amount;
        };

        // Incomes
        if (!localFeeExcluded.includes(month)) {
            const totalFees = players.reduce((acc, p) => acc + (p.monthlyFee || 0), 0);
            if (totalFees > 0) addOrUpdate(t('treasury.accounting.playerFees'), totalFees, 'income');
            
            const totalSocioFees = socios
                .filter(s => s.paymentType === 'monthly' && !s.excludedMonths?.includes(month))
                .reduce((acc, s) => acc + s.fee, 0);
            if(totalSocioFees > 0) addOrUpdate(t('treasury.accounting.socioFees'), totalSocioFees, 'income');
        }
         socios.filter(s => s.paymentType === 'annual' && month === 0).forEach(s => addOrUpdate(t('treasury.accounting.socioFeesAnnual'), s.fee, 'income'));

        sponsorships.forEach(s => {
            if (s.frequency === 'monthly' && !s.excludedMonths?.includes(month)) {
                addOrUpdate(`${t('treasury.accounting.sponsorship')}: ${s.sponsorName}`, s.amount, 'income');
            } else if (s.frequency === 'annual' && month === 0) {
                addOrUpdate(`${t('treasury.accounting.sponsorship')}: ${s.sponsorName}`, s.amount, 'income');
            }
        });

        oneTimePayments
            .filter(p => getYear(parseISO(p.issueDate)) === year && getMonth(parseISO(p.issueDate)) === month)
            .forEach(p => {
                let amount = Number(p.amount);
                if (!p.isEvent) {
                    amount *= ((p.targetTeamIds?.length || 0) + (p.targetUserIds?.length || 0));
                }
                addOrUpdate(`${t('treasury.accounting.oneTimePayment')}: ${p.concept}`, amount, 'income');
            });
        
        formsWithSubmissions.forEach(form => {
            if (form.price > 0) {
                const formIncome = form.submissions
                    .filter(sub => {
                        const subDate = sub.submittedAt.toDate();
                        return getYear(subDate) === year && getMonth(subDate) === month && sub.paymentStatus === 'paid';
                    })
                    .reduce((acc) => acc + form.price, 0);

                if (formIncome > 0) {
                    addOrUpdate(`${t('treasury.accounting.registrations')}: ${form.title}`, formIncome, 'income');
                }
            }
        });
        
        // Expenses
        if (!localCoachFeeExcluded.includes(month)) {
            const totalCoachPayments = coaches.reduce((acc, c) => acc + (c.monthlyPayment || 0), 0);
             if (totalCoachPayments > 0) addOrUpdate(t('treasury.accounting.coachSalaries'), totalCoachPayments, 'expense');
        }
        staff
            .filter(s => s.paymentFrequency === 'monthly' && !s.excludedMonths?.includes(month))
            .forEach(s => addOrUpdate(`${t('treasury.accounting.staffSalary')}: ${s.name} ${s.lastName}`, s.payment || 0, 'expense'));

        staff
            .filter(s => s.paymentFrequency === 'annual' && month === 0)
            .forEach(s => addOrUpdate(`${t('treasury.accounting.staffSalaryAnnual')}: ${s.name} ${s.lastName}`, s.payment || 0, 'expense'));


        recurringExpenses
            .filter(e => !e.excludedMonths?.includes(month))
            .forEach(e => {
                addOrUpdate(e.title, e.amount, 'expense');
            });

        oneOffExpenses
            .filter(e => getYear(parseISO(e.date)) === year && getMonth(parseISO(e.date)) === month)
            .forEach(e => {
                addOrUpdate(e.title, e.amount, 'expense');
            });

        const summaryArray = Object.values(summary).sort((a, b) => b.amount - a.amount);
        setMonthlySummary(summaryArray);
        
        const totalIncome = summaryArray.filter(s => s.type === 'income').reduce((acc, s) => acc + s.amount, 0);
        const totalExpense = summaryArray.filter(s => s.type === 'expense').reduce((acc, s) => acc + s.amount, 0);
        setMonthlyTotals({ income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense });
    };

    if (!loading) {
        calculateMonthlySummary();
    }
}, [accountingDate, players, coaches, oneTimePayments, sponsorships, recurringExpenses, oneOffExpenses, formsWithSubmissions, localFeeExcluded, localCoachFeeExcluded, loading, staff, socios, t]);


  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
      const settingsRef = doc(db, "clubs", clubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      const settingsData = settingsSnap.exists() ? (settingsSnap.data() as ClubSettings) : {};
      setClubSettings(settingsData);
      setLocalFeeExcluded(settingsData.feeExcludedMonths || []);
      setLocalCoachFeeExcluded(settingsData.coachFeeExcludedMonths || []);
      
      const teamsQuery = query(collection(db, "clubs", clubId, "teams"), orderBy("order"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);
      
      const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
      const coachesSnapshot = await getDocs(coachesQuery);
      const coachesList = coachesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Coach));
      setCoaches(coachesList);

      const staffQuery = query(collection(db, "clubs", clubId, "staff"));
      const staffSnapshot = await getDocs(staffQuery);
      const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Staff));
      setStaff(staffList);

      const sociosQuery = query(collection(db, "clubs", clubId, "socios"));
      const sociosSnapshot = await getDocs(sociosQuery);
      const sociosList = sociosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Socio));
      setSocios(sociosList);

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

      const usersQuery = query(collection(db, "clubs", clubId, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
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
      
      const formsQuery = query(collection(db, "clubs", clubId, "registrationForms"));
      const formsSnapshot = await getDocs(formsQuery);
      const formsWithSubs: FormWithSubmissions[] = [];
      for (const formDoc of formsSnapshot.docs) {
          const formData = { id: formDoc.id, ...formDoc.data() } as RegistrationForm;
          const submissionsQuery = query(collection(db, "clubs", clubId, "registrationForms", formDoc.id, "submissions"));
          const submissionsSnapshot = await getDocs(submissionsQuery);
          const subs = submissionsSnapshot.docs.map(subDoc => ({ id: subDoc.id, ...subDoc.data() } as FormSubmission));
          formsWithSubs.push({ ...formData, submissions: subs });
      }
      setFormsWithSubmissions(formsWithSubs);

    } catch (error) {
      console.error("Error fetching treasury data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const calculateStats = () => {
        const currentMonthIndex = getMonth(new Date());
        const currentYear = getYear(new Date());

        let totalIncome = 0;
        let totalCoachPayments = 0;
        let totalSponsorships = 0;
        let totalExpenses = 0;

        if (timeRange === 'monthly') {
            // Incomes
            const monthlyFeesTotal = clubSettings.feeExcludedMonths?.includes(currentMonthIndex) ? 0 : players.reduce((acc, player) => acc + (player.monthlyFee || 0), 0);
            const oneTimePaymentsThisMonth = oneTimePayments.filter(p => getMonth(parseISO(p.issueDate)) === currentMonthIndex && getYear(parseISO(p.issueDate)) === currentYear).reduce((acc, p) => acc + (Number(p.amount) * ((p.targetTeamIds?.length || 0) + (p.targetUserIds?.length || 0))), 0); // Simplified calculation
            const sponsorshipIncomeTotal = sponsorships.filter(s => s.frequency === 'monthly' && !s.excludedMonths?.includes(currentMonthIndex)).reduce((acc, s) => acc + s.amount, 0);
            totalIncome = monthlyFeesTotal + oneTimePaymentsThisMonth + sponsorshipIncomeTotal;
            totalSponsorships = sponsorshipIncomeTotal;

            // Expenses
            totalCoachPayments = clubSettings.coachFeeExcludedMonths?.includes(currentMonthIndex) ? 0 : coaches.reduce((acc, coach) => acc + (coach.monthlyPayment || 0), 0);
            const recurringMonthlyExpenses = recurringExpenses.filter(e => !e.excludedMonths?.includes(currentMonthIndex)).reduce((acc, e) => acc + e.amount, 0);
            const oneOffCurrentMonthExpenses = oneOffExpenses.filter(e => getMonth(parseISO(e.date)) === currentMonthIndex && getYear(parseISO(e.date)) === currentYear).reduce((acc, e) => acc + e.amount, 0);
            totalExpenses = recurringMonthlyExpenses + oneOffCurrentMonthExpenses + totalCoachPayments;

        } else { // 'annual'
            for (let i = 0; i < 12; i++) {
                // Incomes
                if (!clubSettings.feeExcludedMonths?.includes(i)) {
                    totalIncome += players.reduce((acc, player) => acc + (player.monthlyFee || 0), 0);
                }
                if (!clubSettings.coachFeeExcludedMonths?.includes(i)) {
                    totalCoachPayments += coaches.reduce((acc, coach) => acc + (coach.monthlyPayment || 0), 0);
                }
                totalSponsorships += sponsorships.filter(s => s.frequency === 'monthly' && !s.excludedMonths?.includes(i)).reduce((acc, s) => acc + s.amount, 0);

                // Expenses
                if (!clubSettings.coachFeeExcludedMonths?.includes(i)) {
                    totalExpenses += coaches.reduce((acc, coach) => acc + (coach.monthlyPayment || 0), 0);
                }
                 totalExpenses += recurringExpenses.filter(e => !e.excludedMonths?.includes(i)).reduce((acc, e) => acc + e.amount, 0);
            }
            // Add year-scoped amounts
            totalIncome += oneTimePayments.filter(p => getYear(parseISO(p.issueDate)) === currentYear).reduce((acc, p) => acc + (Number(p.amount) * ((p.targetTeamIds?.length || 0) + (p.targetUserIds?.length || 0))), 0);
            totalSponsorships += sponsorships.filter(s => s.frequency === 'annual').reduce((acc, s) => acc + s.amount, 0);
            totalIncome += totalSponsorships;
            totalExpenses += oneOffExpenses.filter(e => getYear(parseISO(e.date)) === currentYear).reduce((acc, e) => acc + e.amount, 0);
        }

        setStats({ 
            expectedIncome: totalIncome,
            coachPayments: totalCoachPayments,
            sponsorshipIncome: totalSponsorships,
            monthlyExpenses: totalExpenses,
        });
    };
    if (!loading) {
        calculateStats();
    }
}, [timeRange, players, coaches, oneTimePayments, sponsorships, recurringExpenses, oneOffExpenses, clubSettings, loading]);


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
        issueDate: paymentData.issueDate || new Date().toISOString(),
    };

    try {
        if (paymentModalMode === 'edit' && paymentData.id) {
            const paymentRef = doc(db, "clubs", clubId, "oneTimePayments", paymentData.id);
            await updateDoc(paymentRef, dataToSave);
            toast({ title: "Pago actualizado", description: "El pago puntual se ha actualizado correctamente." });
        } else {
            await addDoc(collection(db, "clubs", clubId, "oneTimePayments"), dataToSave);
            toast({ title: "Pago creado", description: "El nuevo pago puntual se ha guardado correctamente." });
        }
        
        setIsPaymentModalOpen(false);
        if(clubId) fetchData(clubId);

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
      if(clubId) fetchData(clubId);
    } catch(e) {
      console.error("Error deleting payment", e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el pago." });
    } finally {
      setSaving(false);
    }

  }

  const handleOpenSponsorshipModal = (mode: 'add' | 'edit', sponsorship?: Sponsorship) => {
    setSponsorshipModalMode(mode);
    setSponsorshipData(sponsorship || { sponsorName: "", amount: "", frequency: "monthly", description: "", excludedMonths: [] });
    setIsSponsorshipModalOpen(true);
  };
  
  const handleSaveSponsorship = async () => {
    if (!clubId || !sponsorshipData.sponsorName || !sponsorshipData.amount) {
      toast({ variant: "destructive", title: "Error", description: "El nombre del patrocinador y la cantidad son obligatorios." });
      return;
    }
    setSaving(true);

    const dataToSave = {
      ...sponsorshipData,
      amount: Number(sponsorshipData.amount),
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
      if(clubId) fetchData(clubId);
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
      if(clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting sponsorship:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el patrocinio." });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRecurringExpenseModal = (mode: 'add' | 'edit', expense?: RecurringExpense) => {
    setRecurringExpenseModalMode(mode);
    setRecurringExpenseData(expense || { title: "", amount: "", excludedMonths: [] });
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
      if(clubId) fetchData(clubId);
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
      if(clubId) fetchData(clubId);
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
      if(clubId) fetchData(clubId);
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
      if(clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting one-off expense:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el gasto." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeeSettings = async () => {
      if (!clubId) return;
      setSaving(true);
      try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await updateDoc(settingsRef, { 
            feeExcludedMonths: localFeeExcluded,
            coachFeeExcludedMonths: localCoachFeeExcluded,
        });
        toast({ title: "Configuración guardada", description: "Los meses de exclusión de pagos han sido actualizados." });
        setHasChanges(false); // Reset changes state
        if(clubId) fetchData(clubId);
      } catch (e) {
          toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
      } finally {
        setSaving(false);
      }
  };
  
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
      if (payment.isEvent) {
          return payment.concept;
      }
      const teamNames = getTargetTeamNames(payment.targetTeamIds || []);
      const userNames = getTargetUserNames(payment.targetUserIds || []);

      if (teamNames && userNames) {
          return `${teamNames}, ${userNames}`;
      }
      return teamNames || userNames || 'N/A';
  }

  const tabsConfig = [
    { value: "accounting", label: t('treasury.tabs.accounting') },
    { value: "fees", label: t('treasury.tabs.fees') },
    { value: "sponsorships", label: t('treasury.tabs.sponsorships') },
    { value: "expenses", label: t('treasury.tabs.expenses') },
    { value: "other", label: t('treasury.tabs.otherPayments') },
  ];


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const timeRangeLabel = timeRange === 'monthly' ? `(${t('treasury.stats.monthly')})` : `(${t('treasury.stats.annual')})`;
  const eventPayments = formsWithSubmissions
    .filter(form => form.price > 0 && form.submissions.length > 0)
    .map(form => {
        const totalAmount = form.submissions.filter(s => s.paymentStatus === 'paid').length * form.price;
        return {
            id: form.id,
            concept: `Ingresos ${form.title}`,
            amount: totalAmount,
            issueDate: form.createdAt.toDate().toISOString(),
            isEvent: true
        } as OneTimePayment;
    });

  const allDisplayPayments = [...oneTimePayments, ...eventPayments];


  return (
    <>
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {t('treasury.stats.expectedIncome')}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 h-auto text-sm font-medium -ml-1">
                                    <span className="text-muted-foreground">{timeRange === 'monthly' ? t('treasury.stats.monthly') : t('treasury.stats.annual')}</span>
                                    <ChevronDown className="h-4 w-4 ml-0.5 text-muted-foreground"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuRadioGroup value={timeRange} onValueChange={(value) => setTimeRange(value as 'monthly' | 'annual')}>
                                    <DropdownMenuRadioItem value="monthly">{t('treasury.stats.currentMonth')}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="annual">{t('treasury.stats.fullYear')}</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.expectedIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">{t('treasury.stats.incomeDesc')}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('treasury.stats.totalExpenses')} {timeRangeLabel}</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.monthlyExpenses.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">{t('treasury.stats.expensesDesc')}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('treasury.stats.sponsorshipIncome')} {timeRangeLabel}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.sponsorshipIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">{t('treasury.stats.sponsorshipDesc')}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('treasury.stats.staffPayments')} {timeRangeLabel}</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.coachPayments.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</div>
                    <p className="text-xs text-muted-foreground">{t('treasury.stats.staffPaymentsDesc')}</p>
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
            feeExcludedMonths={clubSettings.feeExcludedMonths || []}
            coachFeeExcludedMonths={clubSettings.coachFeeExcludedMonths || []}
            formsWithSubmissions={formsWithSubmissions}
            staff={staff}
            socios={socios}
        />
        
      <Tabs defaultValue="accounting" value={activeTab} onValueChange={setActiveTab}>
           <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sección..." />
              </SelectTrigger>
              <SelectContent>
                {tabsConfig.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:inline-flex">
            {tabsConfig.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        <TabsContent value="accounting" className="mt-4">
             <Card>
                <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex-1">
                        <CardTitle>{t('treasury.accounting.title')}</CardTitle>
                        <CardDescription>{t('treasury.accounting.description')}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="icon" onClick={() => setAccountingDate(prev => subMonths(prev, 1))}><ChevronLeft className="h-4 w-4"/></Button>
                         <span className="font-semibold text-lg w-36 text-center capitalize">{format(accountingDate, "LLLL yyyy", { locale: locale === 'ca' ? ca : es })}</span>
                         <Button variant="outline" size="icon" onClick={() => setAccountingDate(prev => addMonths(prev, 1))}><ChevronRight className="h-4 w-4"/></Button>
                    </div>
                </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                            <CardHeader className="pb-2"><CardTitle className="text-green-800 dark:text-green-300 text-base">{t('treasury.accounting.totalIncome')}</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold text-green-700 dark:text-green-400">{monthlyTotals.income.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</p></CardContent>
                        </Card>
                        <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                             <CardHeader className="pb-2"><CardTitle className="text-red-800 dark:text-red-300 text-base">{t('treasury.accounting.totalExpenses')}</CardTitle></CardHeader>
                             <CardContent><p className="text-2xl font-bold text-red-700 dark:text-red-400">{monthlyTotals.expense.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</p></CardContent>
                        </Card>
                         <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                             <CardHeader className="pb-2"><CardTitle className="text-blue-800 dark:text-blue-300 text-base">{t('treasury.accounting.balance')}</CardTitle></CardHeader>
                             <CardContent><p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{monthlyTotals.balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</p></CardContent>
                        </Card>
                    </div>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('treasury.accounting.category')}</TableHead>
                                <TableHead className="text-right">{t('treasury.accounting.amount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {monthlySummary.length > 0 ? monthlySummary.map(item => (
                                <TableRow key={item.category}>
                                    <TableCell className="font-medium">{item.category}</TableCell>
                                    <TableCell className={cn("text-right font-semibold", item.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                                        {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">{t('treasury.accounting.noMovements')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('treasury.fees.title')}</CardTitle>
              <CardDescription>
                {t('treasury.fees.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg bg-muted/50">
                        <Label>{t('treasury.fees.playerFeeExclusion')}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {localFeeExcluded.length ? `${localFeeExcluded.length} ${t('treasury.fees.months')}` : `${t('treasury.fees.select')}...`}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Command>
                                    <CommandList>
                                        <CommandGroup>
                                            {MONTHS.map((month) => (
                                                <CommandItem key={month.value} onSelect={() => {
                                                    const newSelection = new Set(localFeeExcluded);
                                                    if(newSelection.has(month.value)) newSelection.delete(month.value);
                                                    else newSelection.add(month.value);
                                                    setLocalFeeExcluded(Array.from(newSelection));
                                                }}>
                                                    <Check className={cn("mr-2 h-4 w-4", localFeeExcluded.includes(month.value) ? "opacity-100" : "opacity-0")} />
                                                    {month.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg bg-muted/50">
                        <Label>{t('treasury.fees.staffPaymentExclusion')}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {localCoachFeeExcluded.length ? `${localCoachFeeExcluded.length} ${t('treasury.fees.months')}` : `${t('treasury.fees.select')}...`}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Command>
                                    <CommandList>
                                        <CommandGroup>
                                            {MONTHS.map((month) => (
                                                <CommandItem key={month.value} onSelect={() => {
                                                    const newSelection = new Set(localCoachFeeExcluded);
                                                    if(newSelection.has(month.value)) newSelection.delete(month.value);
                                                    else newSelection.add(month.value);
                                                    setLocalCoachFeeExcluded(Array.from(newSelection));
                                                }}>
                                                    <Check className={cn("mr-2 h-4 w-4", localCoachFeeExcluded.includes(month.value) ? "opacity-100" : "opacity-0")} />
                                                    {month.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                 {hasChanges && (
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleSaveFeeSettings} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {t('common.saveChanges')}
                        </Button>
                    </div>
                 )}
                {activeTab === 'fees' && (
                    <div className="flex flex-col sm:flex-row justify-end mb-4 gap-2">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder={t('treasury.fees.filterByRole')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('treasury.fees.allRoles')}</SelectItem>
                                <SelectItem value="Jugador">{t('treasury.fees.players')}</SelectItem>
                                <SelectItem value="Entrenador">{t('treasury.fees.coaches')}</SelectItem>
                                <SelectItem value="Staff">{t('treasury.fees.staff')}</SelectItem>
                                <SelectItem value="Socio">{t('treasury.fees.socios')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="w-full sm:w-[220px]">
                                <SelectValue placeholder={t('treasury.fees.filterByTeam')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('treasury.fees.allTeams')}</SelectItem>
                                {teams.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('treasury.fees.member')}</TableHead>
                    <TableHead>{t('treasury.fees.team')}</TableHead>
                    <TableHead>{t('treasury.fees.role')}</TableHead>
                    <TableHead>{t('treasury.fees.income')}</TableHead>
                    <TableHead>{t('treasury.fees.expense')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                      return (
                        <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.teamName || 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={member.role === 'Jugador' || member.role === 'Socio' ? 'outline' : 'secondary'}>
                                    <User className="mr-1 h-3 w-3"/>
                                    {member.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-green-600">
                                {member.fee ? `${member.fee.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}` : '-'}
                            </TableCell>
                            <TableCell className="text-red-600">
                                {member.payment ? `${member.payment.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}` : '-'}
                            </TableCell>
                        </TableRow>
                      )
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sponsorships" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('treasury.sponsorships.title')}</CardTitle>
                    <CardDescription>
                    {t('treasury.sponsorships.description')}
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenSponsorshipModal('add')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('treasury.sponsorships.add')}
                </Button>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('treasury.sponsorships.sponsor')}</TableHead>
                        <TableHead>{t('treasury.sponsorships.amount')}</TableHead>
                        <TableHead className="text-right">{t('treasury.sponsorships.actions')}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {sponsorships.length > 0 ? (
                        sponsorships.map((spon) => (
                        <TableRow key={spon.id}>
                            <TableCell className="font-medium">{spon.sponsorName}</TableCell>
                            <TableCell>{spon.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})} ({spon.frequency === 'monthly' ? t('treasury.stats.monthly') : t('treasury.stats.annual')})</TableCell>
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
                            {t('treasury.sponsorships.none')}
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="expenses" className="mt-4 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('treasury.expenses.recurringTitle')}</CardTitle>
                        <CardDescription>{t('treasury.expenses.recurringDescription')}</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenRecurringExpenseModal('add')}><PlusCircle className="mr-2 h-4 w-4" />Añadir</Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Importe</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {recurringExpenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.title}</TableCell>
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
                        <CardTitle>{t('treasury.expenses.oneOffTitle')}</CardTitle>
                        <CardDescription>{t('treasury.expenses.oneOffDescription')}</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenOneOffExpenseModal('add')}><PlusCircle className="mr-2 h-4 w-4" />Añadir</Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
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
                <CardTitle>{t('treasury.otherPayments.title')}</CardTitle>
                <CardDescription>
                  {t('treasury.otherPayments.description')}
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenPaymentModal('add')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('treasury.otherPayments.add')}
              </Button>
            </CardHeader>
            <CardContent>
               <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('treasury.otherPayments.concept')}</TableHead>
                    <TableHead>{t('treasury.otherPayments.amount')}</TableHead>
                    <TableHead>{t('treasury.otherPayments.issueDate')}</TableHead>
                    <TableHead>{t('treasury.otherPayments.recipients')}</TableHead>
                    <TableHead className="text-right">{t('treasury.otherPayments.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDisplayPayments.length > 0 ? (
                    allDisplayPayments.map((payment) => {
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.concept}</TableCell>
                          <TableCell>{Number(payment.amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR'})}</TableCell>
                          <TableCell>{new Date(payment.issueDate).toLocaleDateString('es-ES')}</TableCell>
                          <TableCell>{getCombinedTargetNames(payment)}</TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" disabled={payment.isEvent}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => handleOpenPaymentModal('edit', payment)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
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
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        {t('treasury.otherPayments.none')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
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
            {sponsorshipData.frequency === 'monthly' && (
                <div className="space-y-2">
                    <Label>Meses a Excluir del Pago</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map(month => (
                            <Button
                                key={month.value}
                                variant={sponsorshipData.excludedMonths?.includes(month.value) ? 'default' : 'outline'}
                                onClick={() => {
                                    const newSelection = new Set(sponsorshipData.excludedMonths || []);
                                    if (newSelection.has(month.value)) {
                                        newSelection.delete(month.value);
                                    } else {
                                        newSelection.add(month.value);
                                    }
                                    setSponsorshipData(prev => ({ ...prev, excludedMonths: Array.from(newSelection) }));
                                }}
                            >
                                {month.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
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
                <div className="space-y-2"><Label htmlFor="re-amount">Importe (€)</Label><Input id="re-amount" type="number" value={recurringExpenseData.amount || ''} onChange={(e) => setRecurringExpenseData(prev => ({...prev, amount: e.target.value}))} /></div>
                <div className="space-y-2">
                    <Label>Meses a Excluir del Pago</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map(month => (
                            <Button
                                key={month.value}
                                variant={recurringExpenseData.excludedMonths?.includes(month.value) ? 'default' : 'outline'}
                                onClick={() => {
                                    const newSelection = new Set(recurringExpenseData.excludedMonths || []);
                                    if (newSelection.has(month.value)) {
                                        newSelection.delete(month.value);
                                    } else {
                                        newSelection.add(month.value);
                                    }
                                    setRecurringExpenseData(prev => ({ ...prev, excludedMonths: Array.from(newSelection) }));
                                }}
                            >
                                {month.label}
                            </Button>
                        ))}
                    </div>
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
