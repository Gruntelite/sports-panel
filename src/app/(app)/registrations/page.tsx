
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "firebase/firestore";
import type { RegistrationForm } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  MoreHorizontal,
  Clipboard,
  ExternalLink,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { RegistrationFormCreator } from "@/components/registration-form-creator";

export default function RegistrationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [registrationForms, setRegistrationForms] = useState<RegistrationForm[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  
  const handleFormCreated = () => {
    setIsModalOpen(false);
    if(clubId) fetchForms(clubId);
  }
  
  const handleCopyLink = (formId: string) => {
     const fullUrl = `${window.location.origin}/form/${formId}`;
     navigator.clipboard.writeText(fullUrl);
     toast({ title: "Enlace Copiado", description: "La URL del formulario se ha copiado." });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Inscripciones</h1>
        <p className="text-muted-foreground">
          Crea y gestiona formularios de inscripción para tus eventos, campus o captaciones.
        </p>
      </div>

       <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              <CardTitle>Eventos de Inscripción</CardTitle>
              <CardDescription>
                Formularios de inscripción creados para el club.
              </CardDescription>
            </div>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Evento
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                     <DialogHeader>
                        <DialogTitle>Crear Formulario de Inscripción</DialogTitle>
                        <DialogDescription>Diseña un formulario público para tu próximo evento, torneo o captación.</DialogDescription>
                    </DialogHeader>
                    <RegistrationFormCreator onFormCreated={handleFormCreated} />
                </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título del Evento</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inscritos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrationForms.length > 0 ? (
                    registrationForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{form.title}</TableCell>
                        <TableCell>{format(form.createdAt.toDate(), "d 'de' LLLL, yyyy", { locale: es })}</TableCell>
                        <TableCell>
                           <Badge variant={form.status === 'active' ? 'secondary' : 'outline'}>{form.status === 'active' ? 'Activo' : 'Cerrado'}</Badge>
                        </TableCell>
                         <TableCell>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground"/>
                                {form.submissionCount || 0}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleCopyLink(form.id)}><Clipboard className="mr-2 h-4 w-4" />Copiar Enlace Público</DropdownMenuItem>
                                <DropdownMenuItem asChild><a href={`/form/${form.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Abrir Formulario</a></DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No has creado ningún evento de inscripción todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

