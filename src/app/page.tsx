"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [clubName, setClubName] = useState('');
  const [sport, setSport] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        clubName,
        sport,
        role: 'Admin',
      });

       // Save club info to a 'clubs' collection
      await setDoc(doc(db, "clubs", user.uid), { // Using user UID as doc ID for simplicity
        name: clubName,
        sport,
        adminId: user.uid,
      });

      toast({
        title: "Account Created!",
        description: "You have successfully signed up.",
      });

      router.push("/dashboard");

    } catch (error: any) {
      console.error("Sign-up error:", error);
       toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto inline-block bg-primary text-primary-foreground p-3 rounded-full mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">
            Welcome to SportsPanel
          </CardTitle>
          <CardDescription>
            Create your admin account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="club-name">Club Name</Label>
              <Input id="club-name" placeholder="e.g., Downtown Dynamos" required value={clubName} onChange={(e) => setClubName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="sport">Primary Sport</Label>
              <Input id="sport" placeholder="e.g., Soccer" required value={sport} onChange={(e) => setSport(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="e.g., Alex Smith" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account & Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
