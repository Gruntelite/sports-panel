
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare, LogOut, Settings, CircleDollarSign, FolderArchive, Briefcase, User, Shield, ClipboardList, AlertTriangle, HelpCircle, Loader2, Send, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { Logo } from "../logo";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { sendEmailWithSmtpAction } from "@/lib/email";
import { useToast } from "@/hooks/use-toast";


const menuItems = [
    { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
    { href: "/treasury", label: "Tesorería", icon: CircleDollarSign },
    { href: "/players", label: "Jugadores", icon: Users },
    { href: "/coaches", label: "Entrenadores", icon: UserSquare },
    { href: "/teams", label: "Equipos", icon: Shield },
    { href: "/staff", label: "Socios y Directiva", icon: Briefcase},
    { href: "/schedules", label: "Horarios", icon: Clock },
    { href: "/communications", label: "Comunicaciones", icon: MessageSquare },
    { href: "/registrations", label: "Inscripciones y Eventos", icon: ClipboardList },
    { href: "/incidents", label: "Incidencias y Protocolos", icon: AlertTriangle },
    { href: "/club-files", label: "Archivos del Club", icon: FolderArchive },
    { href: "/importer", label: "Importador de BBDD", icon: Database },
    { href: "/club-settings", label: "Ajustes del Club", icon: Settings },
  ];

type UserProfile = {
    name: string;
    email: string;
    initials: string;
}

function HelpForm({clubId, userProfile}: {clubId: string, userProfile: UserProfile}) {
    const { toast } = useToast();
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        
        const htmlContent = `
            <p><strong>Club ID:</strong> ${clubId}</p>
            <p><strong>Usuario:</strong> ${userProfile.name} (${userProfile.email})</p>
            <hr>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `;
        
        const result = await sendEmailWithSmtpAction({
            clubId: clubId,
            recipients: [{ email: 'info.sportspanel@gmail.com', name: 'Soporte SportsPanel' }],
            subject: `Consulta de Soporte: ${subject}`,
            htmlContent
        });

        if (result.success) {
            toast({ title: "Mensaje Enviado", description: "Hemos recibido tu consulta. Te responderemos lo antes posible."});
            setSubject("");
            setMessage("");
        } else {
            toast({ variant: "destructive", title: "Error al enviar", description: result.error});
        }
        
        setIsSending(false);
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="subject">Asunto</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required className="min-h-[150px]"/>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="mr-2 h-4 w-4"/>
                    Enviar
                </Button>
            </DialogFooter>
        </form>
    )
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [clubId, setClubId] = useState<string | null>(null);
    const [clubName, setClubName] = useState<string | null>(null);
    const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const rootUserDocRef = doc(db, "users", user.uid);
                    const rootUserDocSnap = await getDoc(rootUserDocRef);

                    if (rootUserDocSnap.exists()) {
                        const currentClubId = rootUserDocSnap.data().clubId;
                        setClubId(currentClubId);
                        
                        const clubDocRef = doc(db, "clubs", currentClubId);
                        const clubDocSnap = await getDoc(clubDocRef);
                        if(clubDocSnap.exists()){
                            setClubName(clubDocSnap.data().name);
                        }

                        const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
                        const settingsSnap = await getDoc(settingsRef);
                        if(settingsSnap.exists()){
                            setClubLogoUrl(settingsSnap.data().logoUrl || null);
                        }

                        setUserProfile({
                            name: user.displayName || "Sin Nombre",
                            email: user.email || "Sin Email",
                            initials: (user.displayName || "U").split(' ').map((n:string) => n[0]).join('')
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('clubThemeColor');
        localStorage.removeItem('clubThemeColorForeground');
        router.push("/login");
    }

    return (
        <div className="hidden border-r bg-primary text-primary-foreground md:fixed md:flex md:flex-col md:h-full md:w-[220px] lg:w-[280px] z-50">
            <div className="flex h-full max-h-screen flex-col">
                <div className="flex h-14 items-center border-b border-primary-foreground/20 px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
                         {loading ? (
                            <Skeleton className="h-8 w-8 rounded-md bg-white/20" />
                         ) : clubLogoUrl ? (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={clubLogoUrl} alt={clubName || 'Logo del Club'}/>
                                <AvatarFallback className="bg-white/20 text-primary-foreground">{clubName?.charAt(0) || 'C'}</AvatarFallback>
                            </Avatar>
                         ) : null}
                        <span className="font-headline text-lg font-bold text-shadow shadow-black/20">{clubName || <Skeleton className="h-6 w-32 bg-white/20" />}</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <nav className="grid items-start px-2 font-medium lg:px-4 py-4">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all text-base",
                                        isActive
                                        ? "bg-white text-black"
                                        : "hover:bg-white/20"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="mt-auto p-4 space-y-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg px-3 py-1.5 text-base hover:bg-white/20">
                                <HelpCircle className="h-4 w-4" />
                                Ayuda y Soporte
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Contacto de Soporte</DialogTitle>
                                <DialogDescription>
                                    ¿Tienes alguna duda o problema? Rellena el formulario y te ayudaremos lo antes posible.
                                </DialogDescription>
                            </DialogHeader>
                            {clubId && userProfile && (
                                <HelpForm clubId={clubId} userProfile={userProfile} />
                            )}
                        </DialogContent>
                    </Dialog>
                    
                    <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg px-3 py-1.5 text-base hover:bg-white/20" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                     <div className="my-4 h-px w-full bg-primary-foreground/20" />
                     <div className="flex items-center justify-center gap-2">
                        <Logo width={28} height={28} />
                        <span className="text-base font-semibold">SportsPanel</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
