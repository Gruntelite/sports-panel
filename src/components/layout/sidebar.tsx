
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, MessageSquare, UserCog, Clock, UserSquare, LogOut, Settings, CircleDollarSign, FolderArchive, Briefcase, User, Shield, ClipboardList, AlertTriangle, HelpCircle, Loader2, Send, Database, MoreVertical, Star, Download, Sparkles, Languages, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { Logo } from "../logo";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { sendEmailWithSmtpAction } from "@/lib/email";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "../ui/dropdown-menu";
import { differenceInDays, isFuture } from "date-fns";
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

type UserProfile = {
    name: string;
    email: string;
    initials: string;
    avatar?: string;
}

function HelpForm({clubId, userProfile}: {clubId: string, userProfile: UserProfile}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        
        const payload = new FormData();
        payload.append('clubId', clubId);
        payload.append('recipients', JSON.stringify([{ email: 'info.sportspanel@gmail.com', name: 'Soporte SportsPanel' }]));
        payload.append('subject', `Consulta de Soporte: ${subject}`);
        payload.append('htmlContent', `
            <p><strong>Club ID:</strong> ${clubId}</p>
            <p><strong>Usuario:</strong> ${userProfile.name} (${userProfile.email})</p>
            <hr>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `);

        const result = await sendEmailWithSmtpAction({clubId, recipients: [{ email: 'info.sportspanel@gmail.com', name: 'Soporte SportsPanel' }], subject: `Consulta de Soporte: ${subject}`, htmlContent: `
            <p><strong>Club ID:</strong> ${clubId}</p>
            <p><strong>Usuario:</strong> ${userProfile.name} (${userProfile.email})</p>
            <hr>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `});

        if (result.success) {
            toast({ title: t('contact.successTitle'), description: t('contact.successDescription')});
            setSubject("");
            setMessage("");
            // Ideally close the dialog here
        } else {
            toast({ variant: "destructive", title: t('contact.errorTitle'), description: result.error});
        }
        
        setIsSending(false);
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="subject">{t('contact.subject')}</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="message">{t('contact.message')}</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required className="min-h-[150px]"/>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="mr-2 h-4 w-4"/>
                    {t('common.send')}
                </Button>
            </DialogFooter>
        </form>
    )
}

function ReviewForm({clubId, userProfile}: {clubId: string, userProfile: UserProfile}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast({ variant: "destructive", title: t('review.errorTitle'), description: t('review.errorDescription') });
            return;
        }
        setIsSending(true);
        
        const payload = new FormData();
        payload.append('clubId', clubId); // Use sender club for their SMTP config
        payload.append('recipients', JSON.stringify([{ email: 'info.sportspanel@gmail.com', name: 'Reseñas SportsPanel' }]));
        payload.append('subject', `Nueva Reseña de ${rating} Estrellas de ${userProfile.name}`);
        payload.append('htmlContent', `
            <h2>Nueva Reseña de SportsPanel</h2>
            <p><strong>Club ID:</strong> ${clubId}</p>
            <p><strong>Usuario:</strong> ${userProfile.name} (${userProfile.email})</p>
            <hr>
            <h3>Puntuación: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</h3>
            <h3>Comentario:</h3>
            <p>${comment.replace(/\n/g, '<br>') || '<em>Sin comentario.</em>'}</p>
        `);
        
        const result = await sendEmailWithSmtpAction({clubId, recipients: [{ email: 'info.sportspanel@gmail.com', name: 'Reseñas SportsPanel' }], subject: `Nueva Reseña de ${rating} Estrellas de ${userProfile.name}`, htmlContent: `
            <h2>Nueva Reseña de SportsPanel</h2>
            <p><strong>Club ID:</strong> ${clubId}</p>
            <p><strong>Usuario:</strong> ${userProfile.name} (${userProfile.email})</p>
            <hr>
            <h3>Puntuación: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</h3>
            <h3>Comentario:</h3>
            <p>${comment.replace(/\n/g, '<br>') || '<em>Sin comentario.</em>'}</p>
        `});

        if (result.success) {
            toast({ title: t('review.successTitle'), description: t('review.successDescription')});
            setRating(0);
            setComment("");
             // Ideally close the dialog here
        } else {
            toast({ variant: "destructive", title: t('contact.errorTitle'), description: result.error});
        }
        
        setIsSending(false);
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        />
                    ))}
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="comment">{t('review.comment')}</Label>
                <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[150px]"/>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="mr-2 h-4 w-4"/>
                    {t('review.send')}
                </Button>
            </DialogFooter>
        </form>
    )
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { t, locale, setLocale } = useTranslation();

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [clubId, setClubId] = useState<string | null>(null);
    const [clubName, setClubName] = useState<string | null>(null);
    const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
    const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);


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
                            
                            const trialEndDate = (settingsData.trialEndDate as Timestamp)?.toDate();
                            if (trialEndDate && isFuture(trialEndDate)) {
                                const daysLeft = differenceInDays(trialEndDate, new Date());
                                if (daysLeft <= 10) {
                                    setTrialDaysLeft(daysLeft + 1);
                                }
                            }
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
    
    const defaultOpenAccordion = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title;

    return (
        <div className="hidden border-r bg-card text-card-foreground md:fixed md:flex md:flex-col md:h-full md:w-[220px] lg:w-[280px] z-50">
            <div className="flex h-full max-h-screen flex-col">
                <div className="flex h-20 items-center border-b px-4 lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
                         {loading ? (
                            <Skeleton className="h-8 w-8 rounded-md" />
                         ) : clubLogoUrl ? (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={clubLogoUrl} alt={clubName || 'Logo del Club'}/>
                                <AvatarFallback className="bg-muted">{clubName?.charAt(0) || 'C'}</AvatarFallback>
                            </Avatar>
                         ) : null}
                        <span className="font-headline text-lg font-bold">{clubName || <Skeleton className="h-6 w-32" />}</span>
                    </Link>
                </div>
                 {trialDaysLeft !== null && (
                    <div className="px-4 lg:px-6 py-2 border-b text-center">
                        <p className="text-sm font-semibold flex items-center justify-center gap-2 bg-yellow-100 text-yellow-800 rounded-full py-1">
                            <Sparkles className="h-4 w-4" />
                            {t('sidebar.trialDays', { days: trialDaysLeft })}
                        </p>
                    </div>
                )}
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
                                                ? "bg-primary text-primary-foreground"
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
                <div className="mt-auto p-4 space-y-2 border-t">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start h-auto py-2">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={userProfile?.avatar}/>
                                        <AvatarFallback>{userProfile?.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">{userProfile?.name}</p>
                                        <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
                                    </div>
                                    <MoreVertical className="h-4 w-4 ml-auto"/>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mb-2" align="end">
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Languages className="mr-2 h-4 w-4" />
                                    <span>{locale === 'es' ? 'Castellano' : 'Català'}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                                <Link href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel%20-%20Gu%C3%ADa%20de%20Uso.pdf?alt=media&token=9a5224e2-caed-42a7-b733-b343e284ce40" target="_blank">
                                    <Download className="mr-2 h-4 w-4" />
                                    <span>{t('sidebar.userGuide')}</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setIsReviewOpen(true)}>
                                <Star className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.leaveReview')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setIsHelpOpen(true)}>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.helpSupport')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{t('sidebar.logout')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('sidebar.supportContact')}</DialogTitle>
                            <DialogDescription>
                               {t('sidebar.supportDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        {clubId && userProfile && (
                            <HelpForm clubId={clubId} userProfile={userProfile} />
                        )}
                    </DialogContent>
                </Dialog>
                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('sidebar.leaveReview')}</DialogTitle>
                            <DialogDescription>
                                {t('sidebar.reviewDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        {clubId && userProfile && (
                            <ReviewForm clubId={clubId} userProfile={userProfile} />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

    