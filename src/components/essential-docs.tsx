
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
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
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { requestFilesAction } from "@/lib/actions";
import { useTranslation } from "./i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type EssentialDocStatus = {
  memberId: string;
  name: string;
  role: string;
  docs: {
    [key: string]: {
      name: string;
      hasIt: boolean;
    };
  };
};

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
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterDoc, setFilterDoc] = useState<string>('all');


  useEffect(() => {
    const fetchClubData = async (currentClubId: string) => {
      setLoading(true);
      try {
        // Fetch essential docs definition
        const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
        const settingsSnap = await getDoc(settingsRef);
        const settings = (settingsSnap.data() as ClubSettings) || {};
        setEssentialDocs(settings.essentialDocs || []);

        // Fetch all members
        const members: ClubMember[] = [];
        const playersSnap = await getDocs(collection(db, "clubs", currentClubId, "players"));
        playersSnap.forEach(d => members.push({ id: d.id, name: `${d.data().name} ${d.data().lastName}`, type: 'Jugador', data: d.data() as Player, email: (d.data() as Player).tutorEmail }));
        
        const coachesSnap = await getDocs(collection(db, "clubs", currentClubId, "coaches"));
        coachesSnap.forEach(d => members.push({ id: d.id, name: `${d.data().name} ${d.data().lastName}`, type: 'Entrenador', data: d.data() as Coach, email: (d.data() as Coach).email }));
        setAllMembers(members);

        // Fetch all documents
        const docsSnap = await getDocs(collection(db, "clubs", currentClubId, "documents"));
        const allDocs = docsSnap.docs.map(d => d.data() as Document);

        // Process statuses
        const statuses = members.map(member => {
            const memberDocs = allDocs.filter(d => d.ownerId === member.id);
            const status: EssentialDocStatus = {
                memberId: member.id,
                name: member.name,
                role: member.type,
                docs: {},
            };
            (settings.essentialDocs || []).forEach(docName => {
                status.docs[docName] = {
                    name: docName,
                    hasIt: memberDocs.some(d => d.category === 'identificacion' && docName.toLowerCase().includes('dni')) || // Simple logic, can be improved
                           memberDocs.some(d => d.category === 'medico' && docName.toLowerCase().includes('médico')) ||
                           memberDocs.some(d => d.name.toLowerCase().includes(docName.toLowerCase().substring(0,5)))
                };
            });
            return status;
        });
        setDocStatuses(statuses);

      } catch (error) {
        console.error("Error fetching essential docs data:", error);
        toast({ variant: "destructive", title: t('common.error'), description: "No se pudieron cargar los datos." });
      }
      setLoading(false);
    };

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
  }, [t, toast]);
  
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
    
    // If filtering by a specific doc, only show pending for that doc.
    if(filterDoc !== 'all') {
        return docMatch;
    }

    return statusMatch;
  });
  
  const handleAddEssentialDoc = async () => {
    if (!clubId || !newDocName.trim()) return;
    setSaving(true);
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await updateDoc(settingsRef, {
            essentialDocs: arrayUnion(newDocName.trim())
        });
        setEssentialDocs(prev => [...prev, newDocName.trim()]);
        setNewDocName("");
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
        setEssentialDocs(prev => prev.filter(d => d !== docName));
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
  
  const handleRequestMissingDocs = async () => {
    if (!clubId || selectedMembers.length === 0) return;
    
    setIsSending(true);
    let totalRequestsSent = 0;
    
    for (const memberId of selectedMembers) {
      const memberStatus = docStatuses.find(ds => ds.memberId === memberId);
      const memberData = allMembers.find(m => m.id === memberId);
      if (!memberStatus || !memberData || !memberData.email) continue;

      const missingDocs = Object.values(memberStatus.docs).filter(d => !d.hasIt).map(d => d.name);
      
      if (missingDocs.length > 0) {
        // A request is sent for each missing document for simplicity
        // This could be batched into a single email in a future improvement
        const docTitle = t('clubFiles.essentialDocs.missingDocsTitle', { docs: missingDocs.join(', ') });
        
        const formData = new FormData();
        formData.append('clubId', clubId);
        formData.append('members', JSON.stringify([{ id: memberData.id, name: memberData.name, email: memberData.email }]));
        formData.append('doc-title', docTitle);
        formData.append('message', t('clubFiles.essentialDocs.requestMessage', { name: memberData.name, docs: missingDocs.join(', ') }));

        const result = await requestFilesAction(formData);
        if (result.success) {
            totalRequestsSent += result.count || 0;
        }
      }
    }
    
    if (totalRequestsSent > 0) {
        toast({ title: t('clubFiles.essentialDocs.requestsSent'), description: t('clubFiles.essentialDocs.requestsSentDesc', { count: totalRequestsSent })});
    } else {
        toast({ variant: "destructive", title: t('common.error'), description: t('clubFiles.essentialDocs.errors.noRequestsSent') });
    }
    
    setIsSending(false);
    setSelectedMembers([]);
  }

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
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                    <CardTitle>{t('clubFiles.essentialDocs.statusTitle')}</CardTitle>
                    <CardDescription>{t('clubFiles.essentialDocs.statusDescription')}</CardDescription>
                 </div>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
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
                    <Button onClick={handleRequestMissingDocs} disabled={selectedMembers.length === 0 || isSending} className="w-full sm:w-auto">
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                        {t('clubFiles.essentialDocs.requestSelected', { count: selectedMembers.length })}
                    </Button>
                 </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
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
                                         <Tooltip>
                                            <TooltipTrigger>
                                                {status.docs[docName]?.hasIt ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto"/>
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-red-500 mx-auto"/>
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{status.docs[docName]?.hasIt ? t('clubFiles.essentialDocs.status.delivered') : t('clubFiles.essentialDocs.status.pending')}</p>
                                            </TooltipContent>
                                        </Tooltip>
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
    </TooltipProvider>
  );
}

    