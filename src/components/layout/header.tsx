
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, X, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { useTranslation } from "../i18n-provider";
import { LanguageSwitcher } from "../language-switcher";

const menuItems = [
    { href: "/dashboard", label: "sidebar.dashboard", icon: LayoutDashboard },
    { href: "/treasury", label: "sidebar.treasury", icon: CircleDollarSign },
    { href: "/players", label: "sidebar.players", icon: Users },
    { href: "/coaches", label: "sidebar.coaches", icon: UserSquare },
    { href: "/teams", label: "sidebar.teams", icon: Shield },
    { href: "/staff", label: "sidebar.staff", icon: Briefcase},
    { href: "/schedules", label: "sidebar.schedules", icon: Clock },
    { href: "/communications", label: "sidebar.communications", icon: MessageSquare },
    { href: "/registrations", label: "sidebar.registrations", icon: ClipboardList },
    { href: "/incidents", label: "sidebar.incidents", icon: AlertTriangle },
    { href: "/club-files", label: "sidebar.clubFiles", icon: FolderArchive },
    { href: "/importer", label: "sidebar.importer", icon: Database },
    { href: "/club-settings", label: "sidebar.clubSettings", icon: Settings },
];


export function Header() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const currentPageKey = menuItems.find(item => pathname.includes(item.href))?.label || 'sidebar.dashboard';
    const currentPage = t(currentPageKey);

    return (
        <>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 md:hidden">
             <h1 className="text-xl font-bold font-headline tracking-tight">
                {currentPage}
            </h1>
             <div className="ml-auto">
                <LanguageSwitcher />
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
                <SheetContent side="left" className="flex flex-col p-0">
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
                             <div className="grid items-start p-4 gap-1">
                            {menuItems.map((item) => (
                                <SheetClose asChild key={item.href}>
                                    <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-colors",
                                        pathname.includes(item.href) && "bg-muted text-foreground"
                                    )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {t(item.label)}
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
