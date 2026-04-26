/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PanchiLogo } from "../components/PanchiLogo";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { score: 0, label: '', color: '' }
    if (pass.length < 6) return { score: 1, label: 'Too short', color: 'bg-red-400' }
    
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-400' }
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-400' }
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-yellow-400' }
    return { score: 4, label: 'Strong 🐾', color: 'bg-green-400' }
  }

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (isSignUp && confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword, isSignUp]);

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
        // Validate passwords match
        if (password !== confirmPassword) {
          setPasswordError('Passwords do not match')
          setLoading(false)
          return
        }

        // Validate minimum length
        if (password.length < 6) {
          setPasswordError('Password must be at least 6 characters')
          setLoading(false)
          return
        }

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

  const isSignupDisabled = !firstName || !neighborhood || !email || !password || !confirmPassword || password !== confirmPassword || password.length < 6 || loading;
  const isLoginDisabled = !email || !password || loading;

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
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-amber-800 uppercase tracking-wide px-1">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Sofia" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                    className="rounded-xl border-amber-200 h-12 focus-visible:ring-amber-400 focus:border-transparent placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="neighborhood" className="text-xs font-semibold text-amber-800 uppercase tracking-wide px-1">Neighborhood / City</Label>
                  <Input 
                    id="neighborhood" 
                    placeholder="Barcelona" 
                    value={neighborhood} 
                    onChange={(e) => setNeighborhood(e.target.value)} 
                    required 
                    className="rounded-xl border-amber-200 h-12 focus-visible:ring-amber-400 focus:border-transparent placeholder:text-gray-300"
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-amber-800 uppercase tracking-wide px-1">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="sofia@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="rounded-xl border-amber-200 h-12 focus-visible:ring-amber-400 focus:border-transparent placeholder:text-gray-300"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold text-amber-800 uppercase tracking-wide px-1">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="rounded-xl border-amber-200 h-12 pr-12 focus-visible:ring-amber-400 focus:border-transparent placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isSignUp && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= level ? strength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.score <= 1 ? 'text-red-400' : strength.score === 2 ? 'text-amber-500' : strength.score === 3 ? 'text-yellow-600' : 'text-green-500'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-amber-800 uppercase tracking-wide px-1">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    className={`rounded-xl h-12 pr-12 focus-visible:ring-amber-400 focus:border-transparent placeholder:text-gray-300 ${
                      passwordError ? 'border-red-300 focus-visible:ring-red-300' : 'border-amber-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                    ⚠️ {passwordError}
                  </p>
                )}
                {confirmPassword && !passwordError && (
                  <p className="text-green-500 text-xs flex items-center gap-1 mt-1">
                    ✓ Passwords match!
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-10">
            {isSignUp ? (
              <Button 
                type="submit" 
                disabled={isSignupDisabled}
                className={`w-full h-12 rounded-2xl font-black text-lg shadow-lg transition-all ${
                  isSignupDisabled 
                    ? 'bg-amber-300 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-amber-600/20 text-white'
                }`}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Join the Pack 🐾"}
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isLoginDisabled}
                className={`w-full h-12 rounded-2xl font-black text-lg shadow-lg transition-all ${
                  isLoginDisabled 
                    ? 'bg-amber-300 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-amber-600/20 text-white'
                }`}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In 🐾"}
              </Button>
            )}
            <button 
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPasswordError("");
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className="text-sm font-bold text-amber-800/60 hover:text-amber-600 transition-colors mt-2"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
