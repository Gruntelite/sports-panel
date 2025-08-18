
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { PlusCircle, Users, Shield, MoreVertical, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, query } from "firebase/firestore";
import type { Team } from "@/lib/types";

export default function TeamsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSport, setNewTeamSport] = useState("");
  const [newTeamCategory, setNewTeamCategory] = useState("");

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
    const teamsQuery = query(collection(db, "clubs", clubId, "teams"));
    const teamsSnapshot = await getDocs(teamsQuery);
    const teamsList = teamsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        sport: data.sport,
        category: data.category,
        image: "https://placehold.co/600x400.png", // Placeholder
        hint: "equipo deportivo",
        players: 0, // Placeholder
        coaches: 0, // Placeholder
      };
    });
    setTeams(teamsList);
    setLoading(false);
  };
  
  const handleAddTeam = async () => {
    if (!newTeamName || !newTeamSport || !newTeamCategory || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
        return;
    }
    
    try {
        await addDoc(collection(db, "clubs", clubId, "teams"), {
            name: newTeamName,
            sport: newTeamSport,
            category: newTeamCategory,
        });

        toast({ title: "Equipo creado", description: `El equipo ${newTeamName} ha sido creado.` });
        setIsAddTeamOpen(false);
        setNewTeamName("");
        setNewTeamSport("");
        setNewTeamCategory("");
        fetchTeams(clubId); // Refresh data
    } catch (error) {
        console.error("Error creating team: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear el equipo." });
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
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Equipos</h1>
            <p className="text-muted-foreground">
              Crea y gestiona los equipos de tu club.
            </p>
          </div>
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
                        <Label htmlFor="team-sport" className="text-right">Deporte</Label>
                        <Input id="team-sport" value={newTeamSport} onChange={(e) => setNewTeamSport(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="team-category" className="text-right">Categoría</Label>
                        <Input id="team-category" value={newTeamCategory} onChange={(e) => setNewTeamCategory(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleAddTeam}>Crear Equipo</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="p-0">
                  <Image
                      alt={team.name}
                      className="aspect-video w-full rounded-t-lg object-cover"
                      height="400"
                      src={team.image}
                      width="600"
                      data-ai-hint={team.hint}
                  />
              </CardHeader>
              <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                      <div>
                          <Badge variant="secondary" className="mb-2">{team.category}</Badge>
                          <CardTitle className="text-xl font-bold">{team.name}</CardTitle>
                          <CardDescription>{team.sport}</CardDescription>
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
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Gestionar Plantilla</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
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
    </>
  )
}
