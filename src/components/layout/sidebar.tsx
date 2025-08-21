
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare, LogOut, Settings, CircleDollarSign, FolderArchive, Briefcase, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { Logo } from "../logo";


const menuItems = [
    { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
    { href: "/treasury", label: "Tesorería", icon: CircleDollarSign },
    { href: "/players", label: "Jugadores", icon: Users },
    { href: "/coaches", label: "Entrenadores", icon: UserSquare },
    { href: "/teams", label: "Equipos", icon: Shield },
    { href: "/staff", label: "Staff y Directiva", icon: Briefcase},
    { href: "/schedules", label: "Horarios", icon: Clock },
    { href: "/calendar", label: "Calendario", icon: Calendar },
    { href: "/communications", label: "Comunicaciones", icon: MessageSquare },
    { href: "/users", label: "Gestión de Usuarios", icon: UserCog },
    { href: "/club-files", label: "Archivos del Club", icon: FolderArchive },
    { href: "/club-settings", label: "Ajustes del Club", icon: Settings },
  ];

type UserProfile = {
    name: string;
    email: string;
    initials: string;
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [clubName, setClubName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const rootUserDocRef = doc(db, "users", user.uid);
                    const rootUserDocSnap = await getDoc(rootUserDocRef);

                    if (rootUserDocSnap.exists()) {
                        const clubId = rootUserDocSnap.data().clubId;
                        
                        // Fetch club name
                        const clubDocRef = doc(db, "clubs", clubId);
                        const clubDocSnap = await getDoc(clubDocRef);
                        if(clubDocSnap.exists()){
                            setClubName(clubDocSnap.data().name);
                        }

                        // Fetch user-specific data
                        const userDocRef = doc(db, "clubs", clubId, "users", user.uid);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            setUserProfile({
                                name: userData.name || "Sin Nombre",
                                email: userData.email || "Sin Email",
                                initials: (userData.name || "U").split(' ').map((n:string) => n[0]).join('')
                            });
                        }
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
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <span className="font-headline text-lg font-bold text-shadow shadow-black/20">{clubName || <Skeleton className="h-6 w-32" />}</span>
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
                                        : "hover:bg-white hover:text-black"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="mt-auto p-4 border-t border-primary-foreground/20 space-y-4">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary-foreground/10 h-auto">
                                <Avatar className="h-9 w-9">
                                <AvatarImage src={`https://placehold.co/40x40.png?text=${userProfile?.initials || 'S'}`} alt="@admin" />
                                <AvatarFallback>{userProfile?.initials || 'S'}</AvatarFallback>
                                </Avatar>
                                {loading ? (
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
                                        <Skeleton className="h-3 w-32 bg-primary-foreground/20" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold text-sm">{userProfile?.name}</span>
                                        <span className="text-xs opacity-80">{userProfile?.email}</span>
                                    </div>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mb-2">
                            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                                <Link href="/account" className="w-full cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    Mi Perfil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/club-settings" className="w-full cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4"/>
                                    Ajustes del Club
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                              <LogOut className="mr-2 h-4 w-4"/>
                              Cerrar Sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <div className="flex items-center justify-start gap-2 pl-3">
                        <Logo />
                        <span className="text-base font-semibold">SportsPanel</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
