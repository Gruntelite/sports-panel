import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export const stats = [
    { title: "Total de Jugadores", value: "0", change: "", icon: 'Users' },
    { title: "Equipos", value: "0", change: "", icon: 'Shield' },
    { title: "Próximos Eventos", value: "0", change: "", icon: 'Calendar' },
    { title: "Cuotas Pendientes", value: "0 €", change: "", icon: 'CircleDollarSign' },
];

export const players: any[] = [
];

export const getTeams = async (clubId: string) => {
    if (!clubId) return [];
    const teamsCol = collection(db, "clubs", clubId, "teams");
    const teamSnapshot = await getDocs(teamsCol);
    const teamList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return teamList;
};

// Initial empty array, will be populated from Firestore
export let teams: any[] = [];

export const events: any[] = [
];

export const users: any[] = [
];

export const venues: any[] = [
    { id: '1', name: 'Pista Central' },
    { id: '2', name: 'Pabellón Norte' },
    { id: '3', name: 'Gimnasio' },
];
