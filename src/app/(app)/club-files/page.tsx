
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
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import type { Document, Player, Coach, Staff } from "@/lib/types";
import {
  PlusCircle,
  Loader2,
  Trash2,
  Download,
  Upload,
  File as FileIcon,
  User as UserIcon,
  Check,
  ChevronsUpDown,
  Tag,
  Search,
  Send,
  FolderOpen,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { es, ca } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileRequestSender } from "@/components/file-request-sender";
import { RequestHistory } from "@/components/request-history";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/components/i18n-provider";

type Owner = {
    id: string;
    name: string;
    role?: string;
}

function DocumentsList() {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [documentNameToSave, setDocumentNameToSave] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isOwnerPopoverOpen, setIsOwnerPopoverOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwnerId, setFilterOwnerId] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const docCategoriesRaw = t('clubFiles.categories', { returnObjects: true });
  const docCategories = Array.isArray(docCategoriesRaw) ? docCategoriesRaw : [];

  const fetchData = async (currentClubId: string) => {
    setLoading(true);
    try {
      const docsQuery = query(collection(db, "clubs", currentClubId, "documents"), orderBy("createdAt", "desc"));
      const docsSnapshot = await getDocs(docsQuery);
      
      const docsListPromises = docsSnapshot.docs.map(async (docData) => {
          const doc = { id: docData.id, ...docData.data() } as Document;
          if (doc.path && !doc.url) {
              try {
                  const url = await getDownloadURL(ref(storage, doc.path));
                  doc.url = url;
              } catch (e) {
                  console.warn(`Could not get download URL for ${doc.path}`, e);
                  doc.url = '#'; // Assign a fallback URL
              }
          }
          return doc;
      });

      const docsList = await Promise.all(docsListPromises);

      setDocuments(docsList);
      
      const allOwners: Owner[] = [{ id: 'club', name: t('clubFiles.club') }];
      
      const playersSnap = await getDocs(collection(db, "clubs", currentClubId, "players"));
      playersSnap.forEach(doc => {
          const data = doc.data() as Player;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}`, role: t('clubFiles.roles.player') });
      });
      
      const coachesSnap = await getDocs(collection(db, "clubs", currentClubId, "coaches"));
      coachesSnap.forEach(doc => {
          const data = doc.data() as Coach;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}`, role: t('clubFiles.roles.coach') });
      });

      const staffSnap = await getDocs(collection(db, "clubs", currentClubId, "staff"));
       staffSnap.forEach(doc => {
          const data = doc.data() as Staff;
          allOwners.push({ id: doc.id, name: `${data.name} ${data.lastName}`, role: data.role });
      });

      const sortedOwners = allOwners.sort((a, b) => {
          if (a.id === 'club') return -1;
          if (b.id === 'club') return 1;
          return a.name.localeCompare(b.name);
      });

      setOwners(sortedOwners);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('clubFiles.errors.loadError'),
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
  }, [toast, t]);

  useEffect(() => {
    let filtered = documents;
    
    if (searchTerm) {
        filtered = filtered.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterOwnerId !== "all") {
        filtered = filtered.filter(doc => doc.ownerId === filterOwnerId);
    }
    if (filterCategory !== "all") {
        filtered = filtered.filter(doc => doc.category === filterCategory);
    }
    setFilteredDocuments(filtered);
  }, [searchTerm, filterOwnerId, filterCategory, documents]);


  const handleFileUpload = async () => {
    if (!clubId || !auth.currentUser) {
        toast({ variant: "destructive", title: t('clubFiles.errors.authErrorTitle'), description: t('clubFiles.errors.authErrorDesc')});
        return;
    }
    if (!fileToUpload || !documentNameToSave.trim() || !selectedCategory || !selectedOwner) {
      toast({ variant: "destructive", title: t('clubFiles.errors.missingDataTitle'), description: t('clubFiles.errors.missingDataDesc')});
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileToUpload.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: t('clubFiles.errors.fileTooLargeTitle'), description: t('clubFiles.errors.fileTooLargeDesc')});
        return;
    }

    setSaving(true);
    const owner = selectedOwner;

    try {
      const filePath = `club-documents/${clubId}/${owner.id}/${uuidv4()}-${fileToUpload.name}`;
      const fileRef = ref(storage, filePath);
      
      await uploadBytes(fileRef, fileToUpload);
      
      const url = await getDownloadURL(fileRef);
      
      const newDocumentData: Omit<Document, "id" | "url"> = {
        name: documentNameToSave.trim(),
        path: filePath,
        createdAt: Timestamp.now(),
        ownerId: owner.id,
        ownerName: owner.name,
        category: selectedCategory,
      };
      await addDoc(collection(db, "clubs", clubId, "documents"), newDocumentData);

      toast({
        title: t('clubFiles.uploadSuccessTitle'),
        description: t('clubFiles.uploadSuccessDesc', { documentName: documentNameToSave }),
      });
      
      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setDocumentNameToSave("");
      setSelectedOwner(null);
      setSelectedCategory("");
      
      if(clubId) fetchData(clubId);

    } catch (error: any) {
      console.error("Error uploading file:", error);
      let errorMessage = t('clubFiles.errors.uploadErrorDesc');
      if (error.code === 'storage/unauthorized') {
        errorMessage = t('clubFiles.errors.uploadErrorUnauthorized');
      }
      toast({ variant: "destructive", title: t('clubFiles.errors.uploadErrorTitle'), description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!clubId || !docToDelete) return;
    setSaving(true);

    try {
      const fileRef = ref(storage, docToDelete.path);
      await deleteObject(fileRef);

      await deleteDoc(doc(db, "clubs", clubId, "documents", docToDelete.id!));
      
      toast({
        title: t('clubFiles.deleteSuccessTitle'),
        description: t('clubFiles.deleteSuccessDesc', { documentName: docToDelete.name }),
      });

      setDocToDelete(null);
      if (clubId) fetchData(clubId);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('clubFiles.errors.deleteError'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <CardTitle>{t('clubFiles.allDocumentsTitle')}</CardTitle>
            <CardDescription>
              {t('clubFiles.allDocumentsDesc')}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder={t('clubFiles.searchPlaceholder')}
                      className="pl-8 w-full sm:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
               <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder={t('clubFiles.filterByCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('clubFiles.allCategories')}</SelectItem>
                      {docCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
               <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder={t('clubFiles.filterByOwner')} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('clubFiles.allOwners')}</SelectItem>
                      {owners.map(owner => (
                          <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Dialog
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('clubFiles.uploadButton')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('clubFiles.uploadModal.title')}</DialogTitle>
                    <DialogDescription>
                      {t('clubFiles.uploadModal.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-name">{t('clubFiles.uploadModal.nameLabel')} *</Label>
                      <Input
                        id="doc-name"
                        placeholder={t('clubFiles.uploadModal.namePlaceholder')}
                        value={documentNameToSave}
                        onChange={(e) => setDocumentNameToSave(e.target.value)}
                      />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="doc-category">{t('clubFiles.uploadModal.categoryLabel')} *</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger id="doc-category">
                            <SelectValue placeholder={t('clubFiles.uploadModal.categoryPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {docCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    <div className="space-y-2">
                      <Label>{t('clubFiles.uploadModal.assignLabel')} *</Label>
                      <Popover open={isOwnerPopoverOpen} onOpenChange={setIsOwnerPopoverOpen}>
                          <PopoverTrigger asChild>
                          <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isOwnerPopoverOpen}
                              className="w-full justify-between"
                          >
                              {selectedOwner
                              ? selectedOwner.name
                              : t('clubFiles.uploadModal.ownerPlaceholder')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder={t('clubFiles.uploadModal.searchOwnerPlaceholder')} />
                               <CommandList>
                                  <CommandEmpty>{t('clubFiles.uploadModal.noOwnerFound')}</CommandEmpty>
                                  <CommandGroup>
                                  {owners.map((owner) => (
                                      <CommandItem
                                      key={owner.id}
                                      value={owner.name}
                                      onSelect={() => {
                                          setSelectedOwner(owner);
                                          setIsOwnerPopoverOpen(false);
                                      }}
                                      >
                                      <Check
                                          className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedOwner?.id === owner.id ? "opacity-100" : "opacity-0"
                                          )}
                                      />
                                      {owner.name}
                                      {owner.role && <span className="ml-2 text-xs text-muted-foreground">({owner.role})</span>}
                                      </CommandItem>
                                  ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                          </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-file">{t('clubFiles.uploadModal.fileLabel')} *</Label>
                      <Input
                        id="doc-file"
                        type="file"
                        onChange={(e) =>
                          setFileToUpload(e.target.files?.[0] || null)
                        }
                      />
                      <p className="text-xs text-muted-foreground">{t('clubFiles.uploadModal.fileHint')}</p>
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
                      {t('clubFiles.uploadModal.saveButton')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
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
                    <TableHead>{t('clubFiles.table.fileName')}</TableHead>
                    <TableHead>{t('clubFiles.table.category')}</TableHead>
                    <TableHead>{t('clubFiles.table.owner')}</TableHead>
                    <TableHead>{t('clubFiles.table.uploadDate')}</TableHead>
                    <TableHead className="text-right">{t('clubFiles.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center justify-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground"/>
                          {doc.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{docCategories.find(c => c.value === doc.category)?.label || t('clubFiles.noCategory')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            {doc.ownerName || t('clubFiles.club')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(doc.createdAt.toDate(), "d 'de' LLLL 'de' yyyy", { locale: locale === 'ca' ? ca : es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon" className="mr-2" disabled={!doc.url}>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => setDocToDelete(doc)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t('clubFiles.noDocuments')}
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
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clubFiles.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clubFiles.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('teams.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ClubFilesPage() {
    const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          {t('clubFiles.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('clubFiles.description')}
        </p>
      </div>
      <Tabs defaultValue="documents">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents"><FolderOpen className="mr-2 h-4 w-4"/>{t('clubFiles.tabs.documents')}</TabsTrigger>
          <TabsTrigger value="request"><Send className="mr-2 h-4 w-4"/>{t('clubFiles.tabs.request')}</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-6">
            <DocumentsList/>
        </TabsContent>
        <TabsContent value="request" className="mt-6 space-y-6">
            <FileRequestSender />
            <Separator />
            <RequestHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
