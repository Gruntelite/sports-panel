
import type { Timestamp } from "firebase/firestore";

export type Document = {
    id?: string;
    name: string;
    url?: string;
    path: string;
    createdAt: Timestamp;
    ownerId?: string;
    ownerName?: string;
    category?: string;
}

export type Protocol = {
    id?: string;
    name: string;
    url: string;
    path: string;
    createdAt: Timestamp;
}

export type Team = {
    id: string;
    name: string;
    level?: string;
    minAge?: number;
    maxAge?: number;
    image: string;
    hint: string;
    players: number;
    coaches: number;
    defaultMonthlyFee?: number;
    order?: number;
};

export type CustomFieldDef = {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: string[];
    appliesTo: ('player' | 'coach' | 'staff' | 'socio')[];
};

export type Interruption = {
    id: string;
    startDate: string;
    endDate: string;
}

export type Player = {
    id: string;
    name: string;
    lastName: string;
    sex?: 'masculino' | 'femenino';
    season?: string;
    birthDate?: string;
    dni?: string;
    nationality?: string;
    healthCardNumber?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    tutorEmail?: string; 
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
    startDate?: string;
    endDate?: string;
    currentlyActive?: boolean;
    interruptions?: Interruption[];
    medicalCheckCompleted?: boolean;
    updateRequestActive?: boolean;
    customFields?: Record<string, any>;
}

export type Coach = {
    id: string;
    name:string;
    lastName: string;
    sex?: 'masculino' | 'femenino';
    season?: string;
    role?: string;
    email?: string;
    phone?: string;
    teamId?: string;
    teamName?: string;
    avatar?: string;
    birthDate?: string;
    dni?: string;
    nationality?: string;
    healthCardNumber?: string;
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
    startDate?: string;
    endDate?: string;
    currentlyActive?: boolean;
    interruptions?: Interruption[];
    updateRequestActive?: boolean;
    customFields?: Record<string, any>;
}

export type Staff = {
    id: string;
    name: string;
    lastName: string;
    sex?: 'masculino' | 'femenino';
    role: string;
    email?: string;
    phone?: string;
    avatar?: string;
    hasMissingData?: boolean;
    staffId?: string;
    updateRequestActive?: boolean;
    customFields?: Record<string, any>;
}

export type Socio = {
    id: string;
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    dni?: string;
    paymentType: 'monthly' | 'annual';
    fee: number;
    avatar?: string;
    socioNumber?: string;
    customFields?: Record<string, any>;
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
    email?: string;
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
    role: 'super-admin' | 'Admin' | 'Entrenador' | 'Family' | 'Staff' | 'Socio';
    avatar?: string;
    authUid?: string; // To link to Firebase Auth user if needed
    playerId?: string;
    coachId?: string;
    staffId?: string;
    socioId?: string;
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

export type CustomRegistrationFormField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'select';
  options?: string[];
  required: boolean;
  custom: boolean;
};

export type RegistrationForm = {
    id: string;
    title: string;
    description?: string;
    fields: CustomRegistrationFormField[];
    createdAt: Timestamp;
    clubId: string;
    status: 'active' | 'closed';
    submissionCount: number;
    price: number;
    paymentIBAN?: string;
    maxSubmissions: number | null;
    registrationStartDate: Timestamp | null;
    registrationDeadline: Timestamp | null;
    eventStartDate: Timestamp | null;
    eventEndDate: Timestamp | null;
}

export type FormSubmission = {
    id: string;
    formId: string;
    submittedAt: Timestamp;
    data: Record<string, any>;
    paymentStatus?: 'paid' | 'pending' | 'not_applicable';
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
    clubName?: string;
    logoUrl?: string;
    feeExcludedMonths?: number[];
    coachFeeExcludedMonths?: number[];
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    smtpFromEmail?: string;
    customFields?: CustomFieldDef[];
}

export type Incident = {
    id: string;
    date: Timestamp;
    type: 'Lesión' | 'Comportamiento' | 'Administrativa' | 'Otro';
    involved: string[];
    description: string;
    status: 'Abierta' | 'En Progreso' | 'Resuelta';
}

export type FormWithSubmissions = RegistrationForm & {
    submissions: FormSubmission[];
}

export type FileRequest = {
    id: string;
    clubId: string;
    batchId: string;
    userId: string;
    userType: 'players' | 'coaches' | 'staff';
    userName: string;
    documentTitle: string;
    message?: string;
    status: 'pending' | 'completed';
    createdAt: Timestamp;
    completedAt?: Timestamp;
    filePath?: string;
}

export type FileRequestBatch = {
    id: string;
    clubId: string;
    documentTitle: string;
    totalSent: number;
    createdAt: Timestamp;
}
