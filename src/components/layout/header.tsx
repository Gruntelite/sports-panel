"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
    { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
    { href: "/players", label: "Jugadores", icon: Users },
    { href: "/coaches", label: "Entrenadores", icon: UserSquare },
    { href: "/teams", label: "Equipos", icon: Shield },
    { href: "/schedules", label: "Horarios", icon: Clock },
    { href: "/calendar", label: "Calendario", icon: Calendar },
    { href: "/communications", label: "Comunicaciones", icon: MessageSquare },
    { href: "/staff", label: "Staff y Directiva", icon: UserCog},
    { href: "/users", label: "Gestión de Usuarios", icon: UserCog },
];

export function Header() {
    const pathname = usePathname();

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Alternar menú de navegación</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                    <nav className="grid gap-2 text-lg font-medium">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-lg font-semibold mb-4"
                        >
                            <Shield className="h-6 w-6 text-primary" />
                            <span className="font-headline">SportsPanel</span>
                        </Link>
                        {menuItems.map((item) => (
                             <Link
                             key={item.href}
                             href={item.href}
                             className={cn(
                                 "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                                 pathname.startsWith(item.href) && "bg-muted text-foreground"
                             )}
                         >
                             <item.icon className="h-5 w-5" />
                             {item.label}
                         </Link>
                        ))}
                    </nav>
                     <div className="mt-auto border-t pt-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary h-auto">
                                    <Avatar className="h-9 w-9">
                                    <AvatarImage src="https://placehold.co/40x40.png" alt="@admin" />
                                    <AvatarFallback>AU</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold text-sm text-foreground">Usuario Admin</span>
                                        <span className="text-xs text-muted-foreground">admin@sportspanel.com</span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 mb-2">
                                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Ajustes</DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                <Link href="/">Cerrar Sesión</Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </SheetContent>
            </Sheet>
            <div className="flex-1 text-center">
                 <h1 className="text-xl font-bold font-headline tracking-tight">
                    {menuItems.find(item => pathname.startsWith(item.href))?.label || 'SportsPanel'}
                </h1>
            </div>
        </header>
    )
}
