

export type Team = {
    id: string;
    name: string;
    minAge?: number;
    maxAge?: number;
    image: string;
    hint: string;
    players: number;
    coaches: number;
};

export type Player = {
    id: string;
    name: string;
    lastName: string;
    age?: number;
    dni?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    tutorEmail?: string;
    tutorPhone?: string;
    iban?: string;
    teamId: string;
    teamName?: string; 
    jerseyNumber?: number;
    position?: string;
    avatar?: string;
}
