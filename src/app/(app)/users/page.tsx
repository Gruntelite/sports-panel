
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
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, query, where } from "firebase/firestore";

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
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
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
            fetchUsers(currentClubId);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUsers = async (clubId: string) => {
    setLoading(true);
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
    setLoading(false);
  };
  
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserRole || !clubId) {
        toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
        return;
    }
    
    // Note: This is a simplified invitation. In a real app, you would
    // send an email invitation and the new user would complete their registration.
    // For now, we'll just create a placeholder document.
    try {
        await addDoc(collection(db, "users"), {
            email: newUserEmail,
            role: newUserRole,
            clubId: clubId,
            name: "Usuario Invitado" // Placeholder name
        });

        toast({ title: "Usuario invitado", description: `Se ha invitado a ${newUserEmail} como ${newUserRole}.` });
        setIsAddUserOpen(false);
        setNewUserEmail("");
        setNewUserRole("Family");
        fetchUsers(clubId); // Refresh data
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
                            Introduce el email y el rol para invitar a un nuevo usuario.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="user-email" className="text-right">Email</Label>
                            <Input id="user-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="user-role" className="text-right">Rol</Label>
                            <Select onValueChange={setNewUserRole} value={newUserRole}>
                                <SelectTrigger className="col-span-3">
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
                      <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
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
