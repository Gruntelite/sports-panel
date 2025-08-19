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
}
