
"use client";

import * as React from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es, ca } from "date-fns/locale";
import type { Player, Coach, Staff, Socio, CustomFieldDef, Document } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, User, Contact, Shield, Briefcase, Handshake, FolderArchive, Download } from "lucide-react";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { useTranslation } from "./i18n-provider";

const DetailItem = ({ label, value, isSubtitle }: { label: string; value?: string | number | null | boolean; isSubtitle?: boolean }) => {
    const { t, locale } = useTranslation();
    if (isSubtitle) {
        return <h4 className="font-semibold text-primary pt-4 pb-2 border-b">{label}</h4>
    }
    
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue: React.ReactNode = value;

    if (typeof value === 'boolean') {
        displayValue = value ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;
    }
     if (label.toLowerCase().includes(t('memberDetail.fields.birthDate').toLowerCase()) && typeof value === 'string') {
        try {
            const date = parseISO(value);
            const age = new Date().getFullYear() - date.getFullYear();
            displayValue = `${format(date, "d 'de' LLLL 'de' yyyy", { locale: locale === 'ca' ? ca : es })} (${age} ${t('memberDetail.years')})`;
        } catch (e) {
            displayValue = value;
        }
     } else if (label.toLowerCase().includes(t('memberDetail.fields.date').toLowerCase()) && typeof value === 'string') {
         try {
            const date = parseISO(value);
            displayValue = format(date, "d 'de' LLLL 'de' yyyy", { locale: locale === 'ca' ? ca : es });
        } catch (e) {
            displayValue = value;
        }
     }


    return (
        <div className="flex justify-between items-start py-2 border-b">
            <dt className="text-sm text-muted-foreground pr-2">{label}</dt>
            <dd className="text-sm font-medium text-right">{displayValue}</dd>
        </div>
    );
};

export function MemberDetailModal({ member, memberType, customFieldDefs = [], documents = [], onClose, onEdit }: {
    member: Player | Coach | Staff | Socio | null;
    memberType: 'player' | 'coach' | 'staff' | 'socio';
    customFieldDefs: CustomFieldDef[];
    documents?: Document[];
    onClose: () => void;
    onEdit: () => void;
}) {
    const { t } = useTranslation();
    if (!member) return null;

    const getFieldGroups = () => {
        const customFields = (member as any).customFields || {};
        const customFieldsItems = customFieldDefs
            .filter(def => customFields[def.id])
            .map(def => ({
                label: def.name,
                value: customFields[def.id]
            }));

        let groups = [];
        
        switch(memberType) {
            case 'player':
                const p = member as Player;
                groups = [
                    { title: t('memberDetail.groups.personal'), icon: User, fields: [
                        { label: t('memberDetail.fields.dni'), value: p.dni }, { label: t('memberDetail.fields.birthDate'), value: p.birthDate }, { label: t('memberDetail.fields.sex'), value: p.sex }, { label: t('memberDetail.fields.nationality'), value: p.nationality }, { label: t('memberDetail.fields.healthCard'), value: p.healthCardNumber}, { label: t('memberDetail.fields.address'), value: `${p.address || ''}, ${p.postalCode || ''}, ${p.city || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '')}, { label: t('memberDetail.fields.startDate'), value: p.startDate },
                    ]},
                    { title: t('memberDetail.groups.contact'), icon: Contact, fields: [
                        { label: t('memberDetail.fields.tutor'), value: p.isOwnTutor ? t('memberDetail.fields.ownPlayer') : `${p.tutorName} ${p.tutorLastName}` }, { label: t('memberDetail.fields.contactEmail'), value: p.tutorEmail }, { label: t('memberDetail.fields.contactPhone'), value: p.tutorPhone },
                        { label: t('memberDetail.fields.paymentData'), isSubtitle: true },
                        { label: t('memberDetail.fields.iban'), value: p.iban }, { label: t('memberDetail.fields.monthlyFee'), value: p.monthlyFee ? `${p.monthlyFee}€` : 'N/A' },
                    ]},
                    { title: t('memberDetail.groups.sports'), icon: Shield, fields: [
                        { label: t('memberDetail.fields.team'), value: p.teamName }, { label: t('memberDetail.fields.jersey'), value: p.jerseyNumber }, { label: t('memberDetail.fields.position'), value: p.position }, { label: t('memberDetail.fields.kitSize'), value: p.kitSize },
                        ...(customFieldsItems.length > 0 ? [{ label: t('memberDetail.groups.other'), isSubtitle: true }, ...customFieldsItems] : [])
                    ]},
                ];
                return groups;
            case 'coach':
                 const c = member as Coach;
                 groups = [
                    { title: t('memberDetail.groups.personal'), icon: User, fields: [
                        { label: t('memberDetail.fields.dni'), value: c.dni }, { label: t('memberDetail.fields.birthDate'), value: c.birthDate }, { label: t('memberDetail.fields.sex'), value: c.sex }, { label: t('memberDetail.fields.nationality'), value: c.nationality }, { label: t('memberDetail.fields.address'), value: `${c.address || ''}, ${c.postalCode || ''}, ${c.city || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '')}, { label: t('memberDetail.fields.startDate'), value: c.startDate },
                    ]},
                    { title: t('memberDetail.groups.contact'), icon: Contact, fields: [
                        { label: t('memberDetail.fields.email'), value: c.email }, { label: t('memberDetail.fields.phone'), value: c.phone },
                        { label: t('memberDetail.fields.paymentData'), isSubtitle: true },
                        { label: t('memberDetail.fields.iban'), value: c.iban }, { label: t('memberDetail.fields.monthlyPayment'), value: c.monthlyPayment ? `${c.monthlyPayment}€` : 'N/A' },
                    ]},
                    { title: t('memberDetail.groups.professional'), icon: Briefcase, fields: [
                        { label: t('memberDetail.fields.role'), value: c.role }, { label: t('memberDetail.fields.teamAssigned'), value: c.teamName }, { label: t('memberDetail.fields.kitSize'), value: c.kitSize },
                        ...(customFieldsItems.length > 0 ? [{ label: t('memberDetail.groups.other'), isSubtitle: true }, ...customFieldsItems] : [])
                    ]},
                 ];
                 return groups;
            case 'staff':
                 const s = member as Staff;
                 groups = [
                      { title: t('memberDetail.groups.personal'), icon: User, fields: [{ label: t('memberDetail.fields.email'), value: s.email }, { label: t('memberDetail.fields.phone'), value: s.phone } ]},
                      { title: t('memberDetail.groups.professional'), icon: Briefcase, fields: [{ label: t('memberDetail.fields.role'), value: s.role },
                         ...(customFieldsItems.length > 0 ? [{ label: t('memberDetail.groups.other'), isSubtitle: true }, ...customFieldsItems] : [])
                      ]},
                 ];
                 return groups;
            case 'socio':
                 const so = member as Socio;
                 groups = [
                     { title: t('memberDetail.groups.personal'), icon: User, fields: [{ label: t('memberDetail.fields.email'), value: so.email }, { label: t('memberDetail.fields.phone'), value: so.phone }, { label: t('memberDetail.fields.dni'), value: so.dni } ]},
                     { title: t('memberDetail.groups.socio'), icon: Handshake, fields: [{ label: t('memberDetail.fields.socioNumber'), value: so.socioNumber }, { label: t('memberDetail.fields.feeType'), value: so.paymentType }, { label: t('memberDetail.fields.feeAmount'), value: `${so.fee}€` },
                        ...(customFieldsItems.length > 0 ? [{ label: t('memberDetail.groups.other'), isSubtitle: true }, ...customFieldsItems] : [])
                     ]},
                 ];
                 return groups;
        }
    }

    const fieldGroups = getFieldGroups();
    
    const roleMap: {[key: string]: string} = {
        player: t('memberDetail.roles.player'),
        coach: t('memberDetail.roles.coach'),
        staff: t('memberDetail.roles.staff'),
        socio: t('memberDetail.roles.socio')
    }

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] grid grid-rows-[auto_1fr_auto]">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
              <AvatarFallback className="text-3xl">
                {member.name?.charAt(0)}
                {member.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold font-headline">{member.name} {member.lastName}</DialogTitle>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-muted-foreground">
                <Badge variant="secondary" className="text-base">{member.role || roleMap[memberType]}</Badge>
                {(member as Player).jerseyNumber && <span>Nº {(member as Player).jerseyNumber}</span>}
                {(member as Player).sex && <span>{(member as Player).sex}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="overflow-y-auto -mr-6 pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 py-4">
               {fieldGroups.map(group => group.fields.length > 0 && (
                   <div key={group.title} className="space-y-3">
                       <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                           <group.icon className="h-5 w-5"/>
                           {group.title}
                       </h3>
                       <dl>
                         {group.fields.map((field, index) => <DetailItem key={`${field.label}-${index}`} label={field.label} value={(field as any).value} isSubtitle={(field as any).isSubtitle} />)}
                       </dl>
                   </div>
               ))}
               {documents && documents.length > 0 && (
                 <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                        <FolderArchive className="h-5 w-5"/>
                        {t('memberDetail.attachedDocuments')}
                    </h3>
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 border rounded-md">
                                <span className="text-sm font-medium">{doc.name}</span>
                                <Button asChild variant="outline" size="icon">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4"/>
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </div>
                 </div>
               )}
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>{t('memberDetail.close')}</Button>
          <Button onClick={onEdit}>{t('memberDetail.edit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
