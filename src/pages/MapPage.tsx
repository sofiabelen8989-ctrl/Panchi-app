/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MapComponent = lazy(() => import("../components/MapComponent"));

const Map = () => {
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch location on mount
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ latitude, longitude });
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
                toast.error("Could not get your location. Please enable location access 🐾");
            },
            { enableHighAccuracy: true }
        );
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-amber-50/30">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-xl font-bold text-secondary">Sniffing out dogs near you... 🐾</p>
            </div>
        );
    }

    if (error && !userLocation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl text-red-500">📍</span>
                </div>
                <h2 className="text-2xl font-black text-secondary mb-3 tracking-tight">Location Access Required</h2>
                <p className="text-amber-800/60 font-medium mb-8 max-w-xs leading-relaxed">
                   Please enable location access in your browser settings to find dogs near you 🐾
                </p>
                <Button 
                    onClick={() => window.location.reload()}
                    className="bg-primary hover:bg-[#B45309] text-white rounded-full px-10 h-14 text-lg font-bold shadow-xl shadow-amber-600/20"
                >
                    Try Again 🔄
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="absolute top-4 left-4 z-[2000] md:hidden">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full bg-white/90 backdrop-blur-sm border-amber-100 shadow-lg h-10 w-10"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5 text-secondary" />
              </Button>
            </div>
            
            {userLocation ? (
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="mt-4 text-secondary font-bold">Unfolding the map... 🗺️</p>
                    </div>
                }>
                    <MapComponent userLocation={userLocation} />
                </Suspense>
            ) : null}
        </div>
    );
};

export const MapPage = Map;
