
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, X, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";

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


export function Header() {
    const pathname = usePathname();
    const currentPage = menuItems.find(item => pathname.startsWith(item.href))?.label || 'Panel';

    return (
        <>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 md:hidden">
             <h1 className="text-xl font-bold font-headline tracking-tight">
                {currentPage}
            </h1>
        </header>

        {/* Floating Action Button for Mobile Menu */}
        <div className="md:hidden fixed bottom-6 right-6 z-40">
             <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="default"
                        size="icon"
                        className="rounded-full w-14 h-14 shadow-lg"
                    >
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Abrir menú de navegación</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0">
                     <nav className="flex flex-col h-full">
                        <div className="flex h-20 items-center border-b px-4 lg:px-6 shrink-0 justify-between">
                             <Link
                                href="/dashboard"
                                className="flex items-center gap-3 text-lg font-semibold"
                            >
                                <Logo width={32} height={32}/>
                                <span className="font-headline text-lg font-bold">SportsPanel</span>
                            </Link>
                             <SheetClose asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <X className="h-5 w-5" />
                                </Button>
                            </SheetClose>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                             <div className="grid items-start p-4 gap-1">
                            {menuItems.map((item) => (
                                <SheetClose asChild key={item.href}>
                                    <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-colors",
                                        pathname.startsWith(item.href) && "bg-muted text-foreground"
                                    )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.label}
                                    </Link>
                                </SheetClose>
                            ))}
                            </div>
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
        </>
    )
}
