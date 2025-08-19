

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
import { MoreHorizontal, PlusCircle, Loader2, Check, ChevronsUpDown, Trash2, Copy, KeyRound } from "lucide-react";
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
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, doc, getDoc, addDoc, query, where, updateDoc, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import type { Player, Coach, Staff, Contact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  // State for adding new staff
  const [staffName, setStaffName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState("");

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [editedUserName, setEditedUserName] = useState("");
  const [selectedNewRole, setSelectedNewRole] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);


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
        const usersQuery = query(collection(db, "users"), where("clubId", "==", clubId));
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          const name = data.name || "Usuario sin nombre";
          return {
            id: doc.id,
            name: name,
            email: data.email,
            role: data.role,
            avatar: `https://placehold.co/40x40.png?text=${(name).charAt(0)}`,
          };
        });
        setUsers(usersList);

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };
  
  const generatePassword = () => {
    const newPassword = Math.random().toString(36).slice(-8);
    setGeneratedPassword(newPassword);
  }

  const resetAddUserForm = () => {
    setIsAddUserOpen(false);
    setStaffName('');
    setStaffLastName('');
    setStaffRole('');
    setStaffEmail('');
    setGeneratedPassword("");
  };
  
  const handleAddUser = async () => {
    if (!clubId || !generatedPassword || !staffEmail || !staffName || !staffRole) {
        toast({ variant: "destructive", title: "Error", description: "Todos los campos para el nuevo miembro son obligatorios." });
        return;
    }
    
    setSaving(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, staffEmail, generatedPassword);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: staffEmail,
            name: `${staffName} ${staffLastName}`,
            role: 'Staff',
            clubId: clubId,
        });

        await addDoc(collection(db, "clubs", clubId, "staff"), {
            name: staffName,
            lastName: staffLastName,
            email: staffEmail,
            role: staffRole
        });

        toast({ title: "Usuario de Staff Creado", 
            description: (
            <div>
              <p>Cuenta para {staffEmail} creada.</p>
              <p className="font-mono text-sm bg-muted p-1 rounded mt-2">Contraseña: {generatedPassword}</p>
            </div>
            ),
            duration: 9000 
        });
        
        resetAddUserForm();
        if(clubId) fetchData(clubId);

    } catch (error: any) {
        console.error("Error adding user: ", error);
        let description = "No se pudo crear la cuenta de usuario.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este email ya está registrado. Si el usuario no aparece en la lista, puede que esté registrado en otro club.";
        }
        toast({ variant: "destructive", title: "Error", description });
    } finally {
      setSaving(false);
    }
  };


  const handleOpenEditModal = (user: User) => {
    setUserToEdit(user);
    setEditedUserName(user.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!userToEdit || !editedUserName.trim()) return;
    
    setSaving(true);
    try {
        const userRef = doc(db, "users", userToEdit.id);
        await updateDoc(userRef, { name: editedUserName });
        toast({ title: "Usuario actualizado", description: "El nombre del usuario se ha actualizado correctamente." });
        setIsEditModalOpen(false);
        setUserToEdit(null);
        if(clubId) fetchData(clubId);
    } catch (error) {
        console.error("Error updating user:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el usuario." });
    } finally {
        setSaving(false);
    }
  };
  
  const handleOpenRoleModal = (user: User) => {
    setUserToChangeRole(user);
    setSelectedNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!userToChangeRole || !selectedNewRole) return;
    
    setSaving(true);
    try {
        const userRef = doc(db, "users", userToChangeRole.id);
        await updateDoc(userRef, { role: selectedNewRole });
        toast({ title: "Rol actualizado", description: "El rol del usuario se ha actualizado correctamente." });
        setIsRoleModalOpen(false);
        setUserToChangeRole(null);
        if(clubId) fetchData(clubId);
    } catch (error) {
        console.error("Error updating role:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el rol." });
    } finally {
        setSaving(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    setSaving(true);
    try {
        await sendPasswordResetEmail(auth, email);
        toast({
            title: "Correo enviado",
            description: `Se ha enviado un enlace para restablecer la contraseña a ${email}.`
        });
    } catch (error) {
        console.error("Error sending password reset email:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo enviar el correo de restablecimiento."
        });
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
      if (!userToDelete) return;
      setSaving(true);
      try {
          await deleteDoc(doc(db, "users", userToDelete.id));
          toast({ title: "Usuario eliminado", description: `El usuario ${userToDelete.name} ha sido eliminado de la base de datos. Para eliminarlo completamente, debes hacerlo desde la consola de Firebase Authentication.` });
          setUserToDelete(null);
          if (clubId) fetchData(clubId);
      } catch (error) {
          console.error("Error deleting user: ", error);
          toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
      } finally {
          setSaving(false);
      }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Contraseña copiada al portapapeles." });
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
            <Dialog open={isAddUserOpen} onOpenChange={(isOpen) => {
              setIsAddUserOpen(isOpen);
              if (!isOpen) resetAddUserForm();
            }}>
                <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Añadir Staff
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Añadir Nuevo Miembro de Staff</DialogTitle>
                        <DialogDescription>
                          Crea una cuenta de acceso para un nuevo miembro del personal (directiva, coordinador, etc.).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="staff-name">Nombre</Label>
                                <Input id="staff-name" value={staffName} onChange={e => setStaffName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staff-lastName">Apellidos</Label>
                                <Input id="staff-lastName" value={staffLastName} onChange={e => setStaffLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-role-title">Cargo</Label>
                            <Input id="staff-role-title" placeholder="p.ej., Coordinador" value={staffRole} onChange={e => setStaffRole(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-email">Email</Label>
                            <Input id="staff-email" type="email" value={staffEmail} onChange={e => { setStaffEmail(e.target.value); if(e.target.value) generatePassword(); else setGeneratedPassword(''); }} />
                        </div>
                    </div>
                    
                    {staffEmail && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label>Contraseña Temporal</Label>
                                <div className="flex items-center gap-2">
                                    <Input value={generatedPassword} readOnly />
                                    <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(generatedPassword)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Copia esta contraseña y compártela de forma segura con el usuario.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleAddUser} disabled={saving || !staffEmail}>
                            {saving ? <Loader2 className="animate-spin" /> : 'Crear Usuario'}
                        </Button>
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
                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                      <Badge variant={user.role === 'Admin' ? 'default' : user.role === 'Coach' ? 'secondary' : user.role === 'Staff' ? 'destructive' : 'outline'}>
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
                        <DropdownMenuItem onSelect={() => handleOpenEditModal(user)}>Editar Usuario</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenRoleModal(user)}>Cambiar Rol</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleSendPasswordReset(user.email)} disabled={saving}>
                           <KeyRound className="mr-2 h-4 w-4" />
                           Restablecer Contraseña
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setUserToDelete(user)}>
                          <Trash2 className="mr-2 h-4 w-4" />
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
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Actualiza el nombre del usuario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Nombre</Label>
              <Input id="edit-user-name" value={editedUserName} onChange={(e) => setEditedUserName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userToEdit?.email || ''} disabled />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateUser} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>Selecciona el nuevo rol para {userToChangeRole?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="new-user-role">Nuevo Rol</Label>
                <Select onValueChange={setSelectedNewRole} defaultValue={selectedNewRole}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Coach">Entrenador</SelectItem>
                        <SelectItem value="Family">Familia</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateRole} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Actualizar Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la entrada del usuario {userToDelete?.name} de la base de datos de la aplicación. Para eliminar la cuenta de autenticación, deberás hacerlo desde la consola de Firebase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
