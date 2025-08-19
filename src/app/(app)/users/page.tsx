
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
import { MoreHorizontal, PlusCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, query, where } from "firebase/firestore";
import type { Player, Coach, Contact } from "@/lib/types";
import { cn } from "@/lib/utils";

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const [selectedContactEmail, setSelectedContactEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Family");

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
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (clubId: string) => {
    setLoading(true);
    try {
        // Fetch Users
        const usersQuery = query(collection(db, "users"), where("clubId", "==", clubId));
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Usuario sin nombre",
            email: data.email,
            role: data.role,
            avatar: `https://placehold.co/40x40.png?text=${(data.name || "U").charAt(0)}`,
          };
        });
        setUsers(usersList);
        const existingUserEmails = new Set(usersList.map(u => u.email));

        // Fetch Players and Coaches to get available contacts
        const playersQuery = query(collection(db, "clubs", clubId, "players"));
        const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
        
        const [playersSnapshot, coachesSnapshot] = await Promise.all([getDocs(playersQuery), getDocs(coachesQuery)]);
        
        const allContacts: Contact[] = [];

        playersSnapshot.forEach(doc => {
            const data = doc.data() as Player;
            const contactEmail = data.isOwnTutor ? data.tutorEmail : data.tutorEmail;
            if (contactEmail && !existingUserEmails.has(contactEmail)) {
                allContacts.push({ name: `${data.name} ${data.lastName} (Familia)`, email: contactEmail });
            }
        });

        coachesSnapshot.forEach(doc => {
            const data = doc.data() as Coach;
            if (data.email && !existingUserEmails.has(data.email)) {
                allContacts.push({ name: `${data.name} ${data.lastName} (Entrenador)`, email: data.email });
            }
        });
        
        // Remove duplicate emails, just in case
        const uniqueContacts = Array.from(new Map(allContacts.map(item => [item['email'], item])).values());
        setAvailableContacts(uniqueContacts);

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };
  
  const handleAddUser = async () => {
    if (!selectedContactEmail || !newUserRole || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un contacto y un rol." });
        return;
    }
    
    const selectedContact = availableContacts.find(c => c.email === selectedContactEmail);
    if (!selectedContact) {
        toast({ variant: "destructive", title: "Error", description: "El contacto seleccionado no es válido." });
        return;
    }
    
    try {
        await addDoc(collection(db, "users"), {
            email: selectedContact.email,
            name: selectedContact.name.split('(')[0].trim(), // Get name without the role hint
            role: newUserRole,
            clubId: clubId,
        });

        toast({ title: "Usuario invitado", description: `Se ha invitado a ${selectedContact.email} como ${newUserRole}.` });
        setIsAddUserOpen(false);
        setSelectedContactEmail("");
        setNewUserRole("Family");
        if(clubId) fetchData(clubId); // Refresh data
    } catch (error) {
        console.error("Error adding user: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo invitar al usuario." });
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
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Gestiona todos los usuarios y sus roles en el sistema.
              </CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Añadir Usuario
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                            Selecciona un contacto y asigna un rol para crear un nuevo usuario.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Contacto</Label>
                            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isComboboxOpen}
                                    className="w-full justify-between font-normal"
                                    >
                                    {selectedContactEmail
                                        ? availableContacts.find((c) => c.email === selectedContactEmail)?.name
                                        : "Selecciona un contacto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar contacto..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontraron contactos disponibles.</CommandEmpty>
                                            <CommandGroup>
                                                {availableContacts.map((contact) => (
                                                <CommandItem
                                                    key={contact.email}
                                                    value={contact.email}
                                                    onSelect={(currentValue) => {
                                                        setSelectedContactEmail(currentValue === selectedContactEmail ? "" : currentValue);
                                                        setIsComboboxOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedContactEmail === contact.email ? "opacity-100" : "opacity-0"
                                                    )}
                                                    />
                                                    <div>
                                                        <p className="font-medium">{contact.name.split('(')[0].trim()}</p>
                                                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                                                    </div>
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user-role">Rol</Label>
                            <Select onValueChange={setNewUserRole} value={newUserRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Coach">Entrenador</SelectItem>
                                    <SelectItem value="Family">Familia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleAddUser}>Añadir Usuario</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="retrato persona" />
                        <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                      <Badge variant={user.role === 'Admin' ? 'default' : user.role === 'Coach' ? 'secondary' : 'outline'}>
                          {user.role}
                      </Badge>
                  </TableCell>
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
                        <DropdownMenuItem>Cambiar Rol</DropdownMenuItem>
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
      </Card>
    </>
  );
}
