

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, X, Loader2, MoreVertical, Edit, GripVertical, Settings, CalendarRange, Trash, Hourglass, Calendar, Eye, Download, RefreshCw } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


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
    startTime: string;
    endTime: string;
    venueId: string;
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
    startTime?: string;
    endTime?: string;
}

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
type DayOfWeek = typeof daysOfWeek[number];


const WeeklyScheduleView = ({ template, innerRef }: { template: ScheduleTemplate | undefined, innerRef: React.Ref<HTMLDivElement> }) => {
    if (!template) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No hay plantilla seleccionada para mostrar.</p>
            </div>
        );
    }
    
    const { venues, weeklySchedule, startTime = "16:00", endTime = "23:00" } = template;

    const timeToMinutes = (time: string) => {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const timeSlots = useMemo(() => {
        const slots = [];
        let current = new Date(`1970-01-01T${startTime}:00`);
        const endDate = new Date(`1970-01-01T${endTime}:00`);
        while (current < endDate) {
            slots.push(current.toTimeString().substring(0, 5));
            current = new Date(current.getTime() + 60 * 60 * 1000); // 1 hour intervals
        }
        return slots;
    }, [startTime, endTime]);

    const processDayEvents = (events: DailyScheduleEntry[]) => {
        if (!events || events.length === 0) return [];

        const sortedEvents = events
            .filter(e => e.startTime && e.endTime)
            .map(e => ({
                ...e,
                start: timeToMinutes(e.startTime),
                end: timeToMinutes(e.endTime),
            }))
            .sort((a, b) => a.start - b.start || a.end - b.end);

        let layout: (DailyScheduleEntry & { start: number; end: number; col: number; numCols: number })[] = [];

        for (const event of sortedEvents) {
            let col = 0;
            let overlaps = layout.filter(e => Math.max(event.start, e.start) < Math.min(event.end, e.end));

            let colNumbers = overlaps.map(e => e.col);
            while (colNumbers.includes(col)) {
                col++;
            }
            
            layout.push({ ...event, col, numCols: 1 });
        }
        
        for (let i = 0; i < layout.length; i++) {
            let overlappingGroup = [layout[i]];
            for (let j = 0; j < layout.length; j++) {
                if (i === j) continue;
                if (Math.max(layout[i].start, layout[j].start) < Math.min(layout[i].end, layout[j].end)) {
                    let isAlreadyInGroup = overlappingGroup.some(groupedEvent => groupedEvent.id === layout[j].id);
                    if (!isAlreadyInGroup) {
                        overlappingGroup.push(layout[j]);
                    }
                }
            }
            const maxCols = overlappingGroup.reduce((max, e) => Math.max(max, e.col), 0) + 1;
            
            for (const eventInGroup of overlappingGroup) {
                const eventToUpdate = layout.find(e => e.id === eventInGroup.id);
                if (eventToUpdate) {
                    eventToUpdate.numCols = maxCols;
                }
            }
        }
        
        return layout;
    };

    const calculateEventPosition = (event: any) => {
        const gridStartMinutes = timeToMinutes(startTime);
        const eventStartMinutes = timeToMinutes(event.startTime);
        const eventEndMinutes = timeToMinutes(event.endTime);

        const startOffsetMinutes = eventStartMinutes - gridStartMinutes;
        const durationMinutes = eventEndMinutes - eventStartMinutes;

        const hourHeight = 80;
        const top = (startOffsetMinutes / 60) * hourHeight;
        const height = (durationMinutes / 60) * hourHeight;
        
        const width = 100 / event.numCols;
        const left = event.col * width;
        
        return { 
            top, 
            height, 
            left: `${left}%`, 
            width: `calc(${width}% - 4px)`
        };
    };

    return (
        <div ref={innerRef} className="bg-background p-4">
          <div className="space-y-8">
            {venues.map(venue => (
                <div key={venue.id}>
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-muted/50 border-b">
                            <CardTitle>{venue.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0">
                            <div className="flex" style={{ minWidth: `${60 + daysOfWeek.length * 220}px` }}>
                                <div className="w-[60px] flex-shrink-0">
                                    <div className="h-[41px] border-b">&nbsp;</div> {/* Spacer for day headers */}
                                    {timeSlots.map(time => (
                                        <div key={time} className="h-[80px] relative text-right pr-2 border-r">
                                            <span className="text-xs font-semibold text-muted-foreground absolute -top-2.5 right-2">{time}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-grow">
                                    {daysOfWeek.map(day => {
                                        const dayEvents = processDayEvents(weeklySchedule[day]?.filter(e => e.venueId === venue.id));
                                        return (
                                            <div key={day} className="w-[220px] flex-shrink-0 border-r relative">
                                                <div className="text-center font-medium p-2 h-[41px] border-b">{day}</div>
                                                <div className="relative h-full">
                                                    {timeSlots.map((_, index) => (
                                                        <div key={index} className="h-[80px] border-b"></div>
                                                    ))}
                                                    {dayEvents.map(event => {
                                                        const { top, height, left, width } = calculateEventPosition(event);
                                                        return (
                                                            <div
                                                                key={event.id}
                                                                className="absolute p-2 py-1 flex flex-col rounded-lg border text-primary bg-primary/20 border-primary/50"
                                                                style={{ top, height, left, width }}
                                                            >
                                                                <span className="font-bold text-sm break-words">{event.teamName}</span>
                                                                <span className="text-xs opacity-90 flex items-center gap-1 mt-auto">
                                                                    <Hourglass className="h-3 w-3"/>{event.startTime} - {event.endTime}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
      </div>
    );
};


export default function SchedulesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const scheduleViewsRef = useRef<(HTMLDivElement | null)[]>([]);
  
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
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);
  const [newVenueName, setNewVenueName] = useState('');

  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("23:00");

  const [teams, setTeams] = useState<Team[]>([]);
  
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [currentTab, setCurrentTab] = useState("editor");
  
  const getScheduleRef = useCallback((templateId: string) => {
    if (!clubId || !templateId) return null;
    return doc(db, "clubs", clubId, "schedules", templateId);
  }, [clubId]);

  const loadTemplateData = useCallback((template: ScheduleTemplate) => {
    setVenues(template.venues || []);
    setWeeklySchedule(template.weeklySchedule || {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []});
    setStartTime(template.startTime || "16:00");
    setEndTime(template.endTime || "23:00");
    setCurrentDayIndex(0); // Reset to Monday on template change
    setCurrentVenueIndex(0);
  }, []);

  const fetchAllData = useCallback(async (currentClubId: string, isRefresh: boolean = false) => {
    if(isRefresh) {
        setIsRefreshing(true);
    } else {
        setLoading(true);
    }
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
            const initialTemplateData: Omit<ScheduleTemplate, 'id'> = { 
                name: "Plantilla General",
                venues: [{id: 'main-field', name: 'Campo Principal'}],
                weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []},
                startTime: "16:00",
                endTime: "23:00",
            };
            await setDoc(newTemplateRef, initialTemplateData);
            setScheduleTemplates([{ id: newTemplateId, ...initialTemplateData }]);
            setCurrentTemplateId(newTemplateId);
            loadTemplateData({ id: newTemplateId, ...initialTemplateData });
        } else {
            const templates = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleTemplate));
            setScheduleTemplates(templates);
            const templateToLoad = templates.find(t => t.id === currentTemplateId) || templates[0];
            if (templateToLoad) {
                setCurrentTemplateId(templateToLoad.id);
                loadTemplateData(templateToLoad);
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
        if(isRefresh) {
            setIsRefreshing(false);
        } else {
            setLoading(false);
        }
    }
  }, [currentTemplateId, toast, loadTemplateData]);

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
            toast({ title: "Recinto/Pista añadido", description: "El nuevo recinto/pista se ha guardado." });
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
        toast({ title: "Recinto/Pista eliminado", description: "El recinto/pista se ha eliminado." });
    }
  }

  const handleSaveTemplate = async () => {
    if (!clubId || !currentTemplateId) return;

    const updatedWeeklySchedule = {
        ...weeklySchedule,
        [currentDay]: pendingAssignments,
    };

    const scheduleRef = getScheduleRef(currentTemplateId);
    if (scheduleRef) {
        try {
            await updateDoc(scheduleRef, { 
              weeklySchedule: updatedWeeklySchedule,
              startTime: startTime,
              endTime: endTime,
            });
            setWeeklySchedule(updatedWeeklySchedule);
            toast({ title: "Plantilla Guardada", description: `Los horarios para el ${currentDay} se han guardado.` });
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
            weeklySchedule: {Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []},
            startTime: "16:00",
            endTime: "23:00",
        });
        toast({ title: "Plantilla creada", description: `La plantilla "${newTemplateName}" ha sido creada.` });
        setIsNewTemplateModalOpen(false);
        setNewTemplateName("");
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
    if (direction === 'next') {
        setCurrentDayIndex((prev) => (prev + 1) % daysOfWeek.length);
    } else {
        setCurrentDayIndex((prev) => (prev - 1 + daysOfWeek.length) % daysOfWeek.length);
    }
  };

  const navigateVenue = (direction: 'prev' | 'next') => {
    if (!venues.length) return;
    if (direction === 'next') {
        setCurrentVenueIndex((prev) => (prev + 1) % venues.length);
    } else {
        setCurrentVenueIndex((prev) => (prev - 1 + venues.length) % venues.length);
    }
  };

  const handleUpdateAssignment = (id: string, field: keyof Assignment, value: string) => {
    setPendingAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  
  const handleAssignmentSelectChange = (id: string, field: 'teamId' | 'venueId', value: string) => {
    const nameField = field === 'teamId' ? 'teamName' : 'venueName';
    const selectedItem = field === 'teamId' ? teams.find(t => t.id === value) : venues.find(v => v.id === value);
    const name = selectedItem?.name || '';
    
    setPendingAssignments(prev => prev.map(a => {
        if (a.id === id) {
            const updatedAssignment: any = { ...a, [field]: value };
            if (nameField) {
                updatedAssignment[nameField] = name;
            }
            return updatedAssignment;
        }
        return a;
    }));
  };

  const handleAddAssignmentRow = () => {
    setPendingAssignments(prev => [...prev, {
      id: crypto.randomUUID(),
      teamId: '',
      teamName: '',
      startTime: '',
      endTime: '',
      venueId: '',
      venueName: '',
    }]);
  };

  const handleRemoveAssignment = (id: string) => {
    setPendingAssignments(prev => prev.filter(a => a.id !== id));
  };
  
  useEffect(() => {
    setPendingAssignments(weeklySchedule[currentDay] || []);
  }, [currentDay, weeklySchedule]);

  const timeSlots = useMemo(() => {
    const slots = [];
    if (!startTime || !endTime) return [];
    let current = new Date(`1970-01-01T${startTime}:00`);
    const endDate = new Date(`1970-01-01T${endTime}:00`);
    while (current < endDate) {
      slots.push(current.toTimeString().substring(0, 5));
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
    return slots;
  }, [startTime, endTime]);

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const processOverlaps = (events: DailyScheduleEntry[]) => {
      if (!events || events.length === 0) return [];
  
      const sortedEvents = events
        .filter(e => e.startTime && e.endTime)
        .map(e => ({
          ...e,
          start: timeToMinutes(e.startTime),
          end: timeToMinutes(e.endTime),
        }))
        .sort((a, b) => a.start - b.start || a.end - b.end);
  
      let eventLayouts: (DailyScheduleEntry & { start: number; end: number; col: number; numCols: number })[] = [];

      for(const event of sortedEvents) {
          let col = 0;
          let overlaps = eventLayouts.filter(e => 
              Math.max(event.start, e.start) < Math.min(event.end, e.end)
          );

          let colNumbers = overlaps.map(e => e.col);
          while(colNumbers.includes(col)) {
              col++;
          }
          
          eventLayouts.push({ ...event, col, numCols: 1 });
      }

      for (let i = 0; i < eventLayouts.length; i++) {
        let overlappingGroup = [eventLayouts[i]];
        for (let j = 0; j < eventLayouts.length; j++) {
            if (i === j) continue;
            if (Math.max(eventLayouts[i].start, eventLayouts[j].start) < Math.min(eventLayouts[i].end, eventLayouts[j].end)) {
              let isAlreadyInGroup = overlappingGroup.some(groupedEvent => groupedEvent.id === eventLayouts[j].id);
              if (!isAlreadyInGroup) {
                 overlappingGroup.push(eventLayouts[j]);
              }
            }
        }
        if (overlappingGroup.length > 1) {
          const maxCols = overlappingGroup.length;
          overlappingGroup.forEach(eventInGroup => {
            const layoutEvent = eventLayouts.find(e => e.id === eventInGroup.id);
            if (layoutEvent) {
              layoutEvent.numCols = maxCols;
            }
          });
        }
      }

      return eventLayouts;
  };
  
  const calculateEventPosition = (event: any) => {
    if (!startTime) return { top: 0, height: 0, left: '0%', width: '100%' };
    
    const gridStartMinutes = timeToMinutes(startTime);
    const eventStartMinutes = timeToMinutes(event.startTime);
    const eventEndMinutes = timeToMinutes(event.endTime);

    const startOffsetMinutes = eventStartMinutes - gridStartMinutes;
    const durationMinutes = eventEndMinutes - eventStartMinutes;
    
    const hourHeight = 80; 
    const top = (startOffsetMinutes / 60) * hourHeight;
    const height = (durationMinutes / 60) * hourHeight;
    
    const width = 100 / event.numCols;
    const left = event.col * width;
    return { 
        top, 
        height, 
        left: `${left}%`, 
        width: `calc(${width}% - 4px)`
    };
  };
  
    const handleDownloadPdf = async () => {
    const template = displayTemplate;
    if (!template) return;

    setIsDownloading(true);
    try {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
        });
        
        let isFirstPage = true;

        for (let i = 0; i < template.venues.length; i++) {
            const venueElement = scheduleViewsRef.current[i];
            if (venueElement) {
                const canvas = await html2canvas(venueElement, { 
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: 'hsl(var(--background))' 
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

                if (!isFirstPage) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
                isFirstPage = false;
            }
        }
        
        pdf.save('horario-semanal.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: "Error al generar PDF",
            description: "No se pudo crear el archivo PDF. Inténtalo de nuevo."
        });
    } finally {
        setIsDownloading(false);
    }
  };

  const displayTemplate = useMemo(() => {
    if (!currentTemplateId) return undefined;
    
    const baseTemplate = scheduleTemplates.find(t => t.id === currentTemplateId);
    if (!baseTemplate) return undefined;

    // Create a deep copy to avoid direct state mutation
    const newTemplate = JSON.parse(JSON.stringify(baseTemplate));

    // Overwrite the current day's schedule with pending changes
    newTemplate.weeklySchedule[currentDay] = pendingAssignments;
    
    return newTemplate;
  }, [currentTemplateId, scheduleTemplates, currentDay, pendingAssignments]);


  const currentVenue = displayTemplate?.venues && displayTemplate.venues.length > 0 ? displayTemplate.venues[currentVenueIndex] : null;

  const displayedEvents = useMemo(() => {
    if (!displayTemplate || !currentVenue) return [];
    
    const dailyEvents = displayTemplate.weeklySchedule[currentDay];
    if (!dailyEvents) return [];
    
    const venueEvents = dailyEvents.filter(event => event.venueId === currentVenue.id);
    return processOverlaps(venueEvents);
  }, [displayTemplate, currentDay, currentVenue]);


  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 h-full">
       <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Plantillas de Horarios</h1>
          <p className="text-muted-foreground">
            Crea y gestiona las plantillas de horarios de entrenamiento semanales.
          </p>
        </div>

       <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex flex-col">
         <div className="flex items-center justify-between border-b">
            <TabsList>
                <TabsTrigger value="editor"><Edit className="mr-2 h-4 w-4" /> Editor de Plantilla</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4" /> Vista Semanal</TabsTrigger>
            </TabsList>
         </div>
          {currentTab === 'preview' && (
            <div className="flex items-center gap-2 py-4 px-1 border-b">
                 <Dialog open={isNewTemplateModalOpen} onOpenChange={setIsNewTemplateModalOpen}>
                  <Dialog open={isEditTemplateModalOpen} onOpenChange={setIsEditTemplateModalOpen}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                              {displayTemplate?.name || "Seleccionar Plantilla"}
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
                                  setEditedTemplateName(displayTemplate?.name || "");
                                  setIsEditTemplateModalOpen(true);
                                }} disabled={!currentTemplateId}>
                                  <Edit className="mr-2 h-4 w-4"/>
                                  Renombrar
                              </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setTemplateToDelete(displayTemplate || null)} disabled={!currentTemplateId}>
                              <Trash2 className="mr-2 h-4 w-4"/>
                              Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Renombrar Plantilla</DialogTitle>
                              <DialogDescription>Introduce un nuevo nombre para la plantilla "{displayTemplate?.name}".</DialogDescription>
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
                <Button onClick={() => clubId && fetchAllData(clubId, true)} variant="outline" size="icon" disabled={isRefreshing}>
                    {isRefreshing ? ( <RefreshCw className="h-4 w-4 animate-spin" /> ) : ( <RefreshCw className="h-4 w-4" /> )}
                </Button>
                <Button onClick={handleDownloadPdf} variant="outline" size="icon" disabled={isDownloading}>
                    {isDownloading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Download className="h-4 w-4" /> )}
                </Button>
            </div>
         )}
        <TabsContent value="editor" className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[420px_1fr] gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Configuración de Horarios</CardTitle>
                      <CardDescription>Define recintos/pistas, rango horario y asigna tiempos a tus equipos para el <span className="font-semibold">{currentDay}</span>.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                      <Accordion type="multiple" className="w-full" defaultValue={['assignments']}>
                        <AccordionItem value="settings">
                          <AccordionTrigger className="text-base font-semibold">
                            <div className="flex items-center gap-2">
                              <Settings className="h-5 w-5" />
                              Configuración General
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 space-y-4">
                            <div className="space-y-2">
                              <Label>Recintos/Pistas de Entrenamiento</Label>
                              <div className="flex items-center gap-2">
                                  <Input placeholder="Nombre del nuevo recinto/pista" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} />
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
                                    <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end-time">Hora de Fin</Label>
                                    <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
                            <div className="space-y-4">
                              {pendingAssignments.map(assignment => (
                                <div key={assignment.id} className="flex items-end gap-2 p-2 rounded-lg border bg-muted/30">
                                    <div className="grid grid-cols-1 gap-2 flex-1">
                                      <div className="space-y-1">
                                        <Label className="text-xs">Equipo</Label>
                                        <Select value={assignment.teamId} onValueChange={(value) => handleAssignmentSelectChange(assignment.id, 'teamId', value)}>
                                          <SelectTrigger className="h-8"><SelectValue placeholder="Equipo" /></SelectTrigger>
                                          <SelectContent>
                                            {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Recinto/Pista</Label>
                                        <Select value={assignment.venueId} onValueChange={(value) => handleAssignmentSelectChange(assignment.id, 'venueId', value)}>
                                          <SelectTrigger className="h-8"><SelectValue placeholder="Recinto/Pista" /></SelectTrigger>
                                          <SelectContent>
                                            {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex gap-2">
                                        <div className="space-y-1 w-full">
                                          <Label className="text-xs">Inicio</Label>
                                          <Input type="time" value={assignment.startTime} onChange={(e) => handleUpdateAssignment(assignment.id, 'startTime', e.target.value)} className="h-8" />
                                        </div>
                                        <div className="space-y-1 w-full">
                                          <Label className="text-xs">Fin</Label>
                                          <Input type="time" value={assignment.endTime} onChange={(e) => handleUpdateAssignment(assignment.id, 'endTime', e.target.value)} className="h-8" />
                                        </div>
                                      </div>
                                    </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveAssignment(assignment.id)}>
                                    <Trash className="h-4 w-4 text-destructive"/>
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <Button variant="outline" className="w-full" onClick={handleAddAssignmentRow}>
                              <PlusCircle className="mr-2 h-4 w-4"/>
                              Añadir Asignación
                            </Button>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                  </CardContent>
              </Card>
              
              <Card className="sticky top-6 self-start flex flex-col lg:col-span-2 xl:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10 border-b">
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDay('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                          <div className="text-base font-semibold capitalize w-24 text-center">{currentDay}</div>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDay('next')}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateVenue('prev')} disabled={venues.length < 2}><ChevronLeft className="h-4 w-4" /></Button>
                          <div className="text-base font-semibold capitalize w-32 text-center truncate">{currentVenue?.name || "Sin Recintos/Pistas"}</div>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateVenue('next')} disabled={venues.length < 2}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow p-0">
                    <div className="relative overflow-x-auto">
                        <div className="grid grid-cols-[60px_1fr]">
                            <div className="col-start-1 col-end-2 border-r">
                                {timeSlots.map(time => (
                                    <div key={time} className="h-[80px] relative">
                                       <span className="text-xs font-semibold text-muted-foreground absolute -top-2.5 right-2">{time}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="col-start-2 col-end-3 relative">
                                {timeSlots.map((time, index) => (
                                    <div key={index} className="h-[80px] border-b"></div>
                                ))}
                                {displayedEvents.map(event => {
                                  const { top, height, left, width } = calculateEventPosition(event);
                                  return (
                                      <div
                                        key={event.id}
                                        className="absolute p-2 flex flex-col rounded-lg border text-primary bg-primary/20 border-primary/50"
                                        style={{ top, height, left, width }}
                                      >
                                          <span className="font-bold text-sm truncate">{event.teamName}</span>
                                          <span className="text-xs opacity-90 truncate flex items-center gap-1"><MapPin className="h-3 w-3"/>{event.venueName}</span>
                                          <span className="text-xs opacity-90 truncate flex items-center gap-1 mt-auto"><Hourglass className="h-3 w-3"/>{event.startTime} - {event.endTime}</span>
                                      </div>
                                  )
                                })}
                            </div>
                        </div>
                    </div>
                  </CardContent>
                  <div className="p-6 border-t">
                      <Button size="lg" className="w-full gap-2" onClick={handleSaveTemplate}>
                          <Clock className="h-5 w-5"/>
                          Guardar Plantilla
                      </Button>
                  </div>
              </Card>
          </div>
        </TabsContent>
        <TabsContent value="preview" className="pt-0 overflow-auto">
             <WeeklyScheduleView 
                template={displayTemplate} 
                innerRef={el => {
                    if (el && displayTemplate?.venues) {
                      // This ref is now for the container of all venue schedules
                    }
                }}
            />
        </TabsContent>
      </Tabs>


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
