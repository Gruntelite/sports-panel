

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import type { RegistrationForm } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  MoreHorizontal,
  Clipboard,
  ExternalLink,
  Users,
  Trash2,
  CalendarCheck,
  CircleDollarSign,
  Edit,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { es, ca } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { RegistrationFormCreator } from "@/components/registration-form-creator";
import { useTranslation } from "@/components/i18n-provider";

export default function RegistrationsPage() {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [registrationForms, setRegistrationForms] = useState<RegistrationForm[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formToEdit, setFormToEdit] = useState<RegistrationForm | null>(null);
  const [formToDelete, setFormToDelete] = useState<RegistrationForm | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchForms(currentClubId);
          }
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchForms = async (currentClubId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "clubs", currentClubId, "registrationForms"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const formsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationForm));
      setRegistrationForms(formsList);
    } catch (error) {
      console.error("Error fetching forms:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los formularios." });
    }
    setLoading(false);
  };
  
  const handleFormSaved = () => {
    setIsModalOpen(false);
    setFormToEdit(null);
    if(clubId) fetchForms(clubId);
  }

  const handleOpenModal = (mode: 'add' | 'edit', form?: RegistrationForm) => {
    setModalMode(mode);
    setFormToEdit(form || null);
    setIsModalOpen(true);
  };
  
  const handleCopyLink = (formId: string) => {
     const fullUrl = `${window.location.origin}/form/${formId}`;
     navigator.clipboard.writeText(fullUrl);
     toast({ title: t('registrations.linkCopied'), description: t('registrations.linkCopiedDesc') });
  }

  const handleDeleteForm = async () => {
    if (!clubId || !formToDelete) return;
    setSaving(true);
    try {
        await deleteDoc(doc(db, "clubs", clubId, "registrationForms", formToDelete.id));
        toast({ title: t('registrations.eventDeleted'), description: t('registrations.eventDeletedDesc', { eventName: formToDelete.title }) });
        setFormToDelete(null);
        fetchForms(clubId);
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: t('registrations.eventDeleteError')});
    } finally {
        setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">{t('sidebar.registrations')}</h1>
            <p className="text-muted-foreground">
              {t('registrations.description')}
            </p>
          </div>
           <div className="mt-4 md:mt-0">
             <Button onClick={() => handleOpenModal('add')} className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('registrations.createEvent')}
              </Button>
           </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({length: 3}).map((_, i) => (
                <Card key={i}><CardContent className="p-6 h-48 animate-pulse bg-muted/50"></CardContent></Card>
            ))
          ) : registrationForms.length > 0 ? (
              registrationForms.map((form) => (
                <Card key={form.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{form.title}</CardTitle>
                          <CardDescription>
                            {form.eventStartDate ? (
                                <span>
                                    {t('registrations.from')} {format(form.eventStartDate.toDate(), "d MMM", { locale: locale === 'ca' ? ca : es })} {t('registrations.to')} {format(form.eventEndDate ? form.eventEndDate.toDate() : form.eventStartDate.toDate(), "d MMM yyyy", { locale: locale === 'ca' ? ca : es })}
                                </span>
                            ) : t('registrations.noEventDate')}
                          </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleOpenModal('edit', form)}><Edit className="mr-2 h-4 w-4"/>{t('registrations.edit')}</DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/registrations/${form.id}`}><Eye className="mr-2 h-4 w-4" />{t('registrations.viewRegistrations')}</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleCopyLink(form.id)}><Clipboard className="mr-2 h-4 w-4" />{t('registrations.copyLink')}</DropdownMenuItem>
                            <DropdownMenuItem asChild><a href={`/form/${form.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{t('registrations.openForm')}</a></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => setFormToDelete(form)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('registrations.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={form.status === 'active' ? 'secondary' : 'outline'}>{form.status === 'active' ? t('registrations.active') : t('registrations.closed')}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarCheck className="h-4 w-4"/>
                          <span>{t('registrations.registration')}: <b>{form.registrationStartDate ? format(form.registrationStartDate.toDate(), "dd/MM/yy") : 'N/A'} - {form.registrationDeadline ? format(form.registrationDeadline.toDate(), "dd/MM/yy") : 'N/A'}</b></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CircleDollarSign className="h-4 w-4"/>
                          <span>{t('registrations.price')}: <b>{form.price > 0 ? `${form.price}€` : t('registrations.free')}</b></span>
                      </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4 text-muted-foreground"/>
                        <span>{form.submissionCount || 0} {t('registrations.of')} {form.maxSubmissions || '∞'} {t('registrations.registrants')}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))
          ) : (
              <div className="col-span-full h-48 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold">{t('registrations.noEventsTitle')}</h3>
                <p className="text-sm">{t('registrations.noEventsDesc')}</p>
              </div>
          )}
        </div>
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? t('registrations.modal.createTitle') : t('registrations.modal.editTitle')}</DialogTitle>
            <DialogDescription>{t('registrations.modal.description')}</DialogDescription>
          </DialogHeader>
          <RegistrationFormCreator 
            onFormSaved={handleFormSaved} 
            initialData={formToEdit}
            mode={modalMode}
          />
        </DialogContent>
      </Dialog>


       <AlertDialog open={!!formToDelete} onOpenChange={(open) => !open && setFormToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('registrations.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('registrations.confirmDeleteDesc', { eventName: formToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteForm}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('registrations.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
