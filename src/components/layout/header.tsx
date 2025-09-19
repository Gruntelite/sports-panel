
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, MessageSquare, UserCog, Clock, UserSquare, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, X, Settings, Languages } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
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


export function Header() {
    const pathname = usePathname();
    const { t, locale, setLocale } = useTranslation();
    
    const findCurrentPage = () => {
      for (const group of menuGroups) {
        const foundItem = group.items.find(item => pathname.startsWith(item.href));
        if (foundItem) {
          return t(foundItem.label);
        }
      }
      return t('sidebar.dashboard');
    }

    const currentPage = findCurrentPage();

    return (
        <>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 md:hidden">
             <h1 className="text-xl font-bold font-headline tracking-tight">
                {currentPage}
            </h1>
             <div className="ml-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Languages className="h-[1.2rem] w-[1.2rem]" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
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
                        <span className="sr-only">{t('header.openMenu')}</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 bg-card text-card-foreground">
                    <SheetHeader>
                         <SheetTitle className="sr-only">{t('header.mainMenu')}</SheetTitle>
                    </SheetHeader>
                     <nav className="flex flex-col h-full">
                        <div className="flex h-20 items-center border-b px-4 lg:px-6 shrink-0">
                             <Link
                                href="/dashboard"
                                className="flex items-center gap-3 text-lg font-semibold"
                            >
                                <Logo withText={true}/>
                            </Link>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                             <Accordion type="single" collapsible defaultValue="Miembros" className="w-full px-2 lg:px-4">
                               {menuGroups.map((group) => (
                                 <AccordionItem key={group.title} value={group.title} className="border-b-0">
                                   <AccordionTrigger className="py-2 text-sm font-semibold text-muted-foreground hover:no-underline hover:text-foreground">
                                    {group.title}
                                   </AccordionTrigger>
                                   <AccordionContent className="pb-2">
                                     <div className="grid items-start gap-1">
                                        {group.items.map((item) => (
                                            <SheetClose asChild key={item.href}>
                                                <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm",
                                                    pathname.startsWith(item.href) && "bg-muted text-primary-foreground"
                                                )}
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    {t(item.label)}
                                                </Link>
                                            </SheetClose>
                                        ))}
                                        </div>
                                   </AccordionContent>
                                 </AccordionItem>
                               ))}
                            </Accordion>
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
        </>
    )
}

    