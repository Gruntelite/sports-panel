import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Team } from "./types";

export const initialStats = [
    { id: "players", title: "Total de Jugadores", value: "0", change: "", icon: 'Users' },
    { id: "teams", title: "Equipos", value: "0", change: "", icon: 'Shield' },
    { id: "events", title: "Próximos Eventos", value: "0", change: "", icon: 'Calendar' },
    { id: "fees", title: "Cuotas Pendientes", value: "0 €", change: "", icon: 'CircleDollarSign' },
];

export const getTeams = async (clubId: string): Promise<Team[]> => {
    if (!clubId) return [];
    try {
        const teamsCol = collection(db, "clubs", clubId, "teams");
        const teamSnapshot = await getDocs(teamsCol);
        const teamList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        return teamList;
    } catch (error) {
        console.error("Error fetching teams: ", error);
        return [];
    }
};

export const events: any[] = [
];

    