
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "../ui/dropdown-menu";
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

    const handleSupportClick = async () => {
         if (!clubId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido identificar tu club.' });
            return;
        }

        const subject = `Soporte SportsPanel - ${clubName || clubId}`;
        const body = `Hola, necesito ayuda con... (Por favor, detalla tu problema aquí. Incluye tu nombre y el del club para que podamos ayudarte mejor).`;
        const mailtoLink = `mailto:info.sportspanel@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }

    return (
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6 fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center gap-3">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                        >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">{t('header.openMenu')}</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col">
                        <SheetHeader>
                             <Link href="#" className="flex items-center" prefetch={false}>
                                <Logo withText={true}/>
                            </Link>
                        </SheetHeader>
                        <nav className="grid gap-2 text-lg font-medium overflow-y-auto">
                            <Accordion type="multiple" defaultValue={['Miembros']} className="w-full">
                                {menuGroups.map((group, groupIndex) => (
                                    <React.Fragment key={group.title}>
                                        {groupIndex > 0 && <Separator className="my-2" />}
                                        <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</h3>
                                        {group.items.map((item) => (
                                        <SheetClose asChild key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                                                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {t(item.label)}
                                            </Link>
                                        </SheetClose>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </Accordion>
                        </nav>
                        <div className="mt-auto">
                             <div className="p-4 border-t">
                                <Link href="https://sportspanel.net" target='_blank'>
                                    <Button variant="outline" className="w-full justify-start text-base">
                                        <Star className="mr-2 h-4 w-4"/>
                                        {t('sidebar.leaveReview')}
                                    </Button>
                                </Link>
                             </div>
                        </div>
                    </SheetContent>
                </Sheet>
                <Logo withText={true} />
            </div>

            <div className="flex w-full justify-end items-center gap-2 md:ml-auto md:gap-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                           <Avatar>
                                {userProfile ? <AvatarImage src={userProfile.avatar} /> : <Skeleton className="h-10 w-10 rounded-full" />}
                               <AvatarFallback>{userProfile?.initials || 'U'}</AvatarFallback>
                           </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-64">
                         <DropdownMenuLabel>
                            <span className="font-semibold text-base">{clubName}</span>
                         </DropdownMenuLabel>
                         <DropdownMenuSeparator />
                        <DropdownMenuSub>
                           <DropdownMenuSubTrigger>
                             <Languages className="mr-2 h-4 w-4" />
                             <span>Idioma</span>
                           </DropdownMenuSubTrigger>
                           <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
                                </DropdownMenuSubContent>
                           </DropdownMenuPortal>
                         </DropdownMenuSub>
                          <DropdownMenuItem asChild>
                            <Link href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel%20-%20Gu%C3%ADa%20de%20Uso.pdf?alt=media&token=9a5224e2-caed-42a7-b733-b343e284ce40" target="_blank">
                                <Download className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.userGuide')}</span>
                            </Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                            <Link href="https://sportspanel.net" target='_blank'>
                                <Star className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.leaveReview')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSupportClick}>
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

    