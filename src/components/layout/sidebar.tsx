
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessageSquare, Clock, UserSquare, Shield, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "../i18n-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";


const menuGroups = [
    {
        title: 'Club',
        items: [
            { href: "/dashboard", label: "sidebar.dashboard", icon: LayoutDashboard },
            { href: "/treasury", label: "sidebar.treasury", icon: CircleDollarSign },
        ]
    },
    {
        title: 'Miembros',
        defaultOpen: true,
        items: [
            { href: "/players", label: "sidebar.players", icon: Users },
            { href: "/coaches", label: "sidebar.coaches", icon: UserSquare },
            { href: "/teams", label: "sidebar.teams", icon: Shield },
            { href: "/staff", label: "sidebar.staff", icon: Briefcase},
        ]
    },
     {
        title: 'Planificación',
        items: [
            { href: "/schedules", label: "sidebar.schedules", icon: Clock },
            { href: "/registrations", label: "sidebar.registrations", icon: ClipboardList },
            { href: "/incidents", label: "sidebar.incidents", icon: AlertTriangle },
        ]
    },
    {
        title: 'Administración',
        items: [
            { href: "/communications", label: "sidebar.communications", icon: MessageSquare },
            { href: "/club-files", label: "sidebar.clubFiles", icon: FolderArchive },
            { href: "/importer", label: "sidebar.importer", icon: Database },
            { href: "/club-settings", label: "sidebar.clubSettings", icon: Settings },
        ]
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const defaultOpenAccordion = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title;

    return (
        <div className="hidden border-r bg-card text-card-foreground md:fixed md:flex md:flex-col md:h-full md:w-[220px] lg:w-[280px] z-40">
            <div className="flex h-full max-h-screen flex-col pt-16">
                <div className="flex-1 overflow-y-auto pt-4">
                    <Accordion type="single" collapsible defaultValue={defaultOpenAccordion || "Miembros"} className="w-full px-2 lg:px-4">
                       {menuGroups.map((group) => (
                         <AccordionItem key={group.title} value={group.title} className="border-b-0">
                           <AccordionTrigger className="py-2 text-sm font-semibold text-muted-foreground hover:no-underline hover:text-foreground">
                            {group.title}
                           </AccordionTrigger>
                           <AccordionContent className="pb-2">
                             <nav className="grid items-start gap-1">
                                {group.items.map((item) => {
                                    const isActive = pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm",
                                                isActive
                                                ? "bg-primary/10 text-primary font-semibold"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {t(item.label)}
                                        </Link>
                                    )
                                })}
                              </nav>
                           </AccordionContent>
                         </AccordionItem>
                       ))}
                    </Accordion>
                </div>
            </div>
        </div>
    );
}

    
