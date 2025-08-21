
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { initialStats } from "@/lib/data";
import { Users, Shield, Calendar, CircleDollarSign, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, getCountFromServer } from "firebase/firestore";

const iconMap = {
  Users: Users,
  Shield: Shield,
  Calendar: Calendar,
  CircleDollarSign: CircleDollarSign,
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(initialStats);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          if (currentClubId) {
            fetchStats(currentClubId);
          } else {
             setLoading(false);
          }
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchStats = async (clubId: string) => {
    setLoading(true);
    try {
        const teamsCol = collection(db, "clubs", clubId, "teams");
        const playersCol = collection(db, "clubs", clubId, "players");
        const usersCol = query(collection(db, "clubs", clubId, "users"));

        const teamsCountSnap = await getCountFromServer(teamsCol);
        const playersCountSnap = await getCountFromServer(playersCol);
        const usersCountSnap = await getCountFromServer(usersCol);
        
        const teamsCount = teamsCountSnap.data().count;
        const playersCount = playersCountSnap.data().count;
        const usersCount = usersCountSnap.data().count;

        const playersSnapshot = await getDocs(playersCol);
        const pendingFees = playersSnapshot.docs.reduce((acc, doc) => {
          const player = doc.data();
          if (player.paymentStatus !== 'paid' && player.monthlyFee) {
            return acc + player.monthlyFee;
          }
          return acc;
        }, 0);

        setStats(prevStats => prevStats.map(stat => {
            if (stat.id === 'players') return { ...stat, value: playersCount.toString() };
            if (stat.id === 'teams') return { ...stat, value: teamsCount.toString() };
            if (stat.id === 'users') return { ...stat, value: usersCount.toString() };
            if (stat.id === 'fees') return { ...stat, value: `${pendingFees.toLocaleString('es-ES')} €` };
            return stat;
        }));

    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {loading ? (
            Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                </Card>
            ))
        ) : (
            stats.map((stat, index) => {
            const Icon = iconMap[stat.icon as keyof typeof iconMap];
            return (
                <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
                </Card>
            );
            })
        )}
      </div>
    </div>
  );
}
