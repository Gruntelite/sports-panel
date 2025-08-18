

export type Team = {
    id: string;
    name: string;
    sport: string;
    category: string;
    image: string;
    hint: string;
    players: number;
    coaches: number;
};

export type Player = {
    id: string;
    name: string;
    avatar: string;
    teamId: string;
    position: string;
}

