

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
import { MoreHorizontal, PlusCircle, Loader2, KeyRound, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, doc, getDoc, addDoc, query, updateDoc, deleteDoc, setDoc, where, writeBatch } from "firebase/firestore";
import type { User, Player, Coach } from "@/lib/types";


export default function UsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  const [addMode, setAddMode] = useState<'contact' | 'staff'>('contact');
  const [availableContacts, setAvailableContacts] = useState<(Player | Coach)[]>([]);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedContactEmail, setSelectedContactEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Family');

  const [staffName, setStaffName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffRoleTitle, setStaffRoleTitle] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('Staff');

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [editedUserName, setEditedUserName] = useState("");
  const [editedUserEmail, setEditedUserEmail] = useState("");
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
        const usersQuery = query(collection(db, "clubs", clubId, "users"));
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
          } as User;
        });
        setUsers(usersList);

        const existingUserEmails = new Set(usersList.map(u => u.email));

        const playersQuery = query(collection(db, "clubs", clubId, "players"));
        const playersSnap = await getDocs(playersQuery);
        const availablePlayers = playersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Player))
            .filter(p => p.tutorEmail && !existingUserEmails.has(p.tutorEmail));
        
        const coachesQuery = query(collection(db, "clubs", clubId, "coaches"));
        const coachesSnap = await getDocs(coachesQuery);
        const availableCoaches = coachesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Coach))
            .filter(c => c.email && !existingUserEmails.has(c.email));

        setAvailableContacts([...availablePlayers, ...availableCoaches]);

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de usuarios." });
    }
    setLoading(false);
  };
  
  const resetAddUserForm = () => {
    setIsAddUserOpen(false);
    setAddMode('contact');
    setSelectedContact('');
    setSelectedContactEmail('');
    setSelectedRole('Family');
    setStaffName('');
    setStaffLastName('');
    setStaffRoleTitle('');
    setStaffEmail('');
    setStaffRole('Staff');
  };
  
  const handleAddUser = async (type: 'contact' | 'staff') => {
    if (!clubId) return;

    setSaving(true);
    try {
        const batch = writeBatch(db);

        if (type === 'contact') {
            if (!selectedContactEmail) {
                toast({ variant: "destructive", title: "Error", description: "Selecciona un contacto." });
                setSaving(false);
                return;
            }
            const contact = availableContacts.find(c => (c as Player).tutorEmail === selectedContactEmail || (c as Coach).email === selectedContactEmail);
            if (!contact) {
                setSaving(false);
                return;
            }

            const name = 'lastName' in contact ? `${contact.name} ${contact.lastName}` : contact.name;
            
            const newUserDocRef = doc(collection(db, "clubs", clubId, "users"));
            batch.set(newUserDocRef, {
                email: selectedContactEmail,
                name: name,
                role: selectedRole,
                playerId: (contact as Player).dni ? contact.id : null,
                coachId: (contact as Coach).monthlyPayment !== undefined ? contact.id : null,
            });
            toast({ title: "Usuario Creado", description: `Se ha creado un registro para ${name}.` });
        } else { // staff
            if (!staffEmail || !staffName || !staffRoleTitle || !staffRole) {
                toast({ variant: "destructive", title: "Error", description: "Todos los campos para el nuevo miembro son obligatorios." });
                setSaving(false);
                return;
            }
            const staffDocRef = doc(collection(db, "clubs", clubId, "staff"));
            batch.set(staffDocRef, {
                name: staffName,
                lastName: staffLastName,
                email: staffEmail,
                role: staffRoleTitle,
            });
            
            const newUserDocRef = doc(collection(db, "clubs", clubId, "users"));
            batch.set(newUserDocRef, {
                email: staffEmail,
                name: `${staffName} ${staffLastName}`,
                role: staffRole,
                staffId: staffDocRef.id,
            });
            toast({ title: "Usuario Creado", description: `Se ha creado un registro para ${staffName} ${staffLastName}.` });
        }
        
        await batch.commit();
        resetAddUserForm();
        if(clubId) fetchData(clubId);

    } catch (error: any) {
        console.error("Error adding user: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear el usuario." });
    } finally {
      setSaving(false);
    }
  };


  const handleOpenEditModal = (user: User) => {
    setUserToEdit(user);
    setEditedUserName(user.name);
    setEditedUserEmail(user.email);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!userToEdit || !editedUserName.trim() || !editedUserEmail.trim() || !clubId) return;
    
    setSaving(true);
    try {
        const userRef = doc(db, "clubs", clubId, "users", userToEdit.id);
        await updateDoc(userRef, { 
            name: editedUserName,
            email: editedUserEmail 
        });
        toast({ title: "Usuario actualizado", description: "Los datos del usuario se han actualizado correctamente." });
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
    if (user.role === 'super-admin') {
      toast({
        variant: "destructive",
        title: "Acción no permitida",
        description: "No puedes cambiar el rol del Super-Admin directamente. Asigna a otro usuario como Super-Admin para transferir el rol.",
      });
      return;
    }
    setUserToChangeRole(user);
    setSelectedNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!userToChangeRole || !selectedNewRole || !clubId) return;
    
    setSaving(true);
    const batch = writeBatch(db);

    try {
        // If making a user super-admin, demote the existing one
        if (selectedNewRole === 'super-admin') {
            const superAdminQuery = query(collection(db, "clubs", clubId, "users"), where("role", "==", "super-admin"));
            const superAdminSnapshot = await getDocs(superAdminQuery);
            superAdminSnapshot.forEach(doc => {
                batch.update(doc.ref, { role: "Admin" });
            });
        }

        const userRef = doc(db, "clubs", clubId, "users", userToChangeRole.id);
        batch.update(userRef, { role: selectedNewRole });

        await batch.commit();

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
            description: "No se pudo enviar el correo de restablecimiento. Asegúrate de que el usuario tenga una cuenta de acceso creada."
        });
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
      if (!userToDelete || !clubId) return;

      if (userToDelete.role === 'super-admin') {
          toast({ variant: "destructive", title: "Acción no permitida", description: "No se puede eliminar al Super-Admin." });
          setUserToDelete(null);
          return;
      }
      setSaving(true);
      try {
          await deleteDoc(doc(db, "clubs", clubId, "users", userToDelete.id));
          toast({ title: "Registro de Usuario eliminado", description: `El registro de ${userToDelete.name} ha sido eliminado.` });
          setUserToDelete(null);
          if (clubId) fetchData(clubId);
      } catch (error) {
          console.error("Error deleting user: ", error);
          toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el registro del usuario." });
      } finally {
          setSaving(false);
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
            <Dialog open={isAddUserOpen} onOpenChange={(isOpen) => {
              if (!isOpen) resetAddUserForm();
              setIsAddUserOpen(isOpen);
            }}>
                <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Añadir Usuario
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                          Crea un registro de usuario para un miembro del club o staff.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="py-4 space-y-4">
                        <Select value={addMode} onValueChange={(value) => setAddMode(value as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="contact">Desde un Contacto Existente</SelectItem>
                                <SelectItem value="staff">Nuevo Miembro (Staff)</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {addMode === 'contact' ? (
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact-select">Miembro del Club</Label>
                                    <Select 
                                      value={selectedContact} 
                                      onValueChange={value => {
                                        const contact = availableContacts.find(c => c.id === value);
                                        if (contact) {
                                          setSelectedContact(value);
                                          setSelectedContactEmail((contact as Player).tutorEmail || (contact as Coach).email);
                                          setSelectedRole((contact as Coach).email ? 'Coach' : 'Family');
                                        }
                                      }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecciona un miembro..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableContacts.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {'lastName' in c ? `${c.name} ${c.lastName}` : c.name} ({'monthlyFee' in c ? 'Jugador' : 'Entrenador'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-email">Email de Contacto</Label>
                                    <Input id="contact-email" readOnly value={selectedContactEmail} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-role">Asignar Rol de Acceso</Label>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Family">Familia</SelectItem>
                                            <SelectItem value="Coach">Entrenador</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <DialogFooter className="border-t pt-4 mt-4">
                                   <Button type="button" className="w-full" onClick={() => handleAddUser('contact')} disabled={saving || !selectedContactEmail}>
                                      {saving ? <Loader2 className="animate-spin" /> : 'Crear Usuario'}
                                  </Button>
                                </DialogFooter>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-4">
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
                                    <Input id="staff-role-title" placeholder="p.ej., Coordinador" value={staffRoleTitle} onChange={e => setStaffRoleTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="staff-email">Email</Label>
                                    <Input id="staff-email" type="email" value={staffEmail} onChange={e => { setStaffEmail(e.target.value); }} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="staff-role">Asignar Rol de Acceso</Label>
                                    <Select value={staffRole} onValueChange={setStaffRole}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Staff">Staff</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <DialogFooter className="border-t pt-4 mt-4">
                                   <Button type="button" className="w-full" onClick={() => handleAddUser('staff')} disabled={saving || !staffEmail}>
                                      {saving ? <Loader2 className="animate-spin" /> : 'Crear Usuario de Staff'}
                                  </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </div>
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
                      <Badge variant={user.role === 'super-admin' ? 'destructive' : user.role === 'Admin' ? 'default' : user.role === 'Coach' ? 'secondary' : 'outline'}>
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
            <DialogDescription>Actualiza los datos del usuario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Nombre</Label>
              <Input id="edit-user-name" value={editedUserName} onChange={(e) => setEditedUserName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input id="edit-user-email" value={editedUserEmail} onChange={(e) => setEditedUserEmail(e.target.value)} />
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
                        <SelectItem value="super-admin">Super-Admin</SelectItem>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente la entrada del usuario {userToDelete?.name} de la base de datos de la aplicación.
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
