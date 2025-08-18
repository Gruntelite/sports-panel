export const stats = [
    { title: "Total Players", value: "258", change: "+12 since last month", icon: 'Users' },
    { title: "Teams", value: "16", change: "2 new teams", icon: 'Shield' },
    { title: "Upcoming Events", value: "8", change: "3 today", icon: 'Calendar' },
    { title: "Pending Fees", value: "$4,250", change: "$800 overdue", icon: 'CircleDollarSign' },
];

export const players = [
    { id: "1", name: "Alex Johnson", team: "U12 Eagles", position: "Forward", contact: "sarah.j@example.com", avatar: "https://placehold.co/40x40.png" },
    { id: "2", name: "Maria Garcia", team: "U14 Falcons", position: "Midfielder", contact: "robert.g@example.com", avatar: "https://placehold.co/40x40.png" },
    { id: "3", name: "David Smith", team: "U12 Eagles", position: "Defender", contact: "linda.s@example.com", avatar: "https://placehold.co/40x40.png" },
    { id: "4", name: "Chen Wei", team: "U10 Lions", position: "Goalkeeper", contact: "li.w@example.com", avatar: "https://placehold.co/40x40.png" },
    { id: "5", name: "Fatima Al-Fassi", team: "U14 Falcons", position: "Forward", contact: "youssef.a@example.com", avatar: "https://placehold.co/40x40.png" },
    { id: "6", name: "Sam O'Connell", team: "Varsity Hoops", position: "Guard", contact: "emily.o@example.com", avatar: "https://placehold.co/40x40.png" },
    { id: "7", name: "Isabella Rossi", team: "U12 Eagles", position: "Midfielder", contact: "marco.r@example.com", avatar: "https://placehold.co/40x40.png" },
];

export const teams = [
    { id: "1", name: "U12 Eagles", sport: "Soccer", category: "U12", players: 18, coaches: 2, image: "https://placehold.co/600x400.png", hint: "kids soccer team" },
    { id: "2", name: "U14 Falcons", sport: "Soccer", category: "U14", players: 22, coaches: 3, image: "https://placehold.co/600x400.png", hint: "teenagers playing soccer" },
    { id: "3", name: "U10 Lions", sport: "Soccer", category: "U10", players: 15, coaches: 2, image: "https://placehold.co/600x400.png", hint: "children soccer game" },
    { id: "4", name: "Varsity Hoops", sport: "Basketball", category: "Varsity", players: 14, coaches: 2, image: "https://placehold.co/600x400.png", hint: "basketball team huddle" },
];

export const events = [
    { id: "1", type: "Training", team: "U12 Eagles", date: new Date(), location: "Central Park Field 4", time: "17:00 - 18:30" },
    { id: "2", type: "Match", team: "U14 Falcons", date: new Date(new Date().setDate(new Date().getDate() + 2)), location: "Eastside Stadium", opponent: "Riverdale FC", time: "14:00" },
    { id: "3", type: "Training", team: "U10 Lions", date: new Date(new Date().setDate(new Date().getDate() + 1)), location: "Westwood Rec Center", time: "16:30 - 17:30" },
    { id: "4", type: "Match", team: "Varsity Hoops", date: new Date(new Date().setDate(new Date().getDate() + 3)), location: "High School Gym", opponent: "Northwood High", time: "19:00" },
];

export const users = [
    { id: "1", name: "John Doe", email: "john.doe@sportspanel.com", role: "Admin", avatar: "https://placehold.co/40x40.png" },
    { id: "2", name: "Jane Smith", email: "jane.smith@sportspanel.com", role: "Coach", avatar: "https://placehold.co/40x40.png" },
    { id: "3", name: "Peter Jones", email: "peter.jones@family.com", role: "Parent/Family", avatar: "https://placehold.co/40x40.png" },
    { id: "4", name: "Susan Williams", email: "susan.williams@sportspanel.com", role: "Coach", avatar: "https://placehold.co/40x40.png" },
    { id: "5", name: "Admin User", email: "admin@sportspanel.com", role: "Admin", avatar: "https://placehold.co/40x40.png" },
];
