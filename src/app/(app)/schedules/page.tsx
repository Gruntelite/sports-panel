
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, X, Loader2, MoreVertical, Edit, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type Venue = {
    id: string;
    name: string;
}

type Assignment = {
    id: string; // Team ID
    teamName: string;
    startTime: string;
    endTime: string;
    venueId: string;
}

type Team = {
  id: string;
  name: string;
}

type DailyScheduleEntry = {
    id: string; // Unique ID for each entry
    teamId: string;
    teamName: string;
    time: string; // e.g., "16:00 - 17:00"
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

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  
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
        setAssignments(fetchedTeams.map(t => ({ id: t.id, teamName: t.name, startTime: '', endTime: '', venueId: '' })));

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

  const handleSaveDailySchedules = () => {
    const newDailySchedule: DailyScheduleEntry[] = [];
    const timeSlotsSet = new Set(timeSlots);

    assignments.forEach(assignment => {
      const team = teams.find(t => t.id === assignment.id);
      const venue = venues.find(v => v.id === assignment.venueId);

      if(team && venue && assignment.startTime && assignment.endTime) {
        try {
          const start = new Date(`1970-01-01T${assignment.startTime}`);
          const end = new Date(`1970-01-01T${assignment.endTime}`);
          let current = start;

          while(current < end) {
            const next = new Date(current.getTime() + 60 * 60 * 1000);
            const timeSlot = `${current.toTimeString().substring(0,5)} - ${next.toTimeString().substring(0,5)}`;
            if (timeSlotsSet.has(timeSlot)) {
              newDailySchedule.push({
                id: crypto.randomUUID(),
                teamId: team.id,
                teamName: team.name,
                time: timeSlot,
                venueName: venue.name
              });
            }
            current = next;
          }
        } catch (e) {
            console.error("Invalid time format for assignment:", assignment)
        }
      }
    });

    const updatedWeeklySchedule = {
        ...weeklySchedule,
        [currentDay]: newDailySchedule,
    };
    
    setWeeklySchedule(updatedWeeklySchedule);
    setAssignments(teams.map(t => ({ id: t.id, teamName: t.name, startTime: '', endTime: '', venueId: '' })));
    toast({ title: "Horarios para el " + currentDay + " preparados", description: `Los horarios se guardarán al pulsar "Guardar Plantilla".` });
  };
  
  const handleSaveTemplate = async () => {
    if (!clubId || !currentTemplateId) return;
    const scheduleRef = getScheduleRef(currentTemplateId);
    if (scheduleRef) {
        await updateDoc(scheduleRef, { weeklySchedule: weeklySchedule });
        toast({ title: "Plantilla Guardada", description: `Los horarios de la plantilla se han guardado.` });
        if(clubId) fetchAllData(clubId);
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
    setAssignments(teams.map(t => ({ id: t.id, teamName: t.name, startTime: '', endTime: '', venueId: '' })));
    if (direction === 'next') {
        setCurrentDayIndex((prev) => (prev + 1) % daysOfWeek.length);
    } else {
        setCurrentDayIndex((prev) => (prev - 1 + daysOfWeek.length) % daysOfWeek.length);
    }
  };
  
  const handleAssignmentChange = (id: string, field: 'startTime' | 'endTime' | 'venueId', value: string) => {
    setAssignments(prev => prev.map(a => a.id === id ? {...a, [field]: value} : a));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, teamId: string) => {
    setDraggedTeamId(teamId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTeamId: string) => {
    e.preventDefault();
    if (draggedTeamId === null || draggedTeamId === targetTeamId) {
      setDraggedTeamId(null);
      return;
    }
    
    const currentIndex = assignments.findIndex(a => a.id === draggedTeamId);
    const targetIndex = assignments.findIndex(a => a.id === targetTeamId);
    
    const newAssignments = [...assignments];
    const [removed] = newAssignments.splice(currentIndex, 1);
    newAssignments.splice(targetIndex, 0, removed);
    
    setAssignments(newAssignments);
    setDraggedTeamId(null);
  };
  
  const currentTemplate = scheduleTemplates.find(t => t.id === currentTemplateId);

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
                      setEditedTemplateName(currentTemplate?.name || "");
                      setIsEditTemplateModalOpen(true);
                    }}>
                      <Edit className="mr-2 h-4 w-4"/>
                      Renombrar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onSelect={() => setTemplateToDelete(currentTemplate || null)}>
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

            <Dialog open={isNewTemplateModalOpen} onOpenChange={setIsNewTemplateModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Crear Plantilla
                </Button>
              </DialogTrigger>
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
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold text-base">Gestionar Recintos</h3>
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="start-time">Hora de Inicio</Label>
                        <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="end-time">Hora de Fin</Label>
                        <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold text-base">Asignar Tiempos y Recintos</h3>
                     <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {assignments.map(assignment => (
                          <div 
                            key={assignment.id} 
                            className="p-3 bg-muted/50 rounded-lg space-y-3 cursor-grab"
                            draggable
                            onDragStart={(e) => handleDragStart(e, assignment.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, assignment.id)}
                          >
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                <Label className="font-semibold flex-1">{assignment.teamName}</Label>
                              </div>
                              <div className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 pl-7">
                                  <Input type="time" value={assignment.startTime} onChange={(e) => handleAssignmentChange(assignment.id, 'startTime', e.target.value)} />
                                  <Input type="time" value={assignment.endTime} onChange={(e) => handleAssignmentChange(assignment.id, 'endTime', e.target.value)} />
                                   <Select value={assignment.venueId} onValueChange={(value) => handleAssignmentChange(assignment.id, 'venueId', value)}>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Recinto" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {venues.map(venue => (
                                              <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </div>
                          </div>
                        ))}
                     </div>
                </div>
                 <Button onClick={handleSaveDailySchedules} className="w-full">
                    <Clock className="mr-2 h-4 w-4" />
                    Preparar Horarios para {currentDay}
                </Button>
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
                    <div className="grid grid-cols-[120px_1fr]">
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b border-r">Horas</div>
                        <div className="p-3 font-semibold text-muted-foreground text-sm bg-muted/40 border-b">Equipos y Recintos</div>
                    </div>
                    <div className="grid grid-cols-1 max-h-[600px] overflow-y-auto">
                    {timeSlots.map(slot => (
                        <div key={slot} className="grid grid-cols-[120px_1fr] items-start border-b last:border-b-0 min-h-16">
                            <div className="p-3 text-sm font-semibold text-muted-foreground whitespace-nowrap self-stretch border-r h-full flex items-center">{slot}</div>
                            <div className="p-2 flex flex-wrap gap-2 self-start">
                               {weeklySchedule[currentDay]
                                 .filter(entry => entry.time === slot)
                                 .map(entry => (
                                     <div key={entry.id} className="flex flex-col items-center p-1 bg-muted rounded-md">
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

