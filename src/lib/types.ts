

import type { Timestamp } from "firebase/firestore";

export type Document = {
    id?: string;
    name: string;
    url: string;
    path: string;
    createdAt: Timestamp;
    ownerId?: string;
    ownerName?: string;
    category?: string;
}

export type Team = {
    id: string;
    name: string;
    minAge?: number;
    maxAge?: number;
    image: string;
    hint: string;
    players: number;
    coaches: number;
    defaultMonthlyFee?: number;
};

export type Player = {
    id: string;
    name: string;
    lastName: string;
    birthDate?: string;
    dni?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    tutorEmail: string; // Made mandatory
    tutorPhone?: string;
    iban?: string;
    teamId?: string;
    teamName?: string; 
    jerseyNumber?: number;
    position?: string;
    avatar?: string;
    monthlyFee?: number;
    paymentStatus?: 'paid' | 'pending' | 'overdue';
    isOwnTutor?: boolean;
    tutorName?: string;
    tutorLastName?: string;
    tutorDni?: string;
    hasMissingData?: boolean;
    kitSize?: string;
    documents?: Document[];
}

export type Coach = {
    id: string;
    name:string;
    lastName: string;
    email: string; // Made mandatory
    phone?: string;
    teamId?: string;
    teamName?: string;
    avatar?: string;
    birthDate?: string;
    dni?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    iban?: string;
    isOwnTutor?: boolean;
    tutorName?: string;
    tutorLastName?: string;
    tutorDni?: string;
    hasMissingData?: boolean;
    monthlyPayment?: number;
    kitSize?: string;
    documents?: Document[];
}

export type Staff = {
    id: string;
    name: string;
    lastName: string;
    role: string;
    email?: string;
    phone?: string;
    avatar?: string;
    hasMissingData?: boolean;
    staffId?: string;
}

export type TeamMember = {
    id: string;
    name: string;
    role: 'Jugador' | 'Entrenador' | 'Staff';
    jerseyNumber?: number | string;
    avatar?: string;
    hasMissingData?: boolean;
    data: Player | Coach | Staff;
}

export type ClubMember = {
    id: string;
    name: string;
    type: 'Jugador' | 'Entrenador' | 'Staff';
    data: Player | Coach | Staff;
    teamId?: string;
};

export type Contact = {
    name: string;
    email: string;
    hasAccount: boolean;
}

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'super-admin' | 'Admin' | 'Entrenador' | 'Family' | 'Staff';
    avatar?: string;
    authUid?: string; // To link to Firebase Auth user if needed
    playerId?: string;
    coachId?: string;
    staffId?: string;
}

export type OneTimePayment = {
    id?: string;
    concept: string;
    description?: string;
    amount: number | string;
    issueDate: string;
    targetTeamIds: string[];
    targetUserIds: string[];
}

export type TemplateHistoryItem = {
    id: string;
    subject: string;
    body: string;
    date: Date;
}

export type FormHistoryItem = {
    id: string;
    title: string;
    url: string;
    date: Date;
}

export type CalendarEvent = {
    id: string;
    title: string;
    start: Timestamp;
    end: Timestamp;
    type: 'Entrenamiento' | 'Partido' | 'Evento' | 'Otro';
    location?: string;
    teamId?: string;
    teamName?: string;
    color: string;
    isTemplateBased?: boolean;
    description?: string;
};

export type ScheduleTemplate = {
  id: string;
  name: string;
  venues: {id: string, name: string}[];
  weeklySchedule: {
    Lunes: any[];
    Martes: any[];
    Miércoles: any[];
    Jueves: any[];
    Viernes: any[];
    Sábado: any[];
    Domingo: any[];
  };
  startTime?: string;
  endTime?: string;
  color?: string;
};

export type Sponsorship = {
    id: string;
    sponsorName: string;
    amount: number;
    frequency: 'monthly' | 'annual';
    description?: string;
    excludedMonths?: number[];
}

export type RecurringExpense = {
    id: string;
    title: string;
    amount: number;
    excludedMonths?: number[];
}

export type OneOffExpense = {
    id: string;
    title: string;
    description?: string;
    amount: number;
    date: string;
}

export type ClubSettings = {
    feeExcludedMonths?: number[];
    coachFeeExcludedMonths?: number[];
    fromEmail?: string;
    sendgridApiKey?: string;
    senderVerificationStatus?: 'unconfigured' | 'pending' | 'verified' | 'failed';
}
