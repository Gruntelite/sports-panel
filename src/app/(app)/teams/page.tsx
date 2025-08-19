
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Users, Shield, MoreVertical, Loader2, Trash2, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, query, deleteDoc, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';

export default function TeamsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMinAge, setNewTeamMinAge] = useState("");
  const [newTeamMaxAge, setNewTeamMaxAge] = useState("");
  const [newTeamImage, setNewTeamImage] = useState<File | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [sortOrder, setSortOrder] = useState("alphabetical");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchTeams(currentClubId);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchTeams = async (clubId: string) => {
    setLoading(true);
    const playersQuery = query(collection(db, "clubs", clubId, "players"));
    const playersSnapshot = await getDocs(playersQuery);
    const playersCountByTeam = playersSnapshot.docs.reduce((acc, doc) => {
        const teamId = doc.data().teamId;
        if (teamId) {
            acc[teamId] = (acc[teamId] || 0) + 1;
        }
        return acc;
    }, {} as {[key: string]: number});
    
    const teamsQuery = query(collection(db, "clubs", clubId, "teams"));
    const teamsSnapshot = await getDocs(teamsQuery);
    const teamsList = teamsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        minAge: data.minAge,
        maxAge: data.maxAge,
        image: data.image || "https://placehold.co/600x400.png",
        hint: "equipo deportivo",
        players: playersCountByTeam[doc.id] || 0,
        coaches: 0, // Placeholder
      };
    });
    setTeams(teamsList);
    setLoading(false);
  };
  
  const handleAddTeam = async () => {
    if (!newTeamName || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "El nombre del equipo es obligatorio." });
        return;
    }
    
    setLoading(true);
    
    try {
        let imageUrl = "https://placehold.co/600x400.png";
        
        if (newTeamImage) {
            const imageRef = ref(storage, `team-images/${clubId}/${uuidv4()}`);
            await uploadBytes(imageRef, newTeamImage);
            imageUrl = await getDownloadURL(imageRef);
        }

        await addDoc(collection(db, "clubs", clubId, "teams"), {
            name: newTeamName,
            minAge: newTeamMinAge ? Number(newTeamMinAge) : null,
            maxAge: newTeamMaxAge ? Number(newTeamMaxAge) : null,
            image: imageUrl,
        });

        toast({ title: "Equipo creado", description: `El equipo ${newTeamName} ha sido creado.` });
        setIsAddTeamOpen(false);
        setNewTeamName("");
        setNewTeamMinAge("");
        setNewTeamMaxAge("");
        setNewTeamImage(null);
        if (clubId) fetchTeams(clubId); // Refresh data
    } catch (error) {
        console.error("Error creating team: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear el equipo." });
    } finally {
        setLoading(false);
    }
  };
  
  const handleDeleteTeam = async () => {
    if (!teamToDelete || !clubId) return;

    setIsDeleting(true);
    try {
      // Delete image from storage if it's not the placeholder
      if (teamToDelete.image && !teamToDelete.image.includes('placehold.co')) {
        const imageRef = ref(storage, teamToDelete.image);
        await deleteObject(imageRef);
      }
      
      // Delete team document from firestore
      await deleteDoc(doc(db, "clubs", clubId, "teams", teamToDelete.id));

      toast({ title: "Equipo eliminado", description: `El equipo ${teamToDelete.name} ha sido eliminado.` });
      fetchTeams(clubId);
    } catch (error) {
        console.error("Error deleting team: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el equipo." });
    } finally {
        setIsDeleting(false);
        setTeamToDelete(null);
    }
  };
  
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (sortOrder === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === "age-asc") {
        const aAge = a.minAge ?? a.maxAge ?? 99;
        const bAge = b.minAge ?? b.maxAge ?? 99;
        return aAge - bAge;
      }
      if (sortOrder === "age-desc") {
        const aAge = a.maxAge ?? a.minAge ?? 0;
        const bAge = b.maxAge ?? b.minAge ?? 0;
        return bAge - aAge;
      }
      return 0;
    });
  }, [teams, sortOrder]);


  if (loading && !teams.length) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Equipos</h1>
            <p className="text-muted-foreground">
              Crea y gestiona los equipos de tu club.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Ordenar por
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar equipos por</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOrder} onValueChange={setSortOrder}>
                    <DropdownMenuRadioItem value="alphabetical">Alfabéticamente (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="age-asc">Edad (Menor a Mayor)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="age-desc">Edad (Mayor a Menor)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Crear Equipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Crear Nuevo Equipo</DialogTitle>
                      <DialogDescription>
                          Rellena los detalles para crear un nuevo equipo en tu club.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="team-name" className="text-right">Nombre</Label>
                          <Input id="team-name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="team-min-age" className="text-right">Edad Mínima</Label>
                          <Input id="team-min-age" type="number" value={newTeamMinAge} onChange={(e) => setNewTeamMinAge(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="team-max-age" className="text-right">Edad Máxima</Label>
                          <Input id="team-max-age" type="number" value={newTeamMaxAge} onChange={(e) => setNewTeamMaxAge(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="team-image" className="text-right">Imagen</Label>
                          <Input id="team-image" type="file" accept="image/*" onChange={(e) => setNewTeamImage(e.target.files ? e.target.files[0] : null)} className="col-span-3" />
                      </div>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">Cancelar</Button>
                      </DialogClose>
                      <Button type="button" onClick={handleAddTeam} disabled={loading}>
                          {loading ? <Loader2 className="animate-spin" /> : 'Crear Equipo'}
                      </Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedTeams.map(team => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <Link href={`/teams/${team.id}`}>
                  <Image
                      alt={team.name}
                      className="aspect-video w-full rounded-t-lg object-cover"
                      height="400"
                      src={team.image}
                      width="600"
                      data-ai-hint={team.hint}
                  />
                </Link>
              </CardHeader>
              <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                      <div>
                          <Badge variant="secondary" className="mb-2">Edades: {team.minAge || "N/A"} - {team.maxAge || "N/A"}</Badge>
                          <Link href={`/teams/${team.id}`}>
                            <CardTitle className="text-xl font-bold hover:underline">{team.name}</CardTitle>
                          </Link>
                      </div>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                          <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                          >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Alternar menú</span>
                          </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/teams/${team.id}`} className="w-full">Editar</Link></DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setTeamToDelete(team)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
              </CardContent>
              <CardFooter className="bg-muted/40 p-4 flex justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{team.players} Jugadores</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span>{team.coaches} Entrenadores</span>
                  </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el equipo
              y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
    
