/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, MessageCircle, User, Navigation, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Fix for Leaflet default icon issues in some build environments
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconRetinaUrl: iconRetina,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const userIcon = L.divIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0 0 4px rgba(0,0,0,0.2));">🐾</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const dogIcon = (photoUrl: string) => L.divIcon({
  html: `<div style="
    width:48px; height:48px;
    border-radius:50%;
    border: 3px solid #D97706;
    overflow:hidden;
    background:#FEF3C7;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  ">
    <img src="${photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=dog'}" 
      style="width:100%;height:100%;
      object-fit:cover;" />
  </div>`,
  className: 'custom-dog-icon',
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

interface MapProps {
  userLocation: { latitude: number, longitude: number };
}

function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords);
  }, [coords, map]);
  return null;
}

export default function MapComponent({ userLocation }: MapProps) {
  const [radius, setRadius] = useState([10]); // km
  const [nearbyDogs, setNearbyDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [energyFilter, setEnergyFilter] = useState<'all' | 'calm' | 'playful' | 'high energy'>('all');
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNearbyDogs();
  }, [userLocation, radius]);

  const fetchNearbyDogs = async () => {
    setLoading(true);
    try {
      // Use the RPC function as requested
      const { data, error } = await supabase.rpc('get_nearby_dogs', {
        user_lat: userLocation.latitude,
        user_lng: userLocation.longitude,
        radius_km: radius[0]
      });

      if (error) throw error;
      setNearbyDogs(data || []);
    } catch (error: any) {
      console.error("Error fetching nearby dogs:", error);
      // Fallback: If RPC doesn't exist yet, we'll try a basic fetch and calculate distance client-side
      // But we should prioritize the RPC
      toast.error("Sniffing failed... Trying alternative hunt! 🐾");
      
      const { data: allDogs } = await supabase.from('dogs').select('*, owners(first_name, owner_photo)');
      if (allDogs) {
        const withDistance = allDogs.map(dog => {
          if (!dog.latitude || !dog.longitude) return null;
          const dist = calculateDistance(userLocation.latitude, userLocation.longitude, dog.latitude, dog.longitude);
          return { ...dog, distance_km: dist };
        }).filter(d => d && d.distance_km <= radius[0]);
        setNearbyDogs(withDistance as any[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredDogs = nearbyDogs.filter(dog => {
    if (filter !== 'all' && dog.size?.toLowerCase() !== filter) return false;
    if (energyFilter !== 'all' && dog.energy_level?.toLowerCase() !== energyFilter) return false;
    return true;
  });

  const openChat = async (dog: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/auth');
    
    // Logic to start/get conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(owner1_id.eq.${user.id},owner2_id.eq.${dog.owner_id}),and(owner1_id.eq.${dog.owner_id},owner2_id.eq.${user.id})`)
      .single();

    if (conv) {
      navigate(`/chat/${conv.id}`);
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ owner1_id: user.id, owner2_id: dog.owner_id })
        .select()
        .single();
      if (newConv) navigate(`/chat/${newConv.id}`);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden">
      {loading && nearbyDogs.length === 0 && (
        <div className="absolute inset-0 z-[1000] bg-amber-50/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🐾</span>
            </div>
          </div>
          <p className="mt-6 text-2xl font-black text-secondary tracking-tight">Sniffing out dogs near you... 🐾</p>
        </div>
      )}

      {/* Map Control Panel */}
      <div className="absolute top-4 right-4 z-[1000] w-72 md:w-80">
        <div className="bg-white/90 backdrop-blur-md border border-amber-100 rounded-[2rem] p-6 shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-amber-800/40 tracking-widest leading-none">
                Search Radius
              </label>
              <div className="bg-primary text-white font-bold rounded-full px-3 py-1 text-xs">
                {radius[0]} km
              </div>
            </div>
            <Slider 
              value={radius} 
              onValueChange={setRadius} 
              max={50} 
              min={1} 
              step={1}
              className="py-4"
            />
          </div>

          <div className="pt-4 border-t border-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-primary border border-amber-100">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="font-bold text-secondary text-sm">
                {filteredDogs.length} dogs near you
              </span>
            </div>
            <Button 
              size="icon" 
              variant="outline" 
              className="rounded-full border-amber-100 h-10 w-10 text-primary hover:bg-amber-50"
              onClick={() => {}} // Re-center handled by initial setup or manual click
            >
              📍
            </Button>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-amber-800/40 tracking-widest">Size</label>
             <div className="flex flex-wrap gap-2">
               {['all', 'small', 'medium', 'large'].map((s) => (
                 <button
                   key={s}
                   onClick={() => setFilter(s as any)}
                   className={cn(
                     "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                     filter === s ? "bg-primary text-white" : "bg-amber-50 text-amber-800/60 hover:bg-amber-100"
                   )}
                 >
                   {s}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>

      {nearbyDogs.length === 0 && !loading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center p-6 text-center">
          <div className="bg-white/90 backdrop-blur-md rounded-[3rem] p-10 shadow-2xl border border-amber-100 max-w-sm">
             <div className="text-6xl mb-6">🐾</div>
             <h3 className="text-2xl font-black text-secondary mb-3">No dogs found nearby</h3>
             <p className="text-amber-800/60 font-medium mb-8 italic">Try increasing your search radius!</p>
             <Button onClick={() => setRadius([50])} className="w-full bg-primary hover:bg-[#B45309] text-white rounded-full h-12 font-bold shadow-lg shadow-amber-600/20">
               Expand Hunt 🐾
             </Button>
          </div>
        </div>
      )}

      <MapContainer 
        center={[userLocation.latitude, userLocation.longitude]} 
        zoom={14} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap coords={[userLocation.latitude, userLocation.longitude]} />

        <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
          <Popup className="dog-popup">
            <div className="text-center font-bold text-secondary">You are here! 🐾</div>
          </Popup>
        </Marker>

        <Circle
          center={[userLocation.latitude, userLocation.longitude]}
          radius={radius[0] * 1000}
          pathOptions={{ 
            color: '#D97706', 
            fillColor: '#FEF3C7',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 10'
          }}
        />

        {filteredDogs.map((dog) => (
          <Marker 
            key={dog.id} 
            position={[dog.latitude, dog.longitude]} 
            icon={dogIcon(dog.dog_photo)}
          >
            <Popup className="dog-popup rounded-[1.5rem] overflow-hidden p-0">
              <div className="p-3 min-w-[200px]">
                <div className="w-full h-32 rounded-2xl overflow-hidden mb-3 shadow-inner">
                  <img src={dog.dog_photo} className="w-full h-full object-cover" alt={dog.name} />
                </div>
                <h4 className="font-black text-secondary text-lg mb-1">{dog.name}</h4>
                <p className="text-xs font-bold text-amber-800/60 mb-2 uppercase tracking-wide">{dog.breed}</p>
                <div className="flex items-center gap-1.5 text-xs font-black text-primary mb-5">
                   <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center">📍</div>
                   {dog.distance_km.toFixed(1)} km away
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-[#B45309] text-white rounded-xl text-[10px] font-black h-9 flex items-center gap-1"
                    onClick={() => navigate(`/profile/${dog.id}`)}
                  >
                    Profile 🐾
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-amber-200 text-secondary hover:bg-amber-50 rounded-xl text-[10px] font-black h-9 flex items-center gap-1"
                    onClick={() => openChat(dog)}
                  >
                    Chat 💬
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Mobile Bottom Sheet */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out border-t border-amber-50",
        isSheetExpanded ? "h-[70vh]" : "h-24 hover:h-28"
      )}>
        <div 
          className="w-full flex flex-col items-center py-4 cursor-grab active:cursor-grabbing"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
        >
          <div className="w-12 h-1.5 bg-amber-100 rounded-full mb-3" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-secondary uppercase tracking-widest">
              {filteredDogs.length} dogs near you 🐾
            </span>
            {isSheetExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronUp className="w-4 h-4 text-primary" />}
          </div>
        </div>

        <div className="px-6 pb-20 overflow-y-auto h-[calc(70vh-80px)]">
          <div className="grid grid-cols-1 gap-4">
            {filteredDogs.map(dog => (
              <div 
                key={dog.id} 
                className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-3xl border border-amber-100/50 hover:bg-amber-100/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${dog.id}`)}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm border-2 border-white shrink-0">
                  <img src={dog.dog_photo} className="w-full h-full object-cover" alt={dog.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-secondary truncate">{dog.name}</h4>
                  <p className="text-[10px] font-bold text-amber-800/40 uppercase tracking-wider">{dog.breed}</p>
                  <p className="text-[10px] font-black text-primary mt-1">📍 {dog.distance_km.toFixed(1)} km away</p>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full text-primary h-10 w-10 shrink-0">
                  🐾
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
