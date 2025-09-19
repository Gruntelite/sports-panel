
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "../ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, MessageSquare, UserCog, Clock, UserSquare, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, X, Settings, Languages, HelpCircle, Star, Download, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { useTranslation } from "../i18n-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { sendEmailWithSmtpAction } from "@/lib/email";
import { useToast } from "@/hooks/use-toast";

type UserProfile = {
    name: string;
    email: string;
    initials: string;
    avatar?: string;
}

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
    const router = useRouter();
    const { t, locale, setLocale } = useTranslation();
    const { toast } = useToast();

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
                        const rootUserData = rootUserDocSnap.data();
                        const currentClubId = rootUserData.clubId;
                        setClubId(currentClubId);
                        
                        const clubDocRef = doc(db, "clubs", currentClubId);
                        const clubDocSnap = await getDoc(clubDocRef);
                        if(clubDocSnap.exists()){
                            setClubName(clubDocSnap.data().name);
                        }

                        const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
                        const settingsSnap = await getDoc(settingsRef);
                        if(settingsSnap.exists()){
                            const settingsData = settingsSnap.data();
                            setClubLogoUrl(settingsData.logoUrl || null);
                        }

                        const initials = (rootUserData.name || "U").split(' ').map((n:string) => n[0]).join('').substring(0, 2);

                        let memberAvatar: string | undefined = undefined;
                        if(rootUserData.playerId) {
                            const memberRef = doc(db, "clubs", currentClubId, 'players', rootUserData.playerId);
                            const memberSnap = await getDoc(memberRef);
                            if(memberSnap.exists()) memberAvatar = memberSnap.data().avatar;
                        } else if (rootUserData.coachId) {
                            const memberRef = doc(db, "clubs", currentClubId, 'coaches', rootUserData.coachId);
                            const memberSnap = await getDoc(memberRef);
                            if(memberSnap.exists()) memberAvatar = memberSnap.data().avatar;
                        } else if (rootUserData.staffId) {
                            const memberRef = doc(db, "clubs", currentClubId, 'staff', rootUserData.staffId);
                            const memberSnap = await getDoc(memberRef);
                            if(memberSnap.exists()) memberAvatar = memberSnap.data().avatar;
                        }


                        setUserProfile({
                            name: rootUserData.name || t('sidebar.noName'),
                            email: user.email || t('sidebar.noEmail'),
                            initials: initials,
                            avatar: memberAvatar
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [t]);

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('clubThemeColor');
        localStorage.removeItem('clubThemeColorForeground');
        router.push("/login");
    }

    return (
        <header className="flex h-16 items-center gap-4 border-b bg-primary text-primary-foreground px-4 lg:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                {loading ? (
                    <Skeleton className="h-9 w-9 rounded-md bg-white/20" />
                ) : clubLogoUrl ? (
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={clubLogoUrl} alt={clubName || 'Logo del Club'}/>
                        <AvatarFallback className="bg-white/20 text-primary-foreground">{clubName?.charAt(0) || 'C'}</AvatarFallback>
                    </Avatar>
                ) : null}
                <span className="font-headline text-xl font-bold hidden md:block">{clubName || <Skeleton className="h-6 w-32 bg-white/20" />}</span>
            </div>

            <div className="flex w-full justify-end items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm font-medium gap-1 hover:bg-background/10 hover:text-white">
                            <Languages className="h-4 w-4" />
                            <span className="hidden md:inline">{locale === 'es' ? 'Castellano' : 'Català'}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 hover:bg-background/10">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={userProfile?.avatar}/>
                                <AvatarFallback>{userProfile?.initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuLabel>{userProfile?.name}</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem asChild>
                            <Link href="/account">
                                <UserCog className="mr-2 h-4 w-4" />
                                <span>Mi Cuenta</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel%20-%20Gu%C3%ADa%20de%20Uso.pdf?alt=media&token=9a5224e2-caed-42a7-b733-b343e284ce40" target="_blank">
                                <Download className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.userGuide')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Star className="mr-2 h-4 w-4" />
                            <span>{t('sidebar.leaveReview')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>{t('sidebar.helpSupport')}</span>
                        </DropdownMenuItem>
                         <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t('sidebar.logout')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                             <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-background/10"
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
                                    <Link href="/dashboard" className="flex items-center gap-3 text-lg font-semibold">
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
            </div>
        </header>
    );
}
