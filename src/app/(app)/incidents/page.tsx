

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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Incident, Protocol } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
  Download,
  Upload,
  FileText,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { es, ca } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from "uuid";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useTranslation } from "@/components/i18n-provider";


function IncidentsTab() {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [incidentData, setIncidentData] = useState<Partial<Incident>>({});
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);

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

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "clubs", currentClubId, "incidents"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const incidentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(incidentsList);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      toast({ variant: "destructive", title: t('common.error'), description: t('incidents.errors.loadIncidents') });
    }
    setLoading(false);
  };
  
  const handleOpenModal = (mode: 'add' | 'edit', incident?: Incident) => {
    setModalMode(mode);
    setIncidentData(incident || { date: new Date().toISOString().split('T')[0], type: 'Comportamiento', status: 'Abierta', involved: [] });
    setIsModalOpen(true);
  };

  const handleSaveIncident = async () => {
    if (!clubId || !incidentData.type || !incidentData.date) {
      toast({ variant: "destructive", title: t('common.error'), description: t('incidents.errors.dateTypeRequired') });
      return;
    }
    setSaving(true);
    
    try {
      const dataToSave = {
        ...incidentData,
        date: Timestamp.fromDate(new Date(incidentData.date as string))
      }
      
      if (modalMode === 'edit' && incidentData.id) {
        const incidentRef = doc(db, "clubs", clubId, "incidents", incidentData.id);
        await updateDoc(incidentRef, dataToSave);
        toast({ title: t('incidents.incidentUpdated'), description: t('incidents.incidentUpdatedDesc') });
      } else {
        await addDoc(collection(db, "clubs", clubId, "incidents"), dataToSave);
        toast({ title: t('incidents.incidentCreated'), description: t('incidents.incidentCreatedDesc') });
      }
      setIsModalOpen(false);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error saving incident:", error);
      toast({ variant: "destructive", title: t('common.error'), description: t('incidents.errors.saveIncident') });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteIncident = async () => {
    if (!clubId || !incidentToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "clubs", clubId, "incidents", incidentToDelete.id));
      toast({ title: t('incidents.incidentDeleted'), description: t('incidents.incidentDeletedDesc') });
      setIncidentToDelete(null);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting incident:", error);
      toast({ variant: "destructive", title: t('common.error'), description: t('incidents.errors.deleteIncident') });
    } finally {
      setSaving(false);
    }
  };

   return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>{t('incidents.incidents.history')}</CardTitle>
          <Button onClick={() => handleOpenModal('add')} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('incidents.incidents.register')}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('incidents.incidents.table.date')}</TableHead>
                    <TableHead>{t('incidents.incidents.table.type')}</TableHead>
                    <TableHead>{t('incidents.incidents.table.involved')}</TableHead>
                    <TableHead>{t('incidents.incidents.table.status')}</TableHead>
                    <TableHead className="text-right">{t('incidents.incidents.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.length > 0 ? (
                    incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>{format(incident.date.toDate(), "d 'de' LLLL, yyyy", { locale: locale === 'ca' ? ca : es })}</TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{incident.involved.join(', ')}</TableCell>
                        <TableCell>
                          <Badge variant={incident.status === 'Resuelta' ? 'secondary' : incident.status === 'En Progreso' ? 'outline' : 'destructive'}>{incident.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenModal('edit', incident)}><Edit className="mr-2 h-4 w-4" />{t('incidents.incidents.edit')}</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setIncidentToDelete(incident)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />{t('incidents.incidents.delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">{t('incidents.incidents.noIncidents')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? t('incidents.incidents.modal.addTitle') : t('incidents.incidents.modal.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t('incidents.incidents.modal.date')}</Label>
                <Input id="date" type="date" value={typeof incidentData.date === 'string' ? incidentData.date.split('T')[0] : incidentData.date?.toDate().toISOString().split('T')[0] || ''} onChange={(e) => setIncidentData(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('incidents.incidents.modal.type')}</Label>
                <Select value={incidentData.type} onValueChange={(value) => setIncidentData(prev => ({ ...prev, type: value as Incident['type'] }))}>
                  <SelectTrigger><SelectValue placeholder={t('incidents.incidents.modal.selectType')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lesión">{t('incidents.types.injury')}</SelectItem>
                    <SelectItem value="Comportamiento">{t('incidents.types.behavior')}</SelectItem>
                    <SelectItem value="Administrativa">{t('incidents.types.administrative')}</SelectItem>
                    <SelectItem value="Otro">{t('incidents.types.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="involved">{t('incidents.incidents.modal.involved')}</Label>
              <Input id="involved" placeholder={t('incidents.incidents.modal.involvedPlaceholder')} value={incidentData.involved?.join(', ') || ''} onChange={(e) => setIncidentData(prev => ({ ...prev, involved: e.target.value.split(',').map(s => s.trim()) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('incidents.incidents.modal.description')}</Label>
              <Textarea id="description" placeholder={t('incidents.incidents.modal.descriptionPlaceholder')} value={incidentData.description || ''} onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">{t('incidents.incidents.modal.status')}</Label>
                <Select value={incidentData.status} onValueChange={(value) => setIncidentData(prev => ({ ...prev, status: value as Incident['status'] }))}>
                  <SelectTrigger><SelectValue placeholder={t('incidents.incidents.modal.selectStatus')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abierta">{t('incidents.status.open')}</SelectItem>
                    <SelectItem value="En Progreso">{t('incidents.status.inProgress')}</SelectItem>
                    <SelectItem value="Resuelta">{t('incidents.status.resolved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleSaveIncident} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('incidents.incidents.modal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!incidentToDelete} onOpenChange={(open) => !open && setIncidentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('incidents.confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncident} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : t('incidents.incidents.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
   )
}


function ProtocolsTab() {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [protocolNameToSave, setProtocolNameToSave] = useState("");
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null);

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const protocolsQuery = query(collection(db, "clubs", currentClubId, "protocols"), orderBy("createdAt", "desc"));
      const protocolsSnapshot = await getDocs(protocolsQuery);
      const protocolsList = protocolsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Protocol)
      );
      setProtocols(protocolsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('incidents.errors.loadProtocols'),
      });
    }
    setLoading(false);
  };
  
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


  const handleFileUpload = async () => {
    if (!clubId) {
        toast({ variant: "destructive", title: t('incidents.errors.authErrorTitle'), description: t('incidents.errors.authErrorDesc')});
        return;
    }
    if (!fileToUpload || !protocolNameToSave.trim()) {
      toast({ variant: "destructive", title: t('incidents.errors.missingDataTitle'), description: t('incidents.errors.missingDataDesc')});
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileToUpload.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: t('incidents.errors.fileTooLargeTitle'), description: t('incidents.errors.fileTooLargeDesc')});
        return;
    }

    setSaving(true);
    
    try {
      const filePath = `club-protocols/${clubId}/${uuidv4()}-${fileToUpload.name}`;
      const fileRef = ref(storage, filePath);
      
      await uploadBytes(fileRef, fileToUpload);
      
      const url = await getDownloadURL(fileRef);
      
      const newProtocolData: Omit<Protocol, "id"> = {
        name: protocolNameToSave.trim(),
        url,
        path: filePath,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "clubs", clubId, "protocols"), newProtocolData);

      toast({
        title: t('incidents.protocols.uploadSuccessTitle'),
        description: t('incidents.protocols.uploadSuccessDesc', { protocolName: protocolNameToSave }),
      });
      
      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setProtocolNameToSave("");
      
      if(clubId) fetchData(clubId);

    } catch (error: any) {
      console.error("Error uploading file:", error);
      let errorMessage = t('incidents.errors.uploadErrorDescDefault');
      if (error.code === 'storage/unauthorized') {
        errorMessage = t('incidents.errors.uploadErrorUnauthorized');
      }
      toast({ variant: "destructive", title: t('incidents.errors.uploadErrorTitle'), description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProtocol = async () => {
    if (!clubId || !protocolToDelete) return;
    setSaving(true);

    try {
      const fileRef = ref(storage, protocolToDelete.path);
      await deleteObject(fileRef);

      await deleteDoc(doc(db, "clubs", clubId, "protocols", protocolToDelete.id!));
      
      toast({
        title: t('incidents.protocols.deleteSuccessTitle'),
        description: t('incidents.protocols.deleteSuccessDesc', { protocolName: protocolToDelete.name }),
      });

      setProtocolToDelete(null);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting protocol:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('incidents.errors.deleteProtocol'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{t('incidents.protocols.title')}</CardTitle>
            <CardDescription>
              {t('incidents.protocols.description')}
            </CardDescription>
          </div>
          <Dialog
            open={isUploadModalOpen}
            onOpenChange={setIsUploadModalOpen}
          >
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('incidents.protocols.uploadButton')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('incidents.protocols.modal.title')}</DialogTitle>
                <DialogDescription>
                  {t('incidents.protocols.modal.description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="protocol-name">{t('incidents.protocols.modal.nameLabel')} *</Label>
                  <Input
                    id="protocol-name"
                    placeholder={t('incidents.protocols.modal.namePlaceholder')}
                    value={protocolNameToSave}
                    onChange={(e) => setProtocolNameToSave(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocol-file">{t('incidents.protocols.modal.fileLabel')} *</Label>
                  <Input
                    id="protocol-file"
                    type="file"
                    onChange={(e) =>
                      setFileToUpload(e.target.files?.[0] || null)
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t('incidents.protocols.modal.fileHint')}</p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{t('common.cancel')}</Button>
                </DialogClose>
                <Button onClick={handleFileUpload} disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Upload className="mr-2 h-4 w-4" />
                  {t('incidents.protocols.modal.saveButton')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('incidents.protocols.table.fileName')}</TableHead>
                    <TableHead>{t('incidents.protocols.table.uploadDate')}</TableHead>
                    <TableHead className="text-right">{t('incidents.protocols.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocols.length > 0 ? (
                    protocols.map((protocol) => (
                      <TableRow key={protocol.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground"/>
                            {protocol.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(protocol.createdAt.toDate(), "d 'de' LLLL 'de' yyyy", { locale: locale === 'ca' ? ca : es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon" className="mr-2">
                            <a href={protocol.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => setProtocolToDelete(protocol)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t('incidents.protocols.noProtocols')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!protocolToDelete}
        onOpenChange={(open) => !open && setProtocolToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidents.confirmDeleteDescProtocol')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProtocol}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('incidents.incidents.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export default function IncidentsAndProtocolsPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("incidents");
    const tabs = [
        { id: "incidents", label: t('incidents.tabs.incidents'), icon: AlertTriangle },
        { id: "protocols", label: t('incidents.tabs.protocols'), icon: ClipboardList }
    ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">{t('sidebar.incidents')}</h1>
        <p className="text-muted-foreground">
          {t('incidents.description')}
        </p>
      </div>
      <div className="sm:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger>
            <SelectValue placeholder={t('incidents.selectSection')} />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="incidents" value={activeTab} onValueChange={setActiveTab} className="hidden sm:block">
        <TabsList className="grid w-full grid-cols-2">
            {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>
      
      {activeTab === 'incidents' && (
        <div className="mt-6 sm:mt-0">
          <IncidentsTab />
        </div>
      )}
      {activeTab === 'protocols' && (
        <div className="mt-6 sm:mt-0">
          <ProtocolsTab />
        </div>
      )}
    </div>
  );
}
