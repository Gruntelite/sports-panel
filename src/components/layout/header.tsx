
"use client";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "../ui/dropdown-menu";
import { Menu, Shield, LayoutDashboard, Users, MessageSquare, UserCog, Clock, UserSquare, ClipboardList, Briefcase, FolderArchive, CircleDollarSign, Database, AlertTriangle, X, Settings, Languages, HelpCircle, Star, Download, LogOut, Building, ChevronDown, Home } from "lucide-react";
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
import { Separator } from "../ui/separator";
import { sendReviewAction, sendSupportRequestAction } from "@/lib/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { differenceInDays, isFuture } from "date-fns";


const menuGroups = [
    {
        title: 'sidebar.groups.club',
        items: [
            { href: "/dashboard", label: "sidebar.dashboard", icon: Home },
            { href: "/treasury", label: "sidebar.treasury", icon: CircleDollarSign },
        ]
    },
    {
        title: 'sidebar.groups.members',
        items: [
            { href: "/players", label: "sidebar.players", icon: Users },
            { href: "/coaches", label: "sidebar.coaches", icon: UserSquare },
            { href: "/teams", label: "sidebar.teams", icon: Shield },
            { href: "/staff", label: "sidebar.staff", icon: Briefcase},
        ]
    },
     {
        title: 'sidebar.groups.planning',
        items: [
            { href: "/schedules", label: "sidebar.schedules", icon: Clock },
            { href: "/registrations", label: "sidebar.registrations", icon: ClipboardList },
            { href: "/incidents", label: "sidebar.incidents", icon: AlertTriangle },
        ]
    },
    {
        title: 'sidebar.groups.admin',
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
    const [clubLogo, setClubLogo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [trialEndDate, setTrialEndDate] = useState<Timestamp | null>(null);
    
    // Review Dialog State
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSendingReview, setIsSendingReview] = useState(false);
    
    // Support Dialog State
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [supportMessage, setSupportMessage] = useState("");
    const [isSendingSupport, setIsSendingSupport] = useState(false);


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
                         if (settingsSnap.exists()) {
                            setClubLogo(settingsSnap.data().logoUrl);
                            setTrialEndDate(settingsSnap.data().trialEndDate || null);
                        }

                        const initials = (rootUserData.name || "U").split(' ').map((n:string) => n[0]).join('').substring(0, 2);
                        setUserProfile({
                            name: rootUserData.name || t('sidebar.noName'),
                            email: user.email || t('sidebar.noEmail'),
                            initials: initials,
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
    
    const handleReviewSubmit = async () => {
        if (rating === 0) {
            toast({ variant: "destructive", title: t('review.errorTitle'), description: t('review.errorDescription') });
            return;
        }
        if (!clubId) {
            toast({ variant: "destructive", title: t('common.error'), description: "No se pudo identificar el club para enviar la reseña." });
            return;
        }
        setIsSendingReview(true);
        const result = await sendReviewAction({
            clubId: clubId,
            clubName: clubName || "N/A",
            userName: userProfile?.name || "N/A",
            rating,
            comment,
        });
        
        if (result.success) {
            toast({ title: t('review.successTitle'), description: t('review.successDescription') });
            setIsReviewOpen(false);
            setRating(0);
            setComment("");
        } else {
            toast({ variant: "destructive", title: t('common.error'), description: result.error });
        }
        setIsSendingReview(false);
    }
    
    const handleSupportSubmit = async () => {
        if (!supportMessage.trim()) {
            toast({ variant: "destructive", title: t('support.errorTitle'), description: t('support.errorDescription') });
            return;
        }
        if (!clubId) {
            toast({ variant: "destructive", title: t('common.error'), description: "No se pudo identificar tu club." });
            return;
        }
        setIsSendingSupport(true);
        const result = await sendSupportRequestAction({
            clubId: clubId,
            clubName: clubName || "N/A",
            userName: userProfile?.name || "N/A",
            userEmail: userProfile?.email || "N/A",
            message: supportMessage,
        });

        if (result.success) {
            toast({ title: t('support.successTitle'), description: t('support.successDescription') });
            setIsSupportOpen(false);
            setSupportMessage("");
        } else {
            toast({ variant: "destructive", title: t('common.error'), description: result.error });
        }
        setIsSendingSupport(false);
    };
    
    const clubInitials = clubName?.split(' ').map(n => n[0]).join('').substring(0,2) || 'SP';
    const daysLeft = trialEndDate && isFuture(trialEndDate.toDate()) ? differenceInDays(trialEndDate.toDate(), new Date()) : 0;

    return (
        <>
        <header className="flex h-16 items-center gap-4 border-b bg-header px-4 lg:px-6 fixed top-0 left-0 right-0 z-50">
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
                            <Accordion type="multiple" defaultValue={['Club', 'Miembros']} className="w-full">
                                {menuGroups.map((group, groupIndex) => (
                                    <React.Fragment key={group.title}>
                                        {groupIndex > 0 && <Separator className="my-2" />}
                                        <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t(group.title)}</h3>
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
                             <Separator className="my-2" />
                            <SheetClose asChild>
                                <Link
                                    href="/club-settings"
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                                        pathname.startsWith('/club-settings')
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
                                    {t('sidebar.clubSettings')}
                                </Link>
                            </SheetClose>
                        </nav>
                        <div className="mt-auto">
                             <div className="p-4 border-t">
                                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-base">
                                            <Star className="mr-2 h-4 w-4"/>
                                            {t('sidebar.leaveReview')}
                                        </Button>
                                    </DialogTrigger>
                                </Dialog>
                             </div>
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="hidden md:block">
                     <Logo withText={true} className="text-white" width={36} height={36}/>
                </div>
            </div>

            <div className="flex w-full justify-end items-center gap-2 md:ml-auto md:gap-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white flex items-center gap-2">
                           <Avatar className="h-7 w-7">
                                <AvatarImage src={clubLogo || ''} />
                               <AvatarFallback>{clubInitials}</AvatarFallback>
                           </Avatar>
                            <div className="hidden md:flex flex-col items-start">
                               <span className="font-semibold text-sm">{clubName}</span>
                            </div>
                           {daysLeft > 0 && <Badge variant="destructive">{t('sidebar.trialDays', {days: daysLeft})}</Badge>}
                           <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                       </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuSub>
                           <DropdownMenuSubTrigger>
                             <Languages className="mr-2 h-4 w-4" />
                             <span>{t('sidebar.language')}</span>
                           </DropdownMenuSubTrigger>
                           <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
                                </DropdownMenuSubContent>
                           </DropdownMenuPortal>
                         </DropdownMenuSub>
                          <DropdownMenuItem asChild>
                            <Link href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel_Guia-pas-a-pas.pdf?alt=media&token=8e8e635f-95f7-491e-b7d4-c65094dc3021" target="_blank">
                                <Download className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.userGuide')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsReviewOpen(true)}>
                            <Star className="mr-2 h-4 w-4" />
                            <span>{t('sidebar.leaveReview')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsSupportOpen(true)}>
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

        {/* Review Dialog */}
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('sidebar.leaveReview')}</DialogTitle>
                    <DialogDescription>{t('review.reviewDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('review.rating')}</Label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                "h-8 w-8 cursor-pointer transition-colors",
                                (hoverRating || rating) >= star
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                )}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                            />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="comment">{t('review.comment')}</Label>
                        <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsReviewOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleReviewSubmit} disabled={isSendingReview}>
                        {isSendingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {t('review.send')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Support Dialog */}
        <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('sidebar.supportContact')}</DialogTitle>
                    <DialogDescription>{t('sidebar.supportDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="supportMessage">{t('support.message')}</Label>
                        <Textarea 
                            id="supportMessage" 
                            value={supportMessage} 
                            onChange={(e) => setSupportMessage(e.target.value)} 
                            placeholder={t('support.messagePlaceholder')}
                            className="min-h-[150px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsSupportOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleSupportSubmit} disabled={isSendingSupport}>
                        {isSendingSupport && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {t('common.send')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

type UserProfile = {
    name: string;
    email: string;
    initials: string;
    avatar?: string;
}
