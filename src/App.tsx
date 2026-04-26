/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState, ReactNode } from "react";
import { Navbar, BottomNav } from "./components/PanchiUI";
import { Home } from "./pages/Home";
import { Feed } from "./pages/Feed";
import { Profile } from "./pages/Profile";
import { AskPanchi } from "./pages/AskPanchi";
import { CreateProfile } from "./pages/CreateProfile";
import { Auth } from "./pages/Auth";
import { Inbox } from "./pages/Inbox";
import { Chat } from "./pages/Chat";
import { Community } from "./pages/Community";
import { MapPage } from "./pages/MapPage";
import MyDogs from "./pages/MyDogs";
import { DogProvider, useDog } from "./contexts/DogContext";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "./lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { Toaster } from "sonner";
import { PanchiLogo } from "./components/PanchiLogo";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 gap-4">
      <PanchiLogo size="xl" showText={true} />
      <p className="text-secondary font-bold text-sm tracking-widest uppercase animate-pulse">Panchi is waking up... 🐾</p>
    </div>
  );
  if (!session) return <Navigate to="/auth" />;

  return <>{children}</>;
}

function OnboardingRedirect() {
  const { myDogs, loading } = useDog();
  
  if (loading) return null;
  
  if (myDogs.length === 0) {
    return <Navigate to="/my-dogs" replace />;
  }
  
  return <Navigate to="/feed" replace />;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="pb-20 md:pb-0"
      >
        <Routes location={location}>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<OnboardingRedirect />} />
          <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
          <Route path="/profile/:dogId" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/my-dogs" element={<PrivateRoute><MyDogs /></PrivateRoute>} />
          <Route path="/ask-panchi" element={<PrivateRoute><AskPanchi /></PrivateRoute>} />
          <Route path="/create-profile" element={<PrivateRoute><CreateProfile /></PrivateRoute>} />
          <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
          <Route path="/chat/:conversationId" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <DogProvider>
        <Toaster position="top-center" richColors />
        <ScrollToTop />
        <div className="min-h-screen bg-background">
          <Navbar />
          <AnimatedRoutes />
          <BottomNav />
          
          <footer className="hidden md:block py-10 text-center border-t border-primary/10 bg-white/30 backdrop-blur-sm mt-10">
            <p className="text-secondary/50 text-sm font-medium">
              © 2026 Panchi — Built for dogs, by dog lovers. 🐾
            </p>
          </footer>
        </div>
      </DogProvider>
    </Router>
  );
}

