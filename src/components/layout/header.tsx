
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "../ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, MessageSquare, UserCog, Clock, UserSquare, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, X, Settings, Languages, HelpCircle, Star, Download, LogOut, Building, ChevronDown } from "lucide-react";
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
        router.push("/login");
    }

    return (
        <header className="flex h-16 items-center gap-4 border-b bg-gray-800 text-primary-foreground px-4 lg:px-6 fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center gap-3">
                <Logo withText={true} />
            </div>

            <div className="flex w-full justify-end items-center gap-2 md:gap-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm font-medium gap-1.5 hover:bg-white/10 hover:text-white">
                           <Building className="h-4 w-4"/>
                           <span className="font-semibold">{clubName || <Skeleton className="h-4 w-24 bg-white/20" />}</span>
                           <ChevronDown className="h-4 w-4 opacity-70"/>
                        </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                         <DropdownMenuLabel>Tu Club</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem asChild>
                            <Link href="/club-settings">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Ajustes del Club</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Separator orientation="vertical" className="h-8 bg-white/20 hidden md:block" />

                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="text-sm font-medium gap-1.5 hover:bg-white/10 hover:text-white">
                            <Avatar className="h-7 w-7 border-2 border-white/50">
                                <AvatarImage src={userProfile?.avatar}/>
                                <AvatarFallback>{userProfile?.initials}</AvatarFallback>
                            </Avatar>
                           <span className="font-semibold hidden md:inline">{userProfile?.name || <Skeleton className="h-4 w-20 bg-white/20" />}</span>
                           <ChevronDown className="h-4 w-4 opacity-70"/>
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
                        <DropdownMenuSub>
                           <DropdownMenuSubTrigger>
                             <Languages className="mr-2 h-4 w-4" />
                             <span>Idioma</span>
                           </DropdownMenuSubTrigger>
                           <DropdownMenuSubContent>
                               <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
                           </DropdownMenuSubContent>
                         </DropdownMenuSub>
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
            </div>
        </header>
    );
}
