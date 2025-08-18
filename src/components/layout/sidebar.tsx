"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Users, Calendar, MessageSquare, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
    { href: "/teams", label: "Equipos", icon: Shield },
    { href: "/players", label: "Jugadores", icon: Users },
    { href: "/calendar", label: "Calendario", icon: Calendar },
    { href: "/communications", label: "Comunicaciones", icon: MessageSquare },
    { href: "/users", label: "Gestión de Usuarios", icon: UserCog },
  ];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden border-r bg-card md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <Shield className="h-6 w-6 text-primary" />
                        <span className="font-headline text-lg">SportsPanel</span>
                    </Link>
                </div>
                <div className="flex-1">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all",
                                        isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:text-primary hover:bg-muted"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </div>
        </div>
    )
}
