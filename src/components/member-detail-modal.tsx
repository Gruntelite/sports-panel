
"use client";

import * as React from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Player, Coach, Staff, Socio } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, User, Contact, Shield, CircleDollarSign, Briefcase, FileText } from "lucide-react";
import { Separator } from "./ui/separator";

type Member = Player | Coach | Staff | Socio;
type MemberType = 'player' | 'coach' | 'staff' | 'socio';

interface MemberDetailModalProps {
  member: Member | null;
  memberType: MemberType;
  onClose: () => void;
  onEdit: () => void;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null | boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue: React.ReactNode = value;

    if (typeof value === 'boolean') {
        displayValue = value ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;
    }
     if (label === "Fecha de Nacimiento" && typeof value === 'string') {
        const date = parseISO(value);
        const age = new Date().getFullYear() - date.getFullYear();
        displayValue = `${format(date, "d 'de' LLLL 'de' yyyy", { locale: es })} (${age} años)`;
     } else if (label.includes("Fecha") && typeof value === 'string') {
         displayValue = format(parseISO(value), "d 'de' LLLL 'de' yyyy", { locale: es });
     }


    return (
        <div className="flex justify-between items-center py-2 border-b">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-right">{displayValue}</dd>
        </div>
    );
};

export function MemberDetailModal({ member, memberType, onClose, onEdit }: MemberDetailModalProps) {
    if (!member) return null;

    const getFieldGroups = () => {
        switch(memberType) {
            case 'player':
                const p = member as Player;
                return [
                    { title: "Datos Personales", icon: User, fields: [
                        { label: "NIF/NIE", value: p.dni }, { label: "Fecha de Nacimiento", value: p.birthDate }, { label: "Sexo", value: p.sex }, { label: "Nacionalidad", value: p.nationality }, { label: "Nº Tarjeta Sanitaria", value: p.healthCardNumber}, { label: "Dirección", value: `${p.address}, ${p.postalCode}, ${p.city}`}, { label: "Fecha de Alta", value: p.startDate },
                    ]},
                    { title: "Datos de Contacto", icon: Contact, fields: [
                        { label: "Tutor/a Principal", value: p.isOwnTutor ? 'El propio jugador' : `${p.tutorName} ${p.tutorLastName}` }, { label: "Email de Contacto", value: p.tutorEmail }, { label: "Teléfono de Contacto", value: p.tutorPhone },
                    ]},
                    { title: "Datos Deportivos", icon: Shield, fields: [
                        { label: "Equipo", value: p.teamName }, { label: "Dorsal", value: p.jerseyNumber }, { label: "Posición", value: p.position }, { label: "Talla Equipación", value: p.kitSize },
                    ]},
                    { title: "Datos de Pago", icon: CircleDollarSign, fields: [
                        { label: "IBAN", value: p.iban }, { label: "Cuota Mensual", value: p.monthlyFee ? `${p.monthlyFee}€` : 'N/A' },
                    ]},
                    { title: "Autorizaciones y Revisiones", icon: FileText, fields: [
                        { label: "Revisión Médica", value: p.medicalCheckCompleted },
                    ]}
                ];
            case 'coach':
                 const c = member as Coach;
                 return [
                    { title: "Datos Personales", icon: User, fields: [
                        { label: "NIF/NIE", value: c.dni }, { label: "Fecha de Nacimiento", value: c.birthDate }, { label: "Sexo", value: c.sex }, { label: "Nacionalidad", value: c.nationality }, { label: "Dirección", value: `${c.address}, ${c.postalCode}, ${c.city}`}, { label: "Fecha de Alta", value: c.startDate },
                    ]},
                    { title: "Datos de Contacto", icon: Contact, fields: [
                        { label: "Email", value: c.email }, { label: "Teléfono", value: c.phone },
                    ]},
                    { title: "Datos Profesionales", icon: Briefcase, fields: [
                        { label: "Cargo", value: c.role }, { label: "Equipo Asignado", value: c.teamName }, { label: "Talla Equipación", value: c.kitSize },
                    ]},
                     { title: "Datos de Pago", icon: CircleDollarSign, fields: [
                        { label: "IBAN", value: c.iban }, { label: "Pago Mensual", value: c.monthlyPayment ? `${c.monthlyPayment}€` : 'N/A' },
                    ]},
                 ];
            case 'staff':
                 const s = member as Staff;
                 return [
                      { title: "Datos Personales", icon: User, fields: [{ label: "Email", value: s.email }, { label: "Teléfono", value: s.phone } ]},
                      { title: "Datos Profesionales", icon: Briefcase, fields: [{ label: "Cargo", value: s.role }]},
                 ];
            case 'socio':
                 const so = member as Socio;
                 return [
                     { title: "Datos Personales", icon: User, fields: [{ label: "Email", value: so.email }, { label: "Teléfono", value: so.phone }, { label: "NIF", value: so.dni } ]},
                     { title: "Datos de Socio", icon: Handshake, fields: [{ label: "Número de Socio", value: so.socioNumber }, { label: "Tipo de Cuota", value: so.paymentType }, { label: "Importe Cuota", value: `${so.fee}€` }]},
                 ];
        }
    }

    const fieldGroups = getFieldGroups();

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="foto persona" />
              <AvatarFallback className="text-3xl">
                {member.name?.charAt(0)}
                {member.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold font-headline">{member.name} {member.lastName}</DialogTitle>
              <div className="flex items-center gap-4 text-muted-foreground">
                <Badge variant="secondary" className="text-base">{member.role || 'Socio'}</Badge>
                {(member as Player).jerseyNumber && <span>Nº {(member as Player).jerseyNumber}</span>}
                {(member as Player).sex && <span>{(member as Player).sex}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
               {fieldGroups.map(group => (
                   <div key={group.title} className="space-y-3">
                       <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                           <group.icon className="h-5 w-5"/>
                           {group.title}
                       </h3>
                       <dl>
                         {group.fields.map(field => <DetailItem key={field.label} label={field.label} value={field.value} />)}
                       </dl>
                   </div>
               ))}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={onEdit}>Editar Ficha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
