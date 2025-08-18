
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  File,
  PlusCircle,
  Filter,
  MoreHorizontal,
  Loader2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { Team, Player } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';


export default function PlayersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [playerData, setPlayerData] = useState<Partial<Player>>({});
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      // Fetch Teams
      const teamsQuery = query(collection(db, "clubs", clubId, "teams"));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsList);
      
      // Fetch Players
      const playersQuery = query(collection(db, "clubs", clubId, "players"));
      const playersSnapshot = await getDocs(playersQuery);
      const playersList = playersSnapshot.docs.map(doc => {
          const data = doc.data();
          const team = teamsList.find(t => t.id === data.teamId);
          return { 
              id: doc.id, 
              ...data,
              avatar: data.avatar || `https://placehold.co/40x40.png?text=${(data.name || '').charAt(0)}`,
              teamName: team ? team.name : "Sin equipo",
          } as Player
      });
      setPlayers(playersList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPlayerData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSelectChange = (id: keyof Player, value: string) => {
    setPlayerData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleOpenModal = (mode: 'add' | 'edit', player?: Player) => {
    setModalMode(mode);
    setPlayerData(mode === 'edit' && player ? player : {});
    setIsModalOpen(true);
    setNewImage(null);
    setImagePreview(null);
  }

  const handleSavePlayer = async () => {
    if (!playerData.name || !playerData.lastName || !playerData.teamId || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Nombre, apellidos y equipo son obligatorios." });
        return;
    }

    setLoading(true);
    try {
      let imageUrl = playerData.avatar;

      if (newImage) {
        if (playerData.avatar && !playerData.avatar.includes('placehold.co')) {
            try {
                const oldImageRef = ref(storage, playerData.avatar);
                await deleteObject(oldImageRef);
            } catch (storageError) {
                console.warn("Could not delete old image:", storageError);
            }
        }
        const imageRef = ref(storage, `player-avatars/${clubId}/${uuidv4()}`);
        await uploadBytes(imageRef, newImage);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const dataToSave = {
        ...playerData,
        avatar: imageUrl || playerData.avatar || `https://placehold.co/40x40.png?text=${(playerData.name || '').charAt(0)}`,
      };


      if (modalMode === 'edit' && playerData.id) {
        const playerRef = doc(db, "clubs", clubId, "players", playerData.id);
        await updateDoc(playerRef, dataToSave);
        toast({ title: "Jugador actualizado", description: `${playerData.name} ha sido actualizado.` });
      } else {
        await addDoc(collection(db, "clubs", clubId, "players"), dataToSave);
        toast({ title: "Jugador añadido", description: `${playerData.name} ha sido añadido al club.` });
      }
      
      setIsModalOpen(false);
      setPlayerData({});
      fetchData(clubId); // Refresh data
    } catch (error) {
        console.error("Error saving player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el jugador." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete || !clubId) return;

    setIsDeleting(true);
    try {
        if (playerToDelete.avatar && !playerToDelete.avatar.includes('placehold.co')) {
            const imageRef = ref(storage, playerToDelete.avatar);
            await deleteObject(imageRef);
        }
        await deleteDoc(doc(db, "clubs", clubId, "players", playerToDelete.id));
        toast({ title: "Jugador eliminado", description: `${playerToDelete.name} ${playerToDelete.lastName} ha sido eliminado.`});
        fetchData(clubId);
    } catch (error) {
        console.error("Error deleting player: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el jugador." });
    } finally {
        setIsDeleting(false);
        setPlayerToDelete(null);
    }
  };


  if (loading && !players.length) {
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
              <CardTitle>Jugadores</CardTitle>
              <CardDescription>
                Gestiona los jugadores de tu club y su información.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Filtrar
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>
                    Activo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Archivado</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Exportar
                </span>
              </Button>
              <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenModal('add')}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Añadir Jugador
                  </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Dorsal</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(player => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="foto persona" />
                        <AvatarFallback>{player.name?.charAt(0)}{player.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{player.name} {player.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.teamName}</Badge>
                  </TableCell>
                  <TableCell>{player.jerseyNumber || 'N/A'}</TableCell>
                  <TableCell>{player.tutorEmail || 'N/A'}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenModal('edit', player)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setPlayerToDelete(player)}>
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
            Mostrando <strong>{players.length}</strong> de <strong>{players.length}</strong> jugadores
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{modalMode === 'add' ? 'Añadir Nuevo Jugador' : 'Editar Jugador'}</DialogTitle>
                <DialogDescription>
                    {modalMode === 'add' ? 'Rellena la información para añadir un nuevo jugador al club.' : 'Modifica la información del jugador.'}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-8">
                <div className="space-y-4 flex flex-col items-center">
                    <Label>Foto del Jugador</Label>
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={imagePreview || playerData.avatar} />
                        <AvatarFallback>
                            {(playerData.name || 'N').charAt(0)}
                            {(playerData.lastName || 'J').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     <Button asChild variant="outline" size="sm">
                        <label htmlFor="player-image">
                            <Upload className="mr-2 h-3 w-3"/>
                            Subir
                        </label>
                    </Button>
                    <Input id="player-image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-base border-b pb-2 mb-4">Datos Personales</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" value={playerData.name || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Apellidos</Label>
                                <Input id="lastName" value={playerData.lastName || ''} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="age">Edad</Label>
                                <Input id="age" type="number" value={playerData.age || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dni">DNI</Label>
                                <Input id="dni" value={playerData.dni || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input id="address" value={playerData.address || ''} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input id="city" value={playerData.city || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postalCode">Código Postal</Label>
                                <Input id="postalCode" value={playerData.postalCode || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>

                    <div>
                       <h4 className="font-semibold text-base border-b pb-2 mb-4">Datos de Contacto (Tutor/a)</h4>
                       <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tutorEmail">Email del Tutor/a</Label>
                                <Input id="tutorEmail" type="email" value={playerData.tutorEmail || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tutorPhone">Teléfono del Tutor/a</Label>
                                <Input id="tutorPhone" type="tel" value={playerData.tutorPhone || ''} onChange={handleInputChange} />
                            </div>
                       </div>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold text-base border-b pb-2 mb-4">Datos Deportivos y Bancarios</h4>
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-2">
                                <Label htmlFor="teamId">Equipo</Label>
                                <Select onValueChange={(value) => handleSelectChange('teamId', value)} value={playerData.teamId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un equipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map(team => (
                                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jerseyNumber">Dorsal</Label>
                                <Input id="jerseyNumber" type="number" value={playerData.jerseyNumber || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="iban">IBAN Cuenta Bancaria</Label>
                                <Input id="iban" value={playerData.iban || ''} onChange={handleInputChange} />
                            </div>
                       </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleSavePlayer} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al jugador {playerToDelete?.name} {playerToDelete?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlayer} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    

    