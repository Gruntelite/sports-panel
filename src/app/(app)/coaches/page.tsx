
"use client";

import { useState, useEffect } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, query } from "firebase/firestore";
import type { Coach } from "@/lib/types";


export default function CoachesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [coaches, setCoaches] = useState<Coach[]>([]);
  
  const [isAddCoachOpen, setIsAddCoachOpen] = useState(false);
  const [newCoachData, setNewCoachData] = useState<Partial<Coach>>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchData(currentClubId);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
      const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
      const coachesSnapshot = await getDocs(coachesQuery);
      const coachesList = coachesSnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data,
              avatar: `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
          } as Coach
      });
      setCoaches(coachesList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewCoachData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleAddCoach = async () => {
    if (!newCoachData.name || !newCoachData.lastName || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre y apellidos son obligatorios." });
        return;
    }

    try {
        await addDoc(collection(db, "clubs", clubId, "coaches"), newCoachData);

        toast({ title: "Entrenador añadido", description: `${newCoachData.name} ha sido añadido al club.` });
        setIsAddCoachOpen(false);
        setNewCoachData({});
        fetchData(clubId); // Refresh data
    } catch (error) {
        console.error("Error adding coach: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo añadir al entrenador." });
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entrenadores</CardTitle>
              <CardDescription>
                Gestiona los entrenadores de tu club.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isAddCoachOpen} onOpenChange={setIsAddCoachOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Añadir Entrenador
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Nuevo Entrenador</DialogTitle>
                        <DialogDescription>
                            Rellena la información para añadir un nuevo entrenador al club.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nombre</Label>
                            <Input id="name" value={newCoachData.name || ''} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lastName" className="text-right">Apellidos</Label>
                            <Input id="lastName" value={newCoachData.lastName || ''} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input id="email" type="email" value={newCoachData.email || ''} onChange={handleInputChange} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">Teléfono</Label>
                            <Input id="phone" type="tel" value={newCoachData.phone || ''} onChange={handleInputChange} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleAddCoach}>Añadir Entrenador</Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map(coach => (
                <TableRow key={coach.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={coach.avatar} alt={coach.name} data-ai-hint="foto persona" />
                        <AvatarFallback>{coach.name?.charAt(0)}{coach.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{coach.name} {coach.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{coach.email || 'N/A'}</TableCell>
                  <TableCell>{coach.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                           <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Asignar Equipo</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{coaches.length}</strong> de <strong>{coaches.length}</strong> entrenadores
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
