"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Search, Shield, LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
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
    { href: "/users", label: "Gestión de Usuarios", icon: UserCog },
];

export function Header() {
    const pathname = usePathname();

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
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
                </SheetContent>
            </Sheet>

            <div className="w-full flex-1">
                <form>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar jugadores, equipos..."
                            className="w-full appearance-none bg-muted/40 pl-8 shadow-none md:w-2/3 lg:w-1/3"
                        />
                    </div>
                </form>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <Avatar>
                          <AvatarImage src="https://placehold.co/40x40.png" alt="@admin" />
                          <AvatarFallback>AU</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Alternar menú de usuario</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Usuario Admin</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Ajustes</DropdownMenuItem>
                    <DropdownMenuItem>Soporte</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/">Cerrar Sesión</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}

    