
"use client";

import * as React from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Player, Coach, Staff, Socio, CustomFieldDef, Document } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, User, Contact, Shield, Briefcase, Handshake, FolderArchive, Download } from "lucide-react";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

const DetailItem = ({ label, value, isSubtitle }: { label: string; value?: string | number | null | boolean; isSubtitle?: boolean }) => {
    if (isSubtitle) {
        return <h4 className="font-semibold text-primary pt-4 pb-2 border-b">{label}</h4>
    }
    
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue: React.ReactNode = value;

    if (typeof value === 'boolean') {
        displayValue = value ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;
    }
     if (label.toLowerCase().includes("fecha") && typeof value === 'string') {
        try {
            const date = parseISO(value);
            const age = new Date().getFullYear() - date.getFullYear();
            if (label.toLowerCase().includes("nacimiento")) {
                 displayValue = `${format(date, "d 'de' LLLL 'de' yyyy", { locale: es })} (${age} años)`;
            } else {
                 displayValue = format(date, "d 'de' LLLL 'de' yyyy", { locale: es });
            }
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
                    { title: "Datos Personales", icon: User, fields: [
                        { label: "NIF/NIE", value: p.dni }, { label: "Fecha de Nacimiento", value: p.birthDate }, { label: "Sexo", value: p.sex }, { label: "Nacionalidad", value: p.nationality }, { label: "Nº Tarjeta Sanitaria", value: p.healthCardNumber}, { label: "Dirección", value: `${p.address || ''}, ${p.postalCode || ''}, ${p.city || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '')}, { label: "Fecha de Alta", value: p.startDate },
                    ]},
                    { title: "Datos de Contacto", icon: Contact, fields: [
                        { label: "Tutor/a Principal", value: p.isOwnTutor ? 'El propio jugador' : `${p.tutorName} ${p.tutorLastName}` }, { label: "Email de Contacto", value: p.tutorEmail }, { label: "Teléfono de Contacto", value: p.tutorPhone },
                        { label: "Datos de Pago", isSubtitle: true },
                        { label: "IBAN", value: p.iban }, { label: "Cuota Mensual", value: p.monthlyFee ? `${p.monthlyFee}€` : 'N/A' },
                    ]},
                    { title: "Datos Deportivos", icon: Shield, fields: [
                        { label: "Equipo", value: p.teamName }, { label: "Dorsal", value: p.jerseyNumber }, { label: "Posición", value: p.position }, { label: "Talla Equipación", value: p.kitSize },
                        ...(customFieldsItems.length > 0 ? [{ label: "Otros Datos", isSubtitle: true }, ...customFieldsItems] : [])
                    ]},
                ];
                return groups;
            case 'coach':
                 const c = member as Coach;
                 groups = [
                    { title: "Datos Personales", icon: User, fields: [
                        { label: "NIF/NIE", value: c.dni }, { label: "Fecha de Nacimiento", value: c.birthDate }, { label: "Sexo", value: c.sex }, { label: "Nacionalidad", value: c.nationality }, { label: "Dirección", value: `${c.address || ''}, ${c.postalCode || ''}, ${c.city || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '')}, { label: "Fecha de Alta", value: c.startDate },
                    ]},
                    { title: "Datos de Contacto", icon: Contact, fields: [
                        { label: "Email", value: c.email }, { label: "Teléfono", value: c.phone },
                        { label: "Datos de Pago", isSubtitle: true },
                        { label: "IBAN", value: c.iban }, { label: "Pago Mensual", value: c.monthlyPayment ? `${c.monthlyPayment}€` : 'N/A' },
                    ]},
                    { title: "Datos Profesionales", icon: Briefcase, fields: [
                        { label: "Cargo", value: c.role }, { label: "Equipo Asignado", value: c.teamName }, { label: "Talla Equipación", value: c.kitSize },
                        ...(customFieldsItems.length > 0 ? [{ label: "Otros Datos", isSubtitle: true }, ...customFieldsItems] : [])
                    ]},
                 ];
                 return groups;
            case 'staff':
                 const s = member as Staff;
                 groups = [
                      { title: "Datos Personales", icon: User, fields: [{ label: "Email", value: s.email }, { label: "Teléfono", value: s.phone } ]},
                      { title: "Datos Profesionales", icon: Briefcase, fields: [{ label: "Cargo", value: s.role },
                         ...(customFieldsItems.length > 0 ? [{ label: "Otros Datos", isSubtitle: true }, ...customFieldsItems] : [])
                      ]},
                 ];
                 return groups;
            case 'socio':
                 const so = member as Socio;
                 groups = [
                     { title: "Datos Personales", icon: User, fields: [{ label: "Email", value: so.email }, { label: "Teléfono", value: so.phone }, { label: "NIF", value: so.dni } ]},
                     { title: "Datos de Socio", icon: Handshake, fields: [{ label: "Número de Socio", value: so.socioNumber }, { label: "Tipo de Cuota", value: so.paymentType }, { label: "Importe Cuota", value: `${so.fee}€` },
                        ...(customFieldsItems.length > 0 ? [{ label: "Otros Datos", isSubtitle: true }, ...customFieldsItems] : [])
                     ]},
                 ];
                 return groups;
        }
    }

    const fieldGroups = getFieldGroups();
    
    const roleMap: {[key: string]: string} = {
        player: 'Jugador',
        coach: 'Entrenador',
        staff: 'Staff',
        socio: 'Socio'
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
                        Documentos Adjuntos
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
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={onEdit}>Editar Ficha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
