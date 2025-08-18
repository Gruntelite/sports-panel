export const stats = [
    { title: "Total de Jugadores", value: "258", change: "+12 desde el mes pasado", icon: 'Users' },
    { title: "Equipos", value: "16", change: "2 equipos nuevos", icon: 'Shield' },
    { title: "Próximos Eventos", value: "8", change: "3 hoy", icon: 'Calendar' },
    { title: "Cuotas Pendientes", value: "4.250 €", change: "800 € vencidos", icon: 'CircleDollarSign' },
];

export const players = [
    { id: "1", name: "Álex Martínez", team: "Águilas Sub-12", position: "Delantero", contact: "sara.m@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
    { id: "2", name: "María García", team: "Halcones Sub-14", position: "Centrocampista", contact: "roberto.g@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
    { id: "3", name: "David López", team: "Águilas Sub-12", position: "Defensa", contact: "linda.l@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
    { id: "4", name: "Chen Wei", team: "Leones Sub-10", position: "Portero", contact: "li.w@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
    { id: "5", name: "Fátima Al-Fassi", team: "Halcones Sub-14", position: "Delantero", contact: "youssef.a@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
    { id: "6", name: "Samuel O'Connell", team: "Titanes Baloncesto", position: "Base", contact: "emilia.o@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
    { id: "7", name: "Isabella Rossi", team: "Águilas Sub-12", position: "Centrocampista", contact: "marco.r@ejemplo.com", avatar: "https://placehold.co/40x40.png" },
];

export const teams = [
    { id: "1", name: "Águilas Sub-12", sport: "Fútbol", category: "Sub-12", players: 18, coaches: 2, image: "https://placehold.co/600x400.png", hint: "equipo de fútbol infantil" },
    { id: "2", name: "Halcones Sub-14", sport: "Fútbol", category: "Sub-14", players: 22, coaches: 3, image: "https://placehold.co/600x400.png", hint: "adolescentes jugando futbol" },
    { id: "3", name: "Leones Sub-10", sport: "Fútbol", category: "Sub-10", players: 15, coaches: 2, image: "https://placehold.co/600x400.png", hint: "partido de futbol infantil" },
    { id: "4", name: "Titanes Baloncesto", sport: "Baloncesto", category: "Absoluta", players: 14, coaches: 2, image: "https://placehold.co/600x400.png", hint: "equipo de baloncesto piña" },
];

export const events = [
    { id: "1", type: "Entrenamiento", team: "Águilas Sub-12", date: new Date(), location: "Campo Central 4", time: "17:00 - 18:30" },
    { id: "2", type: "Partido", team: "Halcones Sub-14", date: new Date(new Date().setDate(new Date().getDate() + 2)), location: "Estadio Este", opponent: "Riverdale FC", time: "14:00" },
    { id: "3", type: "Entrenamiento", team: "Leones Sub-10", date: new Date(new Date().setDate(new Date().getDate() + 1)), location: "Poli. Oeste", time: "16:30 - 17:30" },
    { id: "4", type: "Partido", team: "Titanes Baloncesto", date: new Date(new Date().setDate(new Date().getDate() + 3)), location: "Gimnasio del Instituto", opponent: "Northwood High", time: "19:00" },
];

export const users = [
    { id: "1", name: "Juan Pérez", email: "juan.perez@sportspanel.com", role: "Admin", avatar: "https://placehold.co/40x40.png" },
    { id: "2", name: "Ana López", email: "ana.lopez@sportspanel.com", role: "Entrenador", avatar: "https://placehold.co/40x40.png" },
    { id: "3", name: "Pedro Jiménez", email: "pedro.jimenez@familia.com", role: "Padre/Familia", avatar: "https://placehold.co/40x40.png" },
    { id: "4", name: "Susana Ruiz", email: "susana.ruiz@sportspanel.com", role: "Entrenador", avatar: "https://placehold.co/40x40.png" },
    { id: "5", name: "Usuario Admin", email: "admin@sportspanel.com", role: "Admin", avatar: "https://placehold.co/40x40.png" },
];
