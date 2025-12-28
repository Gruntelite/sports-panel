
"use client";

import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import type { ClubSettings, Player, Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link, CheckCircle, ExternalLink, AlertTriangle, Calendar as CalendarIcon, Save, Search, Users, Send } from "lucide-react";
import { createStripeConnectAccountLinkAction } from "@/lib/actions";
import { useTranslation } from "@/components/i18n-provider";
import { useSearchParams, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandList, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function FeesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [feeChargeDay, setFeeChargeDay] = useState<number>(1);
  const [feeChargeMonths, setFeeChargeMonths] = useState<number[]>([]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [sendingLink, setSendingLink] = useState<string | null>(null);

  const MONTHS = t('months', { returnObjects: true }) as { label: string; value: number }[];

   const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const nameMatch = `${player.name} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const teamMatch = selectedTeam === 'all' || player.teamId === selectedTeam;
      return nameMatch && teamMatch;
    });
  }, [players, searchTerm, selectedTeam]);

  useEffect(() => {
    const processPage = async (user: any) => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          toast({ variant: "destructive", title: "Error", description: "Usuario no encontrado." });
          router.push('/login');
          return;
        }

        const currentClubId = userDocSnap.data().clubId;
        setClubId(currentClubId);
        
        if (!currentClubId) {
            setLoading(false);
            return;
        }

        // Fetch settings
        const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
        let settingsData: ClubSettings = {};
        
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            settingsData = settingsSnap.data() as ClubSettings;
            setFeeChargeDay(settingsData.feeChargeDay || 1);
            setFeeChargeMonths(settingsData.feeChargeMonths || []);
            setOnboardingComplete(settingsData.stripeConnectOnboardingComplete || false);
        }

        // Check for Stripe onboarding return
        if (searchParams.get('success') === 'true' && searchParams.get('clubId') === currentClubId) {
           await updateDoc(settingsRef, { stripeConnectOnboardingComplete: true });
           setOnboardingComplete(true);
           toast({ title: "¡Cuenta conectada!", description: "Tu cuenta de Stripe se ha conectado correctamente." });
           router.replace('/fees', { scroll: false });
        }


        // Fetch teams
        const teamsQuery = query(collection(db, "clubs", currentClubId, "teams"), orderBy("order"));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsList);
        
        // Fetch players
        const playersQuery = query(collection(db, "clubs", currentClubId, "players"));
        const playersSnapshot = await getDocs(playersQuery);
        const playersList = playersSnapshot.docs.map(doc => {
            const data = doc.data() as Player;
            const team = teamsList.find(t => t.id === data.teamId);
            return {
                id: doc.id,
                ...data,
                teamName: team ? team.name : "Sin equipo",
            };
        });
        setPlayers(playersList);


      } catch (error) {
        console.error("Error processing fees page:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la página."});
      } finally {
        setLoading(false);
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        processPage(user);
      } else {
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [searchParams, router, toast]);

  const handleConnectStripe = async () => {
    if (!clubId) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar tu club." });
      return;
    }
    setConnecting(true);
    
    const result = await createStripeConnectAccountLinkAction({ clubId });
    
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error || "No se pudo generar el enlace de conexión." });
      setConnecting(false);
    }
  };
  
    const handleSaveFeeSettings = async () => {
        if (!clubId) return;
        setSaving(true);
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await updateDoc(settingsRef, {
                feeChargeDay,
                feeChargeMonths,
            });
            toast({ title: "Configuración guardada", description: "Los ajustes de cobro de cuotas han sido actualizados. Por favor, actualiza la página para ver los cambios." });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
        } finally {
            setSaving(false);
        }
    };
    
    const getStatusBadge = (status: Player['paymentStatus']) => {
        switch(status) {
            case 'paid':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">Pagado</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
            case 'overdue':
                return <Badge variant="destructive">Atrasado</Badge>;
            default:
                return <Badge variant="outline">Sin estado</Badge>;
        }
    }
    
    const handleSendPaymentLink = async (playerId: string) => {
        if (!clubId) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo identificar tu club." });
            return;
        }
        
        if (!onboardingComplete) {
            toast({ variant: "destructive", title: "Error", description: "Primero debes conectar tu cuenta de Stripe." });
            return;
        }
        
        if (feeChargeMonths.length === 0) {
            toast({ variant: "destructive", title: "Error", description: "Debes configurar los meses de cobro antes de enviar el enlace." });
            return;
        }
        
        setSendingLink(playerId);
        
        try {
            const response = await fetch('/api/fees/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId,
                    clubId,
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al crear la suscripción');
            }
            
            if (data.checkoutUrl) {
                // Open checkout URL in new tab
                window.open(data.checkoutUrl, '_blank');
                toast({
                    title: "Enlace generado",
                    description: "Se ha abierto el enlace de pago en una nueva ventana. También puedes copiarlo para enviarlo al jugador.",
                });
            }
        } catch (error: any) {
            console.error('Error sending payment link:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "No se pudo generar el enlace de pago.",
            });
        } finally {
            setSendingLink(null);
        }
    };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Cuotas y Pagos</h1>
        <p className="text-muted-foreground">
          Conecta tu cuenta de Stripe para empezar a cobrar cuotas a tus miembros de forma automática.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
            <CardTitle>Stripe Connect</CardTitle>
            <CardDescription>
                Conecta tu cuenta de Stripe para gestionar los pagos de cuotas de tus miembros de forma segura a través de nuestra plataforma.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-muted-foreground">Para empezar, necesitas conectar tu cuenta de Stripe. Serás redirigido a Stripe para completar un proceso de onboarding seguro.</p>
                     {!onboardingComplete && (
                        <Button onClick={handleConnectStripe} disabled={connecting}>
                            {connecting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    Redirigiendo a Stripe...
                                </>
                            ) : (
                                <>
                                    <Link className="mr-2 h-4 w-4"/>
                                    Conectar con Stripe
                                </>
                            )}
                        </Button>
                     )}
                </div>
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <CardTitle>Estado de la Conexión</CardTitle>
             </CardHeader>
             <CardContent>
                {onboardingComplete ? (
                     <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0"/>
                        <div className="flex-grow">
                            <h3 className="font-semibold text-green-700">Cuenta Conectada</h3>
                            <p className="text-sm text-green-600">¡Todo listo para empezar a gestionar los cobros!</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4"/>
                                Ir a mi panel de Stripe
                            </a>
                        </Button>
                    </div>
                ) : (
                     <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0"/>
                         <div>
                            <h3 className="font-semibold text-yellow-800">Conexión Pendiente</h3>
                            <p className="text-sm text-yellow-700">Completa el proceso de conexión con Stripe para activar el cobro de cuotas.</p>
                        </div>
                    </div>
                )}
             </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Configuración de Cobro de Cuotas</CardTitle>
          <CardDescription>
            Define cuándo se realizarán los cobros automáticos de las cuotas a los miembros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Día del mes para el cobro</Label>
                     <Select value={feeChargeDay.toString()} onValueChange={(value) => setFeeChargeDay(Number(value))}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Meses en los que se cobra la cuota</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {feeChargeMonths.length > 0 ? `${feeChargeMonths.length} meses seleccionados` : "Seleccionar meses..."}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {MONTHS.map((month) => (
                                            <CommandItem key={month.value} onSelect={() => {
                                                const newSelection = new Set(feeChargeMonths);
                                                if(newSelection.has(month.value)) newSelection.delete(month.value);
                                                else newSelection.add(month.value);
                                                setFeeChargeMonths(Array.from(newSelection));
                                            }}>
                                                <Check className={cn("mr-2 h-4 w-4", feeChargeMonths.includes(month.value) ? "opacity-100" : "opacity-0")} />
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
             <Button onClick={handleSaveFeeSettings} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                <Save className="mr-2 h-4 w-4"/>
                Guardar Configuración
             </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Cuotas Anuales de Jugadores</CardTitle>
            <CardDescription>Consulta y gestiona las cuotas asignadas a cada jugador.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleSendPaymentLink(player.id)}
                                            disabled={sendingLink === player.id || !player.annualFee || player.annualFee <= 0}
                                        >
                                            {sendingLink === player.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            ) : (
                                                <Send className="mr-2 h-4 w-4"/>
                                            )}
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-full sm:w-[200px]">
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
             <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Jugador</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Cuota Anual</TableHead>
                            <TableHead>Cuota Mensual</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map(player => {
                                const monthlyFee =
                                  feeChargeMonths.length > 0 && player.annualFee
                                    ? (player.annualFee / feeChargeMonths.length).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
                                    : "N/A";

                                return(
                                <TableRow key={player.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={player.avatar} alt={player.name} />
                                                <AvatarFallback>{player.name?.charAt(0)}{player.lastName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{player.name} {player.lastName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{player.teamName || 'Sin equipo'}</TableCell>
                                    <TableCell className="font-medium">
                                        {player.annualFee !== null && player.annualFee !== undefined ? `${player.annualFee.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}` : 'No asignada'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {monthlyFee}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(player.paymentStatus)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">
                                            <Send className="mr-2 h-4 w-4"/>
                                            Enviar enlace
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No se encontraron jugadores.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
