

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, X, Loader2, MoreVertical, Edit, GripVertical, Settings, CalendarRange, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Venue = {
    id: string;
    name: string;
}

type Assignment = {
    id: string;
    teamId: string;
    teamName: string;
    startTime: string;
    endTime: string;
    venueId: string;
    venueName: string;
}

type Team = {
  id: string;
  name: string;
}

type DailyScheduleEntry = {
    id: string; 
    teamId: string;
    teamName: string;
    time: string; 
    venueName: string;
};

type WeeklySchedule = {
  Lunes: DailyScheduleEntry[];
  Martes: DailyScheduleEntry[];
  Miércoles: DailyScheduleEntry[];
  Jueves: DailyScheduleEntry[];
  Viernes: DailyScheduleEntry[];
  Sábado: DailyScheduleEntry[];
  Domingo: DailyScheduleEntry[];
};

type ScheduleTemplate = {
    id: string;
    name: string;
    venues: Venue[];
    weeklySchedule: WeeklySchedule;
}

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
type DayOfWeek = typeof daysOfWeek[number];


export default function SchedulesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ScheduleTemplate | null>(null);
  const [editedTemplateName, setEditedTemplateName] = useState("");
  
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: [],
  });

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const currentDay: DayOfWeek = daysOfWeek[currentDayIndex];
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [newVenueName, setNewVenueName] = useState('');

  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("23:00");

  const [teams, setTeams] = useState<Team[]>([]);
  
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Partial<Assignment>>({});
  
  const getScheduleRef = useCallback((templateId: string) => {
    if (!clubId || !templateId) return null;
    return doc(db, "clubs", clubId, "schedules", templateId);
  }, [clubId]);

  const fetchAllData = useCallback(async (currentClubId: string) => {
    setLoading(true);
    try {
        const teamsCol = collection(db, "clubs", currentClubId, "teams");
        const teamsSnapshot = await getDocs(teamsCol);
        const fetchedTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Team));
        setTeams(fetchedTeams);

        const schedulesCol = collection(db, "clubs", currentClubId, "schedules");
        const schedulesSnapshot = await getDocs(schedulesCol);

        if (schedulesSnapshot.empty) {
            const newTemplateId = "general";
            const newTemplateRef = doc(db, "clubs", currentClubId, "schedules", newTemplateId);
            const initialTemplateData = { 
                name: "Plantilla General",
                venues: [],
                weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []}
            };
            await setDoc(newTemplateRef, initialTemplateData);
            setScheduleTemplates([{ id: newTemplateId, ...initialTemplateData }]);
            setCurrentTemplateId(newTemplateId);
            loadTemplateData({ id: newTemplateId, ...initialTemplateData });
        } else {
            const templates = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleTemplate));
            setScheduleTemplates(templates);
            const templateToLoad = templates.find(t => t.id === currentTemplateId) || templates[0];
            setCurrentTemplateId(templateToLoad.id);
            loadTemplateData(templateToLoad);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
        setLoading(false);
    }
  }, [currentTemplateId, toast]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const currentClubId = userData.clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            fetchAllData(currentClubId);
          }
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchAllData]);

  const loadTemplateData = (template: ScheduleTemplate) => {
    setVenues(template.venues || []);
    setWeeklySchedule(template.weeklySchedule || {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []});
    setCurrentDayIndex(0); // Reset to Monday on template change
  };

  const handleTemplateChange = (templateId: string) => {
    const newTemplate = scheduleTemplates.find(t => t.id === templateId);
    if (newTemplate) {
        setCurrentTemplateId(templateId);
        loadTemplateData(newTemplate);
    }
  };

  const handleAddVenue = async () => {
    if (newVenueName.trim() !== '' && clubId && currentTemplateId) {
        const newVenue = {id: crypto.randomUUID(), name: newVenueName.trim()};
        const updatedVenues = [...venues, newVenue];
        
        const scheduleRef = getScheduleRef(currentTemplateId);
        if (scheduleRef) {
            await updateDoc(scheduleRef, { venues: updatedVenues });
            setVenues(updatedVenues);
            setNewVenueName('');
            toast({ title: "Recinto añadido", description: "El nuevo recinto se ha guardado." });
        }
    }
  }

  const handleRemoveVenue = async (id: string) => {
    if (!clubId || !currentTemplateId) return;
    const updatedVenues = venues.filter(v => v.id !== id);
    const scheduleRef = getScheduleRef(currentTemplateId);
    if (scheduleRef) {
        await updateDoc(scheduleRef, { venues: updatedVenues });
        setVenues(updatedVenues);
        toast({ title: "Recinto eliminado", description: "El recinto se ha eliminado." });
    }
  }
  
  const generateTimeSlots = (start: string, end: string) => {
    const slots = [];
    let current = new Date(`1970-01-01T${start}:00`);
    const endDate = new Date(`1970-01-01T${end}:00`);

    while (current < endDate) {
      const next = new Date(current.getTime() + 60 * 60 * 1000);
      slots.push(`${current.toTimeString().substring(0, 5)} - ${next.toTimeString().substring(0, 5)}`);
      current = next;
    }
    return slots;
  };
  
  const timeSlots = generateTimeSlots(startTime, endTime);
  
  const handleSaveTemplate = async () => {
    if (!clubId || !currentTemplateId) return;
    
    // 1. Generate new entries from pending assignments.
    const newDailyScheduleEntries = pendingAssignments.flatMap(assignment => {
        const start = new Date(`1970-01-01T${assignment.startTime}`);
        const end = new Date(`1970-01-01T${assignment.endTime}`);
        const slots = [];
        let current = start;

        while(current < end) {
            const next = new Date(current.getTime() + 60 * 60 * 1000); // 1-hour slots
            const timeSlot = `${current.toTimeString().substring(0,5)} - ${next.toTimeString().substring(0,5)}`;
            slots.push({
                id: crypto.randomUUID(),
                teamId: assignment.teamId,
                teamName: assignment.teamName,
                time: timeSlot,
                venueName: assignment.venueName
            });
            current = next;
        }
        return slots;
    });

    // 2. Remove old entries for teams that have new pending assignments.
    const teamsInPending = new Set(pendingAssignments.map(a => a.teamId));
    const savedEntriesForDay = weeklySchedule[currentDay] || [];
    const filteredOldEntries = savedEntriesForDay.filter(entry => !teamsInPending.has(entry.teamId));

    // 3. Combine old entries with new entries.
    const updatedDaySchedule = [...filteredOldEntries, ...newDailyScheduleEntries];

    // 4. Create the final weekly schedule object.
    const updatedWeeklySchedule = {
        ...weeklySchedule,
        [currentDay]: updatedDaySchedule,
    };

    // 5. Save to Firestore.
    const scheduleRef = getScheduleRef(currentTemplateId);
    if (scheduleRef) {
        try {
            await updateDoc(scheduleRef, { weeklySchedule: updatedWeeklySchedule });
            setWeeklySchedule(updatedWeeklySchedule);
            setPendingAssignments([]); // Clear pending assignments after saving.
            toast({ title: "Plantilla Guardada", description: `Los horarios para el ${currentDay} se han guardado.` });
            if (clubId) fetchAllData(clubId); // Optional: refetch all data to be sure.
        } catch (error) {
            console.error("Error saving template:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la plantilla." });
        }
    }
  };

  const handleCreateTemplate = async () => {
    if (!clubId || !newTemplateName.trim()) return;

    const newTemplateId = newTemplateName.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomUUID().substring(0, 4);
    const newTemplateRef = doc(db, "clubs", clubId, "schedules", newTemplateId);
    
    try {
        await setDoc(newTemplateRef, {
            name: newTemplateName.trim(),
            venues: [],
            weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []}
        });
        toast({ title: "Plantilla creada", description: `La plantilla "${newTemplateName}" ha sido creada.` });
        setIsNewTemplateModalOpen(false);
        setNewTemplateName("");
        setCurrentTemplateId(newTemplateId);
        if(clubId) fetchAllData(clubId);
    } catch (error) {
        console.error("Error creating template: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la plantilla." });
    }
  };

  const handleEditTemplateName = async () => {
    if (!clubId || !currentTemplateId || !editedTemplateName.trim()) return;
    const scheduleRef = getScheduleRef(currentTemplateId);
    try {
      if(scheduleRef){
        await updateDoc(scheduleRef, { name: editedTemplateName.trim() });
        toast({ title: "Plantilla actualizada", description: `El nombre de la plantilla se ha actualizado.` });
        setIsEditTemplateModalOpen(false);
        setEditedTemplateName("");
        if(clubId) fetchAllData(clubId);
      }
    } catch (error) {
      console.error("Error updating template name:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el nombre." });
    }
  };
  
  const handleDeleteTemplate = async () => {
    if (!clubId || !templateToDelete) return;
    try {
        await deleteDoc(doc(db, "clubs", clubId, "schedules", templateToDelete.id));
        toast({ title: "Plantilla eliminada", description: "La plantilla ha sido eliminada." });
        setTemplateToDelete(null);
        setCurrentTemplateId(null); // Reset current template
        if(clubId) fetchAllData(clubId);
    } catch (error) {
        console.error("Error deleting template:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la plantilla." });
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setPendingAssignments([]);
    if (direction === 'next') {
        setCurrentDayIndex((prev) => (prev + 1) % daysOfWeek.length);
    } else {
        setCurrentDayIndex((prev) => (prev - 1 + daysOfWeek.length) % daysOfWeek.length);
    }
  };
  
  const handleSaveAssignment = () => {
    if (!currentAssignment.teamId || !currentAssignment.venueId || !currentAssignment.startTime || !currentAssignment.endTime) {
      toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
      return;
    }
    const team = teams.find(t => t.id === currentAssignment.teamId);
    const venue = venues.find(v => v.id === currentAssignment.venueId);

    if (team && venue) {
        const newAssignment = {
            id: crypto.randomUUID(),
            teamId: team.id,
            teamName: team.name,
            venueId: venue.id,
            venueName: venue.name,
            startTime: currentAssignment.startTime!,
            endTime: currentAssignment.endTime!,
        };
        setPendingAssignments(prev => [...prev, newAssignment]);
        setCurrentAssignment({});
        setIsAssignmentModalOpen(false);
    }
  };

  const handleRemoveAssignment = (id: string) => {
    setPendingAssignments(prev => prev.filter(a => a.id !== id));
  };
  
  const currentTemplate = scheduleTemplates.find(t => t.id === currentTemplateId);

  const pendingScheduleEntries = useMemo(() => {
    return pendingAssignments.flatMap(assignment => {
        const start = new Date(`1970-01-01T${assignment.startTime}`);
        const end = new Date(`1970-01-01T${assignment.endTime}`);
        const slots = [];
        let current = start;

        while(current < end) {
            const next = new Date(current.getTime() + 60 * 60 * 1000);
            const timeSlot = `${current.toTimeString().substring(0,5)} - ${next.toTimeString().substring(0,5)}`;
            if (timeSlots.includes(timeSlot)) {
                slots.push({
                    id: crypto.randomUUID(),
                    teamId: assignment.teamId,
                    teamName: assignment.teamName,
                    time: timeSlot,
                    venueName: assignment.venueName,
                    isPending: true,
                });
            }
            current = next;
        }
        return slots;
    });
  }, [pendingAssignments, timeSlots]);


  const displayedScheduleEntries = useMemo(() => {
    const savedEntries = (weeklySchedule[currentDay] || []).map(e => ({...e, isPending: false}));
    
    // Filter out saved entries that would be overwritten by a pending one for the same team
    const teamsInPending = new Set(pendingAssignments.map(a => a.teamId));
    const filteredSaved = savedEntries.filter(entry => !teamsInPending.has(entry.teamId));

    return [...filteredSaved, ...pendingScheduleEntries];

  }, [weeklySchedule, pendingScheduleEntries, currentDay, pendingAssignments]);


  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Plantillas de Horarios</h1>
          <p className="text-muted-foreground">
            Crea y gestiona las plantillas de horarios de entrenamiento semanales.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isNewTemplateModalOpen} onOpenChange={setIsNewTemplateModalOpen}>
              <Dialog open={isEditTemplateModalOpen} onOpenChange={setIsEditTemplateModalOpen}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                          {currentTemplate?.name || "Seleccionar Plantilla"}
                          <MoreVertical className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuRadioGroup value={currentTemplateId || ''} onValueChange={handleTemplateChange}>
                          {scheduleTemplates.map(template => (
                              <DropdownMenuRadioItem key={template.id} value={template.id}>{template.name}</DropdownMenuRadioItem>
                          ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                         <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              setIsNewTemplateModalOpen(true);
                          }}>
                              <PlusCircle className="mr-2 h-4 w-4"/>
                              Crear Plantilla
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              setEditedTemplateName(currentTemplate?.name || "");
                              setIsEditTemplateModalOpen(true);
                            }} disabled={!currentTemplateId}>
                              <Edit className="mr-2 h-4 w-4"/>
                              Renombrar
                          </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => setTemplateToDelete(currentTemplate || null)} disabled={!currentTemplateId}>
                          <Trash2 className="mr-2 h-4 w-4"/>
                          Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Renombrar Plantilla</DialogTitle>
                          <DialogDescription>Introduce un nuevo nombre para la plantilla "{currentTemplate?.name}".</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                          <Label htmlFor="edit-template-name">Nuevo Nombre</Label>
                          <Input id="edit-template-name" value={editedTemplateName} onChange={(e) => setEditedTemplateName(e.target.value)} />
                      </div>
                      <DialogFooter>
                          <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                          <Button onClick={handleEditTemplateName}>Guardar Cambios</Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
              
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Plantilla de Horarios</DialogTitle>
                    <DialogDescription>Introduce un nombre para tu nueva plantilla.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="new-template-name">Nombre de la Plantilla</Label>
                    <Input id="new-template-name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                    <Button onClick={handleCreateTemplate}>Crear Plantilla</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 flex-1">
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Horarios</CardTitle>
                <CardDescription>Define recintos, rango horario y asigna tiempos a tus equipos para el <span className="font-semibold">{currentDay}</span>.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                 <Accordion type="multiple" className="w-full">
                  <AccordionItem value="settings">
                    <AccordionTrigger className="text-base font-semibold">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuración General
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Recintos de Entrenamiento</Label>
                         <div className="flex items-center gap-2">
                            <Input placeholder="Nombre del nuevo recinto" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} />
                            <Button onClick={handleAddVenue} size="sm"><PlusCircle className="h-4 w-4"/></Button>
                        </div>
                        <div className="space-y-2">
                            {venues.map(venue => (
                                <div key={venue.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                                    <span>{venue.name}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveVenue(venue.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4">
                          <div className="space-y-2">
                              <Label htmlFor="start-time">Hora de Inicio</Label>
                              <Input id="start-time" type="time" value={startTime || ''} onChange={(e) => setStartTime(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="end-time">Hora de Fin</Label>
                              <Input id="end-time" type="time" value={endTime || ''} onChange={(e) => setEndTime(e.target.value)} />
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="assignments">
                    <AccordionTrigger className="text-base font-semibold">
                       <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Asignaciones para el {currentDay}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <div className="space-y-2">
                        {pendingAssignments.map(assignment => (
                           <div key={assignment.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                              <div className="flex-1">
                                <p className="font-semibold">{assignment.teamName}</p>
                                <p className="text-sm text-muted-foreground">{assignment.startTime} - {assignment.endTime} @ {assignment.venueName}</p>
                              </div>
                               <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveAssignment(assignment.id)}>
                                <Trash className="h-4 w-4 text-destructive"/>
                               </Button>
                           </div>
                        ))}
                      </div>

                       <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
                        <DialogTrigger asChild>
                           <Button variant="outline" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Asignar Equipo
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Asignar Horario a Equipo</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Equipo</Label>
                               <Select value={currentAssignment.teamId} onValueChange={(value) => setCurrentAssignment(prev => ({...prev, teamId: value}))}>
                                  <SelectTrigger><SelectValue placeholder="Selecciona un equipo" /></SelectTrigger>
                                  <SelectContent>
                                    {teams.filter(t => !pendingAssignments.some(a => a.teamId === t.id) && !weeklySchedule[currentDay].some(entry => entry.teamId === t.id)).map(team => (
                                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Hora Inicio</Label>
                                  <Input type="time" step="3600" value={currentAssignment.startTime || ''} onChange={e => setCurrentAssignment(prev => ({...prev, startTime: e.target.value}))}/>
                                </div>
                                <div className="space-y-2">
                                  <Label>Hora Fin</Label>
                                  <Input type="time" step="3600" value={currentAssignment.endTime || ''} onChange={e => setCurrentAssignment(prev => ({...prev, endTime: e.target.value}))}/>
                                </div>
                             </div>
                             <div className="space-y-2">
                               <Label>Recinto</Label>
                               <Select value={currentAssignment.venueId} onValueChange={(value) => setCurrentAssignment(prev => ({...prev, venueId: value}))}>
                                  <SelectTrigger><SelectValue placeholder="Selecciona un recinto" /></SelectTrigger>
                                  <SelectContent>
                                      {venues.map(venue => (
                                          <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                               </Select>
                             </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                            <Button onClick={handleSaveAssignment}>Añadir Asignación</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
        
        <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                    <CardTitle className="text-xl capitalize w-32 text-center">{currentDay}</CardTitle>
                    <Button variant="outline" size="icon" onClick={() => navigateDay('next')}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[100px_1fr]">
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b border-r">Horas</div>
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b">Equipos y Recintos</div>
                    </div>
                    <div className="grid grid-cols-1 max-h-[600px] overflow-y-auto">
                    {timeSlots.map(slot => (
                        <div key={slot} className="grid grid-cols-[100px_1fr] items-start border-b last:border-b-0 min-h-16">
                            <div className="p-3 text-sm font-semibold text-muted-foreground whitespace-nowrap self-stretch border-r h-full flex items-center">{slot.split(' - ')[0]}</div>
                            <div className="p-2 flex flex-wrap gap-2 self-start">
                               {displayedScheduleEntries
                                 .filter(entry => entry.time === slot)
                                 .map((entry: any) => (
                                     <div key={entry.id} className={cn("flex flex-col items-center p-1 bg-muted rounded-md", entry.isPending && "opacity-50")}>
                                        <Badge>{entry.teamName}</Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {entry.venueName}
                                        </span>
                                     </div>
                                 ))
                               }
                            </div>
                        </div>
                     ))}
                    </div>
                </div>
            </CardContent>
             <div className="absolute bottom-6 right-6">
                <Button size="lg" className="gap-2" onClick={handleSaveTemplate}>
                    <Clock className="h-5 w-5"/>
                    Guardar Plantilla
                </Button>
            </div>
        </Card>
      </div>

       <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la plantilla "{templateToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    
