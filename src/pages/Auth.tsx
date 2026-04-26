/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DachshundLogo } from "../components/Logo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Create the auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          // 2. Immediately insert a row into the owners table
          const { error: profileError } = await supabase
            .from('owners')
            .insert({
              id: authData.user.id,
              first_name: firstName,
              neighborhood: neighborhood,
              owner_photo: null, // Initial photo is null as per fix instructions
              created_at: new Date().toISOString()
            });

          if (profileError) {
            console.error("Owner Profile Insert Error:", profileError);
            toast.error("Account created, but profile setup failed: " + profileError.message);
            // If the owners insert fails, still redirect to /create-profile so they can complete it later
            navigate('/create-profile');
            return;
          }

          toast.success("Welcome to Panchi! profile created.");
          navigate('/create-profile');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          toast.success("Welcome back!");
          const { data: dog } = await supabase.from('dogs').select('id').eq('owner_id', data.user.id).single();
          if (dog) navigate('/feed');
          else navigate('/create-profile');
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      toast.error(err.message || "An error occurred during authentication");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-amber-50/50">
      <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
        <CardHeader className="pt-10 space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <DachshundLogo className="h-24 w-24 rounded-full shadow-lg" />
          </div>
          <CardTitle className="text-3xl font-black text-secondary tracking-tight">
            {isSignUp ? "Join Panchi 🐾" : "Welcome Back!"}
          </CardTitle>
          <CardDescription className="text-amber-800/60 font-medium whitespace-pre-wrap">
            {isSignUp 
              ? "Connect with local pups and owners for fun playdates in your area." 
              : "Sign in to see who's ready for a walk!"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-bold text-secondary px-1 text-xs uppercase tracking-widest">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Sofia" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                    className="rounded-xl border-amber-100 h-12 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood" className="font-bold text-secondary px-1 text-xs uppercase tracking-widest">Neighborhood / City</Label>
                  <Input 
                    id="neighborhood" 
                    placeholder="Barcelona" 
                    value={neighborhood} 
                    onChange={(e) => setNeighborhood(e.target.value)} 
                    required 
                    className="rounded-xl border-amber-100 h-12 focus-visible:ring-primary"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-secondary px-1 text-xs uppercase tracking-widest">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="sofia@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="rounded-xl border-amber-100 h-12 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-secondary px-1 text-xs uppercase tracking-widest">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="rounded-xl border-amber-100 h-12 focus-visible:ring-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-10">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-lg shadow-amber-600/20 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold text-amber-800/60 hover:text-primary transition-colors mt-2"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
