
"use client";

import { useState, useEffect } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, updateDoc } from "firebase/firestore";
import type { RegistrationForm, FormSubmission } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es, ca } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/components/i18n-provider";

export default function RegistrationSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;
  const [clubId, setClubId] = useState<string | null>(null);

  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [formDef, setFormDef] = useState<RegistrationForm | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!formId || !clubId) return;

    const fetchFormData = async () => {
      setLoading(true);
      try {
        const formRef = doc(db, "clubs", clubId, "registrationForms", formId);
        const formSnap = await getDoc(formRef);

        if (formSnap.exists()) {
          setFormDef(formSnap.data() as RegistrationForm);

          const submissionsQuery = query(collection(formRef, "submissions"), orderBy("submittedAt", "desc"));
          const submissionsSnapshot = await getDocs(submissionsQuery);
          const subs = submissionsSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as FormSubmission)
          );
          setSubmissions(subs);
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [formId, clubId]);
  
  const handleDownloadCsv = () => {
    if (!formDef || submissions.length === 0) return;

    const headers = [t('registrations.form.submissionDate'), ...formDef.fields.map(field => field.label), ...(formDef.price > 0 ? [t('registrations.form.paymentStatus')] : [])];
    
    const csvRows = [
        headers.join(','),
        ...submissions.map(submission => {
            const date = format(submission.submittedAt.toDate(), "yyyy-MM-dd HH:mm:ss");
            const values = formDef.fields.map(field => {
                const value = submission.data[field.id] || "";
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            if (formDef.price > 0) {
              values.push(submission.paymentStatus === 'paid' ? "Pagado" : "Pendiente");
            }
            return [`"${date}"`, ...values].join(',');
        })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inscritos_${formDef.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePaymentStatusChange = async (submissionId: string, newStatus: 'paid' | 'pending') => {
    if (!clubId || !formId) return;

    const submissionRef = doc(db, "clubs", clubId, "registrationForms", formId, "submissions", submissionId);
    try {
        await updateDoc(submissionRef, { paymentStatus: newStatus });
        setSubmissions(prev => prev.map(sub => sub.id === submissionId ? { ...sub, paymentStatus: newStatus } : sub));
        toast({ title: t('registrations.form.paymentStatusUpdated')});
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: t('registrations.form.paymentStatusError') });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formDef) {
    return <p>{t('registrations.form.notFound')}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold font-headline tracking-tight">{t('registrations.form.title', { formTitle: formDef.title })}</h1>
                <p className="text-muted-foreground">{t('registrations.form.description', { count: submissions.length, total: formDef.submissionCount || submissions.length })}</p>
            </div>
        </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('registrations.form.listTitle')}</CardTitle>
              <CardDescription>
                {t('registrations.form.listDescription')}
              </CardDescription>
            </div>
            <Button onClick={handleDownloadCsv} variant="outline" disabled={submissions.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {t('registrations.form.downloadCsv')}
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('registrations.form.date')}</TableHead>
                {formDef.fields.map((field) => (
                  <TableHead key={field.id}>{field.label}</TableHead>
                ))}
                 {formDef.price > 0 && <TableHead>{t('registrations.form.paid')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {format(submission.submittedAt.toDate(), "d MMM yy, HH:mm", { locale: locale === 'ca' ? ca : es })}
                    </TableCell>
                    {formDef.fields.map((field) => (
                      <TableCell key={field.id}>
                        {submission.data[field.id] || "-"}
                      </TableCell>
                    ))}
                    {formDef.price > 0 && (
                      <TableCell>
                          <Checkbox
                            checked={submission.paymentStatus === 'paid'}
                            onCheckedChange={(checked) => handlePaymentStatusChange(submission.id, checked ? 'paid' : 'pending')}
                          />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={formDef.fields.length + 2}
                    className="h-24 text-center"
                  >
                    {t('registrations.form.noSubmissions')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
