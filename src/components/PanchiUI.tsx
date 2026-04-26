import React from "react";
import { Button } from "@/components/ui/button";
import { DachshundLogo } from "./Logo";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, MessageCircle, Dog as DogIcon, LogOut, User, MessageSquare, LayoutGrid, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";

export function Navbar() {
  const navigate = useNavigate();
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchOwner(session.user.id);
        fetchUnreadCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchOwner(session.user.id);
        fetchUnreadCount(session.user.id);
      }
      else {
        setOwnerName(null);
        setUnreadCount(0);
      }
    });

    // Real-time unread count
    let channel: any;
    if (session?.user) {
      channel = supabase
        .channel('unread-navbar')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => {
          fetchUnreadCount(session.user.id);
        })
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const fetchUnreadCount = async (userId: string) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
      .neq('sender_id', userId);
    setUnreadCount(count || 0);
  };

  const fetchOwner = async (userId: string) => {
    const { data } = await supabase.from('owners').select('first_name').eq('id', userId).single();
    if (data) setOwnerName(data.first_name);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <nav className="hidden md:flex items-center justify-between px-6 py-5 sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-amber-100 w-full transition-all duration-300">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 group">
          <DachshundLogo className="h-8 md:h-10 w-auto object-contain drop-shadow-sm transition-transform group-hover:scale-110" />
          <span className="text-2xl font-black text-primary tracking-tight">Panchi</span>
        </NavLink>
        <div className="flex items-center gap-6">
          <NavLink to="/" className={({ isActive }) => cn("text-secondary font-semibold hover:text-primary transition-colors", isActive && "text-primary")}>Home</NavLink>
          <NavLink to="/feed" className={({ isActive }) => cn("text-secondary font-semibold hover:text-primary transition-colors", isActive && "text-primary")}>Feed</NavLink>
          <NavLink to="/ask-panchi" className={({ isActive }) => cn("text-secondary font-semibold hover:text-primary transition-colors", isActive && "text-primary")}>Ask Panchi</NavLink>
          <NavLink to="/community" className={({ isActive }) => cn("text-secondary font-semibold hover:text-primary transition-colors", isActive && "text-primary")}>Community</NavLink>
          <NavLink to="/map" className={({ isActive }) => cn("text-secondary font-semibold hover:text-primary transition-colors", isActive && "text-primary")}>Map</NavLink>
          <NavLink to="/inbox" className={({ isActive }) => cn("text-secondary font-semibold hover:text-primary transition-colors relative", isActive && "text-primary")}>
            Inbox
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-primary text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </NavLink>
          
          {session ? (
            <div className="flex items-center gap-4">
              <NavLink to="/feed" className="flex items-center gap-2 group p-1">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-primary border border-amber-200">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-secondary font-bold text-sm">{ownerName || "My Profile"}</span>
              </NavLink>
              <Button 
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-secondary/60 hover:text-red-500 hover:bg-red-50 rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-bold shadow-lg shadow-amber-600/20"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

export function BottomNav() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let session: any;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      session = s;
      if (session?.user) fetchUnreadCount(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      session = s;
      if (session?.user) fetchUnreadCount(session.user.id);
      else setUnreadCount(0);
    });

    let channel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        channel = supabase
          .channel('unread-bottom')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages'
          }, () => {
            fetchUnreadCount(session.user.id);
          })
          .subscribe();
      }
    };
    setupRealtime();

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async (userId: string) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
      .neq('sender_id', userId);
    setUnreadCount(count || 0);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-amber-100 flex items-center justify-around py-3 px-2 safe-area-bottom">
      <BottomNavLink to="/" icon={<Home className="w-6 h-6" />} label="Home" />
      <BottomNavLink to="/feed" icon={<Search className="w-6 h-6" />} label="Feed" />
      <BottomNavLink to="/map" icon={<MapPin className="w-6 h-6" />} label="Map" />
      <BottomNavLink to="/community" icon={<LayoutGrid className="w-6 h-6" />} label="Community" />
      <BottomNavLink 
        to="/inbox" 
        icon={
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-bold h-3.5 min-w-[14px] px-0.5 rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </div>
        } 
        label="Inbox" 
      />
      <BottomNavLink to="/profile/me" icon={<DogIcon className="w-6 h-6" />} label="My Dog" />
    </nav>
  );
}

function BottomNavLink({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        isActive ? "text-primary scale-110" : "text-secondary/60"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </NavLink>
  );
}

import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface HeroProps {
  onFindNearby?: () => void;
  loading?: boolean;
}

export function Hero({ onFindNearby, loading }: HeroProps) {
  return (
    <section className="flex flex-col items-center text-center py-16 px-6 max-w-4xl mx-auto">
      <h1 className="text-5xl md:text-6xl font-extrabold text-secondary mb-3 tracking-tight leading-[1.1]">
        Find Playmates for Your Pup 🐾
      </h1>
      <p className="text-lg text-amber-800/80 mb-10 max-w-xl mx-auto leading-relaxed font-medium">
        Connect with dog owners near you for fun, safe, and social playdates in your neighborhood.
      </p>
      
      {loading ? (
        <div className="w-full max-w-md mx-auto p-12 bg-white rounded-[2rem] shadow-xl border border-amber-50 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="font-bold text-secondary">Finding dogs near you... 🐾</p>
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto shadow-xl rounded-2xl overflow-hidden flex flex-col md:flex-row bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              placeholder="Enter your city or neighborhood..." 
              className="pl-12 h-14 bg-white border-none focus-visible:ring-0 text-gray-700 font-medium"
            />
          </div>
          <Button 
            onClick={onFindNearby}
            className="h-14 px-8 bg-primary hover:bg-[#B45309] text-white rounded-none md:rounded-none text-lg font-bold transition-colors"
          >
            Find Dogs Near Me
          </Button>
        </div>
      )}
    </section>
  );
}

import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Internal Tag component matched to Vibrant Palette
const Tag = (props: { children: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>) => (
  <span {...props} className={cn("px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100 uppercase tracking-wider", props.className)}>
    {props.children}
  </span>
);

interface DogCardProps extends React.ComponentPropsWithoutRef<"div"> {
  key?: React.Key;
  name: string;
  breed: string;
  age: string;
  personality: string[];
  distance: string;
  imageUrl: string;
  ownerName: string;
  ownerAvatar: string;
  className?: string;
  onClick?: () => void;
}

export function DogCard({ 
  name, 
  breed, 
  age, 
  personality, 
  distance, 
  imageUrl, 
  ownerName, 
  ownerAvatar,
  className,
  onClick,
  ...rest 
}: DogCardProps) {
  return (
    <Card 
      {...rest} 
      onClick={onClick}
      className={cn(
        "rounded-[2rem] p-5 shadow-xl border border-amber-50 flex flex-col bg-white hover:shadow-2xl transition-all duration-300", 
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="w-full aspect-[4/3] bg-amber-100 rounded-2xl mb-4 overflow-hidden relative">
        <img 
          src={imageUrl} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-secondary shadow-sm">
          {distance}
        </div>
      </div>
      <CardContent className="p-0 mb-6">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-2xl font-bold text-secondary tracking-tight">{name}</h3>
          <span className="text-sm font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">{distance}</span>
        </div>
        <p className="text-amber-800/60 font-medium text-sm mb-3">{breed} • {age}</p>
        <div className="flex flex-wrap gap-2">
          {personality.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4 border-t border-amber-50 mt-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-white shadow-sm overflow-hidden">
          <img src={ownerAvatar} alt={ownerName} className="w-full h-full object-cover" />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter shrink-0">
          Owner: <span className="text-secondary">{ownerName}</span>
        </span>
        <Button size="sm" className="ml-auto bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold px-4 h-8">
          Request 🐾
        </Button>
      </CardFooter>
    </Card>
  );
}
