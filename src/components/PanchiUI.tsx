import React from "react";
import { Button } from "@/components/ui/button";
import { PanchiLogo } from "./PanchiLogo";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, MessageCircle, Dog as DogIcon, LogOut, User, MessageSquare, LayoutGrid, MapPin, ChevronDown, Check, Sparkles, Bell } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import { useDog } from "../contexts/DogContext";
import NotificationItem from "./NotificationItem";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const navigate = useNavigate();
  const { myDogs, activeDog, setActiveDog } = useDog();
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchOwner(session.user.id);
        fetchUnreadCount(session.user.id);
        fetchNotifications(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchOwner(session.user.id);
        fetchUnreadCount(session.user.id);
        fetchNotifications(session.user.id);
      }
      else {
        setOwnerName(null);
        setUnreadCount(0);
        setNotifications([]);
        setUnreadNotifCount(0);
      }
    });

    // Real-time unread messages count
    let messageChannel: any;
    if (session?.user) {
      messageChannel = supabase
        .channel('unread-navbar-messages')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => {
          fetchUnreadCount(session.user.id);
        })
        .subscribe();
    }

    // Real-time notifications
    let notifChannel: any;
    if (session?.user) {
      notifChannel = supabase
        .channel('notifications-navbar')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${session.user.id}`
        }, (payload: any) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadNotifCount(prev => prev + 1);
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
        })
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, [session?.user?.id]);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setUnreadNotifCount((data || []).filter((n: any) => !n.read).length);
  };

  const markAllAsRead = async () => {
    if (!session?.user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('owner_id', session.user.id)
      .eq('read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifCount(0);
  };

  const handleReadNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadNotifCount(prev => Math.max(0, prev - 1));
  };

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
        <NavLink to="/" className="group">
          <PanchiLogo size="md" showText={true} />
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
          
          {session && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors focus:outline-none"
              >
                <Bell className="w-6 h-6" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-amber-100 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
                    <h3 className="font-bold text-amber-800">Notifications</h3>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-amber-500 hover:text-amber-700 font-bold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-4xl mb-3">🐾</p>
                        <p className="text-amber-600 text-sm font-medium">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={handleReadNotification}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {session ? (
            <div className="flex items-center gap-6">
              {myDogs.length > 0 && activeDog && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-amber-50 border border-amber-100 hover:bg-amber-100/50 transition-colors group focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <div className="relative">
                        <Avatar className="h-9 w-9 rounded-full border-2 border-white shadow-sm overflow-hidden animate-in zoom-in-50 duration-500">
                          {activeDog.dog_photo ? (
                            <AvatarImage src={activeDog.dog_photo} className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-amber-200 text-amber-700 text-xs font-bold uppercase tracking-tighter">
                              {activeDog.name.substring(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm" />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-0.5">Active Dog</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-secondary font-bold text-sm tracking-tight">{activeDog.name}</span>
                          <ChevronDown className="h-3 w-3 text-secondary/40 group-hover:text-secondary group-hover:translate-y-0.5 transition-all" />
                        </div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-[1.5rem] mt-1 border-amber-100 shadow-2xl bg-white/95 backdrop-blur-md">
                    <DropdownMenuLabel className="px-3 py-3 text-xs font-black text-secondary tracking-widest uppercase opacity-40">Switch Active Dog</DropdownMenuLabel>
                    <div className="space-y-1">
                      {myDogs.map(dog => (
                        <DropdownMenuItem 
                          key={dog.id} 
                          onClick={() => setActiveDog(dog)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            activeDog.id === dog.id ? "bg-amber-50 text-amber-700" : "hover:bg-gray-50 hover:pl-3.5"
                          )}
                        >
                          <Avatar className="h-8 w-8 rounded-full border border-gray-100 overflow-hidden shrink-0">
                            {dog.dog_photo ? (
                              <AvatarImage src={dog.dog_photo} className="object-cover" />
                            ) : (
                              <AvatarFallback className="bg-amber-100 text-[10px] font-bold">{dog.name[0]}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-bold flex-grow text-sm">{dog.name}</span>
                          {activeDog.id === dog.id && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuSeparator className="my-2 bg-amber-50" />
                    <DropdownMenuItem 
                      onClick={() => navigate('/my-dogs')}
                      className="p-2.5 rounded-xl text-xs font-bold text-secondary/60 hover:text-primary hover:bg-amber-50/50 justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Manage Pack
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="flex items-center gap-4 border-l border-amber-100 pl-6 ml-2">
                <div className="flex items-center gap-3 group px-4 py-2 rounded-full hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-primary border border-amber-200">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-secondary font-bold text-sm tracking-tight">{ownerName || "My Profile"}</span>
                </div>
                <Button 
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-secondary/30 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group"
                >
                  <LogOut className="w-4 h-4 group-hover:scale-110" />
                </Button>
              </div>
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
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    let session: any;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      session = s;
      if (session?.user) {
        fetchUnreadCount(session.user.id);
        fetchUnreadNotifCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      session = s;
      if (session?.user) {
        fetchUnreadCount(session.user.id);
        fetchUnreadNotifCount(session.user.id);
      }
      else {
        setUnreadCount(0);
        setUnreadNotifCount(0);
      }
    });

    let messageChannel: any;
    let notifChannel: any;
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        messageChannel = supabase
          .channel('unread-bottom-messages')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages'
          }, () => {
            fetchUnreadCount(session.user.id);
          })
          .subscribe();

        notifChannel = supabase
          .channel('unread-bottom-notifications')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications'
          }, () => {
            fetchUnreadNotifCount(session.user.id);
          })
          .subscribe();
      }
    };
    setupRealtime();

    return () => {
      subscription.unsubscribe();
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
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

  const fetchUnreadNotifCount = async (userId: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('read', false);
    setUnreadNotifCount(count || 0);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-amber-100 flex items-stretch justify-around h-16 safe-area-bottom">
      <BottomNavLink to="/" icon={<Home className="w-5 h-5" />} label="Home" />
      <BottomNavLink to="/feed" icon={<Search className="w-5 h-5" />} label="Feed" />
      <BottomNavLink to="/ask-panchi" icon={<Sparkles className="w-5 h-5" />} label="Ask Panchi" />
      <BottomNavLink 
        to="/inbox" 
        icon={
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {(unreadCount > 0 || unreadNotifCount > 0) && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            )}
          </div>
        } 
        label="Inbox" 
      />
      <BottomNavLink to="/my-dogs" icon={<DogIcon className="w-5 h-5" />} label="My Pack" />
    </nav>
  );
}

function BottomNavLink({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex flex-col items-center justify-center gap-1 transition-all duration-300 min-w-0 px-1 flex-1",
        isActive ? "text-primary bg-amber-50/50" : "text-secondary/60"
      )}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-tighter truncate w-full text-center px-0.5">{label}</span>
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
