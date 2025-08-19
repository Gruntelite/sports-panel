

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
    tutorEmail?: string;
    tutorPhone?: string;
    iban?: string;
    teamId?: string;
    teamName?: string; 
    jerseyNumber?: number;
    position?: string;
    avatar?: string;
    monthlyFee?: number;
    isOwnTutor?: boolean;
    tutorName?: string;
    tutorLastName?: string;
    tutorDni?: string;
    hasMissingData?: boolean;
}

export type Coach = {
    id: string;
    name:string;
    lastName: string;
    email?: string;
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
}

export type TeamMember = {
    id: string;
    name: string;
    role: 'Jugador' | 'Entrenador';
    jerseyNumber?: number | string;
    avatar?: string;
    hasMissingData?: boolean;
    data: Player | Coach;
}

export type Contact = {
    name: string;
    email: string;
    hasAccount: boolean;
}
