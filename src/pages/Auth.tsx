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
import { PanchiLogo } from "../components/PanchiLogo";
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
  const [needsVerification, setNeedsVerification] = useState(false);
  const navigate = useNavigate();

  const handleResendEmail = async () => {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (!resendError) {
      toast.success('Email resent! Check your inbox 🐾');
    } else {
      toast.error(resendError.message);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Create the auth account with metadata for the trigger
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName || 'Dog Owner',
              neighborhood: neighborhood || ''
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          if (!authData.session) {
            // Email verification is required
            setNeedsVerification(true);
          } else {
            // Logged in immediately (email verification might be disabled)
            toast.success("Welcome to Panchi! 🐾");
            navigate('/my-dogs');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          toast.success("Welcome back!");
          navigate('/');
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

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg overflow-hidden border border-amber-100">
          
          {/* Top amber banner */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-8 text-center">
            <div className="text-6xl mb-3">🐾</div>
            <h1 className="text-white text-2xl font-bold">
              ¡Almost there!
            </h1>
            <p className="text-amber-100 text-sm mt-1">
              The pack is waiting for you
            </p>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-amber-800 text-xl font-bold mb-3">
              Check your email!
            </h2>
            <p className="text-amber-700 text-base leading-relaxed mb-2">
              We sent a confirmation link to:
            </p>
            <p className="text-amber-900 font-bold text-base mb-6 bg-amber-50 rounded-xl py-2 px-4">
              {email}
            </p>
            <p className="text-amber-600 text-sm leading-relaxed mb-8">
              Click the link in your email to confirm your account and meet your dog's new best friends 🐾
            </p>

            {/* Resend button */}
            <button
              onClick={handleResendEmail}
              className="text-amber-600 text-sm underline hover:text-amber-800 transition-colors mb-4 block mx-auto"
            >
              Didn't receive it? Resend email
            </button>

            {/* Back to login */}
            <button
              onClick={() => {
                setNeedsVerification(false);
                setIsSignUp(false);
              }}
              className="w-full bg-amber-600 text-white py-3 rounded-2xl font-semibold hover:bg-amber-700 transition-colors"
            >
              Back to Login
            </button>
          </div>

          {/* Footer */}
          <div className="bg-amber-50 py-4 text-center border-t border-amber-100">
            <p className="text-amber-500 text-xs">
              🐾 Panchi — Built for dogs, by dog lovers
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-amber-50/50">
      <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
        <CardHeader className="pt-10 space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <PanchiLogo size="xl" showText={false} />
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
