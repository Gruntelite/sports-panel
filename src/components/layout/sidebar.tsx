
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Calendar, MessageSquare, UserCog, Clock, UserSquare, LogOut, Settings, CircleDollarSign, FolderArchive, Briefcase, User, Shield, ClipboardList, AlertTriangle, HelpCircle, Loader2, Send, Database, MoreVertical, Star, Download, Sparkles, Languages, ChevronDown } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { differenceInDays, isFuture } from "date-fns";
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

type UserProfile = {
    name: string;
    email: string;
    initials: string;
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
        
        const payload = {
            clubId: clubId,
            recipients: [{ email: 'info.sportspanel@gmail.com', name: 'Soporte SportsPanel' }],
            subject: `Consulta de Soporte: ${'${subject}'}`,
            htmlContent: `
                <p><strong>Club ID:</strong> ${'${clubId}'}</p>
                <p><strong>Usuario:</strong> ${'${userProfile.name}'} (${'${userProfile.email}'})</p>
                <hr>
                <p>${'${message.replace(/\n/g, \'<br>\')}'}</p>
            `,
        };

        const result = await sendEmailWithSmtpAction(payload);

        if (result.success) {
            toast({ title: t('contact.successTitle'), description: t('contact.successDescription')});
            setSubject("");
            setMessage("");
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
        
        const payload = {
            clubId: clubId,
            recipients: [{ email: 'info.sportspanel@gmail.com', name: 'Reseñas SportsPanel' }],
            subject: `Nueva Reseña de ${'${rating}'} Estrellas de ${'${userProfile.name}'}`,
            htmlContent: `
                <h2>Nueva Reseña de SportsPanel</h2>
                <p><strong>Club ID:</strong> ${'${clubId}'}</p>
                <p><strong>Usuario:</strong> ${'${userProfile.name}'} (${'${userProfile.email}'})</p>
                <hr>
                <h3>Puntuación: ${'${ \'★\'.repeat(rating) }'}${'${ \'☆\'.repeat(5 - rating) }'} (${'${rating}'}/5)</h3>
                <h3>Comentario:</h3>
                <p>${'${comment.replace(/\n/g, \'<br>\') || \'<em>Sin comentario.</em>\'}'}</p>
            `,
        };
        
        const result = await sendEmailWithSmtpAction(payload);

        if (result.success) {
            toast({ title: t('review.successTitle'), description: t('review.successDescription')});
            setRating(0);
            setComment("");
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
    const { t } = useTranslation();

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
                        const currentClubId = rootUserDocSnap.data().clubId;
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
                                if (daysLeft <= 20) {
                                    setTrialDaysLeft(daysLeft + 1);
                                }
                            }
                        }

                        setUserProfile({
                            name: user.displayName || t('sidebar.noName'),
                            email: user.email || t('sidebar.noEmail'),
                            initials: (user.displayName || "U").split(' ').map((n:string) => n[0]).join('')
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
        <div className="hidden border-r bg-primary text-primary-foreground md:fixed md:flex md:flex-col md:h-full md:w-[220px] lg:w-[280px] z-50">
            <div className="flex h-full max-h-screen flex-col">
                <div className="flex h-20 items-center border-b border-primary-foreground/20 px-4 lg:px-6">
                    <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
                         {loading ? (
                            <Skeleton className="h-8 w-8 rounded-md bg-white/20" />
                         ) : clubLogoUrl ? (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={clubLogoUrl} alt={clubName || 'Logo del Club'}/>
                                <AvatarFallback className="bg-white/20 text-primary-foreground">{clubName?.charAt(0) || 'C'}</AvatarFallback>
                            </Avatar>
                         ) : null}
                        <span className="font-headline text-lg font-bold text-shadow shadow-black/20">{clubName || <Skeleton className="h-6 w-32 bg-white/20" />}</span>
                    </Link>
                </div>
                 {trialDaysLeft !== null && (
                    <div className="px-4 lg:px-6 py-2 border-b border-primary-foreground/20 text-center">
                        <p className="text-sm font-semibold flex items-center justify-center gap-2 bg-white/10 rounded-full py-1">
                            <Sparkles className="h-4 w-4 text-yellow-300" />
                            {t('sidebar.trialDays', { days: trialDaysLeft })}
                        </p>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto pt-4">
                    <nav className="grid items-start px-2 font-medium lg:px-4">
                        {menuItems.map((item) => {
                            const isActive = pathname.includes(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all text-base",
                                        isActive
                                        ? "bg-white text-black"
                                        : "hover:bg-white/20"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {t(item.label)}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="mt-auto p-4 space-y-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-center gap-2 rounded-lg px-3 py-1.5 text-base hover:bg-white/20">
                                <Logo width={28} height={28} />
                                <span className="text-base font-semibold">SportsPanel</span>
                                <MoreVertical className="h-4 w-4 ml-auto"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mb-2" align="end">
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <LanguageSwitcher />
                            </DropdownMenuItem>
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
                            <DropdownMenuItem onSelect={handleLogout}>
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

