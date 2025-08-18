
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, TeamMember } from "@/lib/types";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function EditTeamPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [team, setTeam] = useState<Partial<Team>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchClubId = async () => {
        if (auth.currentUser) {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const currentClubId = userDocSnap.data().clubId;
                setClubId(currentClubId);
            }
        }
    };
    
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchClubId();
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);


  useEffect(() => {
    if (!clubId || !teamId) return;

    const fetchTeamData = async () => {
      setLoading(true);
      try {
        // Fetch team details
        const teamDocRef = doc(db, "clubs", clubId, "teams", teamId);
        const teamDocSnap = await getDoc(teamDocRef);

        if (teamDocSnap.exists()) {
          const teamData = teamDocSnap.data() as Team;
          setTeam({ ...teamData, id: teamDocSnap.id });
        } else {
          toast({ variant: "destructive", title: "Error", description: "No se encontró el equipo." });
          router.push("/teams");
        }
        
        // Fetch team members
        const playersQuery = query(collection(db, "clubs", clubId, "players"), where("teamId", "==", teamId));
        const playersSnapshot = await getDocs(playersQuery);
        const membersList = playersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: `${data.name} ${data.lastName}`,
                avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
                position: data.position || 'N/A',
                jerseyNumber: data.jerseyNumber || 'N/A',
            } as TeamMember;
        });
        setTeamMembers(membersList);

      } catch (error) {
        console.error("Error fetching team data: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del equipo." });
      }
      setLoading(false);
    };

    fetchTeamData();
  }, [clubId, teamId, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setTeam(prev => ({ ...prev, [id]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    if (!clubId || !teamId) return;

    setSaving(true);
    try {
      let imageUrl = team.image;

      if (newImage) {
        // Delete old image if it's not a placeholder
        if (team.image && !team.image.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, team.image);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                // Ignore if file doesn't exist, etc.
                console.warn("Could not delete old image:", storageError);
            }
        }
        // Upload new image
        const imageRef = ref(storage, `team-images/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const teamDocRef = doc(db, "clubs", clubId, "teams", teamId);
      await updateDoc(teamDocRef, {
        name: team.name,
        minAge: Number(team.minAge),
        maxAge: Number(team.maxAge),
        image: imageUrl,
      });

      toast({ title: "Éxito", description: "Los cambios en el equipo se han guardado." });
      setNewImage(null);
      setImagePreview(null);
      if(imageUrl) setTeam(prev => ({...prev, image: imageUrl}));
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Editar Equipo: {team.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Imagen del Equipo</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Image
                            alt={team.name || 'Team Image'}
                            className="aspect-video w-full rounded-lg object-cover"
                            height="200"
                            src={imagePreview || team.image || "https://placehold.co/600x400.png"}
                            width="300"
                        />
                         <Button asChild variant="outline" className="w-full">
                            <label htmlFor="team-image">
                                <Upload className="mr-2 h-4 w-4"/>
                                Cambiar Imagen
                            </label>
                        </Button>
                        <Input id="team-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Equipo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Equipo</Label>
                            <Input id="name" value={team.name || ''} onChange={handleInputChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minAge">Edad Mínima</Label>
                                <Input id="minAge" type="number" value={team.minAge || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxAge">Edad Máxima</Label>
                                <Input id="maxAge" type="number" value={team.maxAge || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                         <Button onClick={handleSaveChanges} disabled={saving} className="w-full">
                            {saving ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Plantilla del Equipo</CardTitle>
                        <CardDescription>Jugadores actualmente en {team.name}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Jugador</TableHead>
                                    <TableHead>Posición</TableHead>
                                    <TableHead>Dorsal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamMembers.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
                                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{member.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{member.position}</TableCell>
                                        <TableCell>{member.jerseyNumber}</TableCell>
                                    </TableRow>
                                ))}
                                {teamMembers.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                            No hay jugadores en este equipo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}

    