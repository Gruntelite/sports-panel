
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  query,
  where,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Player, Coach, Staff, Document, ClubSettings, ClubMember } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusCircle,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Send,
  Upload,
  Search
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { requestFilesAction } from "@/lib/actions";
import { useTranslation } from "./i18n-provider";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Label } from "./ui/label";


type EssentialDocStatus = {
  memberId: string;
  name: string;
  role: string;
  docs: {
    [key: string]: {
      name: string;
      hasIt: boolean;
      docId?: string;
    };
  };
};

function ManualUploadDialog({ open, onOpenChange, manualUploadData, onUpload, clubId }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    manualUploadData: { memberId: string; memberName: string; docName: string } | null;
    onUpload: () => void;
    clubId: string | null;
}) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    
    const handleManualUpload = async () => {
        if (!clubId || !manualUploadData || !fileToUpload) {
            toast({ variant: "destructive", title: t('common.error'), description: t('clubFiles.errors.missingDataDesc') });
            return;
        }

        setSaving(true);
        const { memberId, memberName, docName } = manualUploadData;

        try {
            const filePath = `club-documents/${clubId}/${memberId}/${uuidv4()}-${fileToUpload.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, fileToUpload);
            
            const newDoc = {
                name: docName,
                path: filePath,
                createdAt: Timestamp.now(),
                ownerId: memberId,
                ownerName: memberName,
                category: docName,
            };
            await addDoc(collection(db, "clubs", clubId, "documents"), newDoc);
            
            toast({ title: t('clubFiles.essentialDocs.statusUpdated'), description: t('clubFiles.essentialDocs.fileUploadedDesc') });
            onUpload();
            onOpenChange(false);
            setFileToUpload(null);
        } catch(e) {
            toast({ variant: "destructive", title: t('common.error'), description: t('clubFiles.errors.uploadErrorDesc') });
        } finally {
            setSaving(false);
        }
    }
    
    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('clubFiles.essentialDocs.manualUploadTitle')}</DialogTitle>
                    <DialogDescription>{t('clubFiles.essentialDocs.manualUploadDesc', { memberName: manualUploadData?.memberName || '', docName: manualUploadData?.docName || '' })}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="manual-file-upload">{t('clubFiles.essentialDocs.file')}</Label>
                        <Input id="manual-file-upload" type="file" onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
                    <Button onClick={handleManualUpload} disabled={saving || !fileToUpload}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        <Upload className="mr-2 h-4 w-4"/>
                        {t('clubFiles.uploadButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export function EssentialDocs() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [essentialDocs, setEssentialDocs] = useState<string[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [docStatuses, setDocStatuses] = useState<EssentialDocStatus[]>([]);
  const [allMembers, setAllMembers] = useState<ClubMember[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterDoc, setFilterDoc] = useState<string>('all');
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [availableDocsToRequest, setAvailableDocsToRequest] = useState<string[]>([]);
  const [selectedDocsToRequest, setSelectedDocsToRequest] = useState<string[]>([]);
  
  const [isManualUploadModalOpen, setIsManualUploadModalOpen] = useState(false);
  const [manualUploadData, setManualUploadData] = useState<{memberId: string, memberName: string, docName: string} | null>(null);


  const calculateDocStatuses = (members: ClubMember[], docs: Document[], essentialDocList: string[]) => {
      return members.map(member => {
        const memberDocs = docs.filter(d => d.ownerId === member.id);
        const status: EssentialDocStatus = {
            memberId: member.id,
            name: member.name,
            role: member.type,
            docs: {},
        };
        (essentialDocList || []).forEach(docName => {
            const foundDoc = memberDocs.find(d => 
                d.category === docName
            );
            status.docs[docName] = {
                name: docName,
                hasIt: !!foundDoc,
                docId: foundDoc?.id,
            };
        });
        return status;
    });
  }

  const fetchClubData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      const settings = (settingsSnap.data() as ClubSettings) || {};
      const essentialDocList = settings.essentialDocs || [];
      setEssentialDocs(essentialDocList);

      const members: ClubMember[] = [];
      const playersSnap = await getDocs(collection(db, "clubs", currentClubId, "players"));
      playersSnap.forEach(d => {
        const data = d.data() as Player;
        members.push({ id: d.id, name: `${data.name} ${data.lastName}`, type: 'Jugador', data, teamId: data.teamId, email: data.tutorEmail });
      });
      
      const coachesSnap = await getDocs(collection(db, "clubs", currentClubId, "coaches"));
      coachesSnap.forEach(d => {
        const data = d.data() as Coach;
        members.push({ id: d.id, name: `${data.name} ${data.lastName}`, type: 'Entrenador', data, teamId: data.teamId, email: data.email });
      });
      setAllMembers(members);

      const docsSnap = await getDocs(collection(db, "clubs", currentClubId, "documents"));
      const allDocsData = docsSnap.docs.map(d => ({id: d.id, ...d.data()} as Document));
      setAllDocs(allDocsData);
      
      const statuses = calculateDocStatuses(members, allDocsData, essentialDocList);
      setDocStatuses(statuses);

    } catch (error) {
      console.error("Error fetching essential docs data:", error);
      toast({ variant: "destructive", title: t('common.error'), description: "No se pudieron cargar los datos." });
    }
    setLoading(false);
  };


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        getDoc(doc(db, "users", user.uid)).then(userDoc => {
            if (userDoc.exists()) {
                const id = userDoc.data().clubId;
                setClubId(id);
                fetchClubData(id);
            }
        });
      }
    });

    return () => unsubscribe();
  }, []);
  
  const filteredDocStatuses = docStatuses.filter(status => {
    const statusMatch = (() => {
        if (filterStatus === 'all') return true;
        const hasAllDocs = Object.values(status.docs).every(doc => doc.hasIt);
        if (filterStatus === 'completed') return hasAllDocs;
        if (filterStatus === 'pending') return !hasAllDocs;
        return true;
    })();

    const docMatch = (() => {
        if (filterDoc === 'all') return true;
        return status.docs[filterDoc] && !status.docs[filterDoc].hasIt;
    })();
    
    const searchMatch = (() => {
        if (!searchTerm.trim()) return true;
        const lowerSearch = searchTerm.toLowerCase();
        const member = allMembers.find(m => m.id === status.memberId);
        const teamName = (member?.data as Player | Coach)?.teamName || '';

        return status.name.toLowerCase().includes(lowerSearch) ||
               status.role.toLowerCase().includes(lowerSearch) ||
               teamName.toLowerCase().includes(lowerSearch);
    })();
    
    if(filterDoc !== 'all') {
        return docMatch && searchMatch;
    }

    return statusMatch && searchMatch;
  });
  
  const handleAddEssentialDoc = async () => {
    if (!clubId || !newDocName.trim()) return;
    setSaving(true);
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await updateDoc(settingsRef, {
            essentialDocs: arrayUnion(newDocName.trim())
        });
        const newEssentialDocs = [...essentialDocs, newDocName.trim()];
        setEssentialDocs(newEssentialDocs);
        setNewDocName("");
        const newStatuses = calculateDocStatuses(allMembers, allDocs, newEssentialDocs);
        setDocStatuses(newStatuses);
        toast({ title: t('clubFiles.essentialDocs.docAdded') });
    } catch(e) {
        toast({ variant: "destructive", title: t('common.error'), description: t('clubFiles.essentialDocs.errors.addDoc')});
    } finally {
        setSaving(false);
    }
  }
  
  const handleRemoveEssentialDoc = async (docName: string) => {
    if (!clubId) return;
     setSaving(true);
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await updateDoc(settingsRef, {
            essentialDocs: arrayRemove(docName)
        });
        const newEssentialDocs = essentialDocs.filter(d => d !== docName);
        setEssentialDocs(newEssentialDocs);
        const newStatuses = calculateDocStatuses(allMembers, allDocs, newEssentialDocs);
        setDocStatuses(newStatuses);
        toast({ title: t('clubFiles.essentialDocs.docRemoved')});
    } catch(e) {
        toast({ variant: "destructive", title: t('common.error'), description: t('clubFiles.essentialDocs.errors.removeDoc')});
    } finally {
        setSaving(false);
    }
  }

  const handleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      }
      return [...prev, memberId];
    });
  }
  
    const handleToggleDocStatus = async (memberId: string, docName: string, hasIt: boolean) => {
        if (!clubId) return;
        
        if(hasIt) { 
            try {
                 const docToDelete = allDocs.find(d => d.ownerId === memberId && d.category === docName);

                if (docToDelete) {
                    await deleteDoc(doc(db, "clubs", clubId, "documents", docToDelete.id!));
                    
                    const newAllDocs = allDocs.filter(d => d.id !== docToDelete.id);
                    setAllDocs(newAllDocs);
                    const newStatuses = calculateDocStatuses(allMembers, newAllDocs, essentialDocs);
                    setDocStatuses(newStatuses);
                    toast({ title: t('clubFiles.essentialDocs.statusUpdated') });
                }
            } catch (e) {
                toast({ variant: "destructive", title: t('common.error'), description: t('clubFiles.essentialDocs.errors.statusUpdate') });
            }
        } else {
             const member = allMembers.find(m => m.id === memberId);
             if (member) {
                setManualUploadData({ memberId, memberName: member.name, docName });
                setIsManualUploadModalOpen(true);
             }
        }
    };

    const handleUploadFinished = () => {
        if (clubId) {
            fetchClubData(clubId);
        }
    }


  const openRequestModal = () => {
    if (selectedMembers.length === 0) return;
    
    const allMissingDocs = new Set<string>();
    selectedMembers.forEach(memberId => {
      const status = docStatuses.find(ds => ds.memberId === memberId);
      if (status) {
        Object.values(status.docs).forEach(doc => {
          if (!doc.hasIt) {
            allMissingDocs.add(doc.name);
          }
        });
      }
    });
    
    setAvailableDocsToRequest(Array.from(allMissingDocs));
    setSelectedDocsToRequest(Array.from(allMissingDocs)); // Select all by default
    setIsRequestModalOpen(true);
  };

  const handleSendRequests = async () => {
     if (!clubId || selectedMembers.length === 0 || selectedDocsToRequest.length === 0) {
        setIsRequestModalOpen(false);
        return;
    }
    
    setIsSending(true);

    const membersToSend = selectedMembers
        .map(id => allMembers.find(m => m.id === id))
        .filter(m => m && m.email) as ClubMember[];
        
    const result = await requestFilesAction({
        clubId,
        members: membersToSend,
        documents: selectedDocsToRequest
    });
    
    if (result.success) {
        toast({ title: t('clubFiles.essentialDocs.requestsSent'), description: t('clubFiles.essentialDocs.requestsSentDesc', { count: result.count || 0 })});
    } else {
        toast({ variant: "destructive", title: t('common.error'), description: result.error || t('clubFiles.essentialDocs.errors.noRequestsSent') });
    }
    
    setIsSending(false);
    setSelectedMembers([]);
    setIsRequestModalOpen(false);
  };


  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>{t('clubFiles.essentialDocs.defineTitle')}</CardTitle>
                <CardDescription>{t('clubFiles.essentialDocs.defineDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Input placeholder={t('clubFiles.essentialDocs.newDocPlaceholder')} value={newDocName} onChange={(e) => setNewDocName(e.target.value)}/>
                    <Button onClick={handleAddEssentialDoc} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>}
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    {essentialDocs.map(doc => (
                        <Badge key={doc} variant="secondary" className="text-base py-1 pl-3 pr-1">
                            {doc}
                            <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => handleRemoveEssentialDoc(doc)}>
                                <Trash2 className="h-3 w-3"/>
                            </Button>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{t('clubFiles.essentialDocs.statusTitle')}</CardTitle>
                        <CardDescription>{t('clubFiles.essentialDocs.statusDescription')}</CardDescription>
                    </div>
                     <Button onClick={openRequestModal} disabled={selectedMembers.length === 0 || isSending} className="w-full sm:w-auto">
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                        {t('clubFiles.essentialDocs.requestSelected', { count: selectedMembers.length })}
                    </Button>
                 </div>
                 <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
                    <div className="relative w-full sm:w-auto flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('clubFiles.essentialDocs.searchPlaceholder')}
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value as any); setFilterDoc('all'); }}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder={t('clubFiles.essentialDocs.filterByStatus')}/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('clubFiles.essentialDocs.statuses.all')}</SelectItem>
                            <SelectItem value="pending">{t('clubFiles.essentialDocs.statuses.pending')}</SelectItem>
                            <SelectItem value="completed">{t('clubFiles.essentialDocs.statuses.completed')}</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={filterDoc} onValueChange={(value) => { setFilterDoc(value); setFilterStatus('all'); }}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder={t('clubFiles.essentialDocs.filterByDocument')}/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('clubFiles.essentialDocs.allDocuments')}</SelectItem>
                            {essentialDocs.map(doc => (
                                <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </CardHeader>
            <CardContent>
                <div className="relative h-[600px] overflow-auto border rounded-lg">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => setSelectedMembers(checked ? filteredDocStatuses.map(ds => ds.memberId) : [])} /></TableHead>
                            <TableHead>{t('clubFiles.essentialDocs.table.member')}</TableHead>
                            <TableHead>{t('clubFiles.essentialDocs.table.role')}</TableHead>
                            {essentialDocs.map(doc => <TableHead key={doc}>{doc}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDocStatuses.map(status => (
                            <TableRow key={status.memberId}>
                                <TableCell><Checkbox checked={selectedMembers.includes(status.memberId)} onCheckedChange={() => handleSelectMember(status.memberId)} /></TableCell>
                                <TableCell className="font-medium">{status.name}</TableCell>
                                <TableCell>{status.role}</TableCell>
                                {essentialDocs.map(docName => (
                                    <TableCell key={docName} className="text-center">
                                         <DropdownMenu>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                             {status.docs[docName]?.hasIt ? (
                                                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto"/>
                                                            ) : (
                                                                <AlertTriangle className="h-5 w-5 text-red-500 mx-auto"/>
                                                            )}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{status.docs[docName]?.hasIt ? t('clubFiles.essentialDocs.status.delivered') : t('clubFiles.essentialDocs.status.pending')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => handleToggleDocStatus(status.memberId, docName, status.docs[docName]?.hasIt)}>
                                                    {status.docs[docName]?.hasIt ? (
                                                        <><AlertTriangle className="mr-2 h-4 w-4 text-red-500"/> {t('clubFiles.essentialDocs.markAsPending')}</>
                                                    ) : (
                                                        <><CheckCircle className="mr-2 h-4 w-4 text-green-500"/> {t('clubFiles.essentialDocs.markAsDelivered')}</>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
        </Card>
      </div>
      {isManualUploadModalOpen && (
        <ManualUploadDialog 
            open={isManualUploadModalOpen}
            onOpenChange={setIsManualUploadModalOpen}
            manualUploadData={manualUploadData}
            onUpload={handleUploadFinished}
            clubId={clubId}
        />
      )}

      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent>
            <DialogHeader>
                 <DialogTitle>{t('clubFiles.essentialDocs.selectDocsToSendTitle')}</DialogTitle>
                 <DialogDescription>{t('clubFiles.essentialDocs.selectDocsToSendDesc')}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <ScrollArea className="h-64">
                    <div className="space-y-2">
                        {availableDocsToRequest.map(docName => (
                             <div key={docName} className="flex items-center space-x-2 p-2 border rounded-md">
                                <Checkbox 
                                    id={`doc-req-${docName}`}
                                    checked={selectedDocsToRequest.includes(docName)}
                                    onCheckedChange={(checked) => {
                                        setSelectedDocsToRequest(prev => 
                                            checked ? [...prev, docName] : prev.filter(d => d !== docName)
                                        )
                                    }}
                                />
                                <Label htmlFor={`doc-req-${docName}`} className="font-normal flex-1">{docName}</Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
             <DialogFooter>
                <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
                <Button onClick={handleSendRequests} disabled={isSending || selectedDocsToRequest.length === 0}>
                   {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                    {t('common.send')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
