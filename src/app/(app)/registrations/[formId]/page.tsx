
"use client";

import { useState, useEffect } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
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
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function RegistrationSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;
  const [clubId, setClubId] = useState<string | null>(null);

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

    const headers = ["Fecha de Inscripción", ...formDef.fields.map(field => field.label)];
    
    const csvRows = [
        headers.join(','),
        ...submissions.map(submission => {
            const date = format(submission.submittedAt.toDate(), "yyyy-MM-dd HH:mm:ss");
            const values = formDef.fields.map(field => {
                const value = submission.data[field.id] || "";
                return `"${String(value).replace(/"/g, '""')}"`;
            });
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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formDef) {
    return <p>No se encontró el formulario.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold font-headline tracking-tight">Inscritos en: {formDef.title}</h1>
                <p className="text-muted-foreground">Viendo {submissions.length} de {formDef.submissionCount || submissions.length} inscripciones.</p>
            </div>
        </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Inscritos</CardTitle>
              <CardDescription>
                Estos son los datos de las personas que se han registrado a través del formulario público.
              </CardDescription>
            </div>
            <Button onClick={handleDownloadCsv} variant="outline" disabled={submissions.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Descargar CSV
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de Inscripción</TableHead>
                {formDef.fields.map((field) => (
                  <TableHead key={field.id}>{field.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {format(submission.submittedAt.toDate(), "d MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    {formDef.fields.map((field) => (
                      <TableCell key={field.id}>
                        {submission.data[field.id] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={formDef.fields.length + 1}
                    className="h-24 text-center"
                  >
                    Todavía no hay ninguna inscripción.
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

