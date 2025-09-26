"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessageSquare, Clock, UserSquare, Shield, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "../i18n-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";


export function Sidebar() {
    const pathname = usePathname();
    const { t } = useTranslation();

    const menuGroups = [
        {
            title: t('sidebar.groups.club'),
            items: [
                { href: "/dashboard", label: "sidebar.dashboard", icon: Home },
                { href: "/treasury", label: "sidebar.treasury", icon: CircleDollarSign },
            ]
        },
        {
            title: t('sidebar.groups.members'),
            items: [
                { href: "/players", label: "sidebar.players", icon: Users },
                { href: "/coaches", label: "sidebar.coaches", icon: UserSquare },
                { href: "/teams", label: "sidebar.teams", icon: Shield },
                { href: "/staff", label: "sidebar.staff", icon: Briefcase},
            ]
        },
         {
            title: t('sidebar.groups.planning'),
            items: [
                { href: "/schedules", label: "sidebar.schedules", icon: Clock },
                { href: "/registrations", label: "sidebar.registrations", icon: ClipboardList },
                { href: "/incidents", label: "sidebar.incidents", icon: AlertTriangle },
            ]
        },
        {
            title: t('sidebar.groups.admin'),
            items: [
                { href: "/communications", label: "sidebar.communications", icon: MessageSquare },
                { href: "/club-files", label: "sidebar.clubFiles", icon: FolderArchive },
                { href: "/importer", label: "sidebar.importer", icon: Database },
                { href: "/club-settings", label: "sidebar.clubSettings", icon: Settings },
            ]
        }
    ];

    return (
        <div className="hidden border-r bg-card text-card-foreground md:fixed md:flex md:flex-col md:h-full md:w-[220px] lg:w-[280px] z-40 pt-16">
            <div className="flex-1 overflow-y-auto pt-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
                    {menuGroups.map((group, groupIndex) => (
                        <div key={group.title}>
                            {groupIndex > 0 && <Separator className="my-2" />}
                            <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</h3>
                             {group.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                                            isActive
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <div className={cn("absolute left-0 h-6 w-1 rounded-r-full", isActive ? "bg-primary" : "bg-transparent")}></div>
                                        <item.icon className="h-4 w-4" />
                                        {t(item.label)}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>
            </div>
        </div>
    );
}
