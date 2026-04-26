import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useRef, MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, MessageCircle, User, Navigation, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatDogAge } from '@/lib/utils';

// DEFAULT CONSTANTS
const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 3;

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
  userLocation: { latitude: number, longitude: number } | null;
}

// Component to capture map instance
const MapController = ({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

export default function MapComponent({ userLocation }: MapProps) {
  const [radius, setRadius] = useState([10]); // km
  const [nearbyDogs, setNearbyDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [energyFilter, setEnergyFilter] = useState<'all' | 'calm' | 'playful' | 'high energy'>('all');
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [hasMovedMap, setHasMovedMap] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (userLocation) {
      fetchNearbyDogs(userLocation.latitude, userLocation.longitude);
    } else {
      setLoading(false);
    }
  }, [userLocation, radius]);

  const fetchNearbyDogs = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_nearby_dogs', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radius[0]
      });

      if (error) throw error;
      setNearbyDogs(data || []);
    } catch (error: any) {
      console.error("Error fetching nearby dogs:", error);
      toast.error("Sniffing failed... Trying alternative hunt! 🐾");
      
      const { data: allDogs } = await supabase.from('dogs').select('*, owners(first_name, owner_photo)');
      if (allDogs) {
        const withDistance = allDogs.map(dog => {
          if (!dog.latitude || !dog.longitude) return null;
          const dist = calculateDistance(lat, lng, dog.latitude, dog.longitude);
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

  // nominatim search
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(searchQuery)}` +
        `&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'PanchiApp/1.0'
          }
        }
      );
      const data = await response.json();
      if (data.length === 0) {
        toast.error("No locations found 🐾");
      }
      setSearchResults(data);
    } catch (error) {
      toast.error('Could not search location 🐾');
    } finally {
      setIsSearching(false);
    }
  };

  const jumpToLocation = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 13, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }

    fetchNearbyDogs(lat, lng);
    setSearchQuery(result.display_name.split(',')[0]);
    setSearchResults([]);
    setHasMovedMap(false);
  };

  const goToMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 14, {
            duration: 1.5
          });
        }
        fetchNearbyDogs(lat, lng);
        setHasMovedMap(false);
      },
      () => toast.error('Could not get your location 🐾')
    );
  };

  const MapEventHandler = () => {
    const map = useMapEvents({
      moveend: () => {
        const center = map.getCenter();
        setMapCenter({ 
          lat: center.lat, 
          lng: center.lng 
        });
        setHasMovedMap(true);
      }
    });
    return null;
  };

  const filteredDogs = nearbyDogs.filter(dog => {
    if (filter !== 'all' && dog.size?.toLowerCase() !== filter) return false;
    if (energyFilter !== 'all' && dog.energy_level?.toLowerCase() !== energyFilter) return false;
    return true;
  });

  const openChat = async (dog: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/auth');
    
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
          <p className="mt-6 text-2xl font-black text-secondary tracking-tight">Sniffing out dogs... 🐾</p>
        </div>
      )}

      {/* Search dogs in this area button */}
      {hasMovedMap && mapCenter && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001]">
          <button
            onClick={() => {
              fetchNearbyDogs(mapCenter.lat, mapCenter.lng);
              setHasMovedMap(false);
            }}
            className="bg-white text-amber-700 font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-2xl border-2 border-amber-500 hover:bg-amber-50 transition-all active:scale-95 flex items-center gap-2 animate-in fade-in slide-in-from-top-4"
          >
            <Search className="w-4 h-4" />
            Search dogs in this area
          </button>
        </div>
      )}

      {/* Map Control Panel */}
      <div className="absolute top-4 right-4 z-[1000] w-72 md:w-80">
        <div className="bg-white/90 backdrop-blur-md border border-amber-100 rounded-[2rem] p-6 shadow-2xl space-y-6">
          {/* SEARCH BAR */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchLocation();
                  }}
                  placeholder="Search city... 🔍"
                  className="w-full h-11 pl-4 pr-10 rounded-xl border border-amber-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={searchLocation}
                disabled={isSearching}
                className="h-11 px-4 bg-amber-600 text-white rounded-xl text-sm font-black hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-2xl border border-amber-100 overflow-hidden z-50 max-h-60 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => jumpToLocation(result)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-amber-50 border-b border-amber-50 last:border-0 transition-colors"
                  >
                    <span className="font-bold text-amber-800 block">
                      {result.display_name.split(',')[0]}
                    </span>
                    <span className="text-gray-400 text-[10px] block truncate font-medium">
                      {result.display_name.split(',').slice(1, 4).join(',')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

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

          <div className="pt-4 border-t border-amber-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-primary border border-amber-100">
                  <Navigation className="w-4 h-4" />
                </div>
                <span className="font-bold text-secondary text-sm">
                  {filteredDogs.length} dogs found
                </span>
              </div>
            </div>
            
            <Button 
              className="w-full h-11 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-black border border-amber-200 transition-colors flex items-center justify-center gap-2"
              onClick={goToMyLocation}
            >
              📍 My Location
            </Button>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-amber-800/40 tracking-widest">Size Filter</label>
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

      <MapContainer 
        center={userLocation ? [userLocation.latitude, userLocation.longitude] : DEFAULT_CENTER} 
        zoom={userLocation ? 14 : DEFAULT_ZOOM} 
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
        touchZoom={true}
        boxZoom={true}
        keyboard={true}
        style={{ height: '100%', width: '100%', zIndex: 1, cursor: 'grab' }}
      >
        <MapController mapRef={mapRef} />
        <MapEventHandler />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && (
          <>
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
          </>
        )}

        {filteredDogs.map((dog) => (
          <Marker 
            key={dog.id} 
            position={[dog.latitude, dog.longitude]} 
            icon={dogIcon(dog.dog_photo)}
          >
            <Popup className="dog-popup rounded-[1.5rem] overflow-hidden p-0">
              <div className="p-3 min-w-[200px]">
                <div className="w-full h-32 rounded-2xl overflow-hidden mb-3 shadow-inner text-center bg-amber-50 flex items-center justify-center">
                  {dog.dog_photo ? (
                    <img src={dog.dog_photo} className="w-full h-full object-cover" alt={dog.name} />
                  ) : (
                    <span className="text-3xl">🐾</span>
                  )}
                </div>
                <h4 className="font-black text-secondary text-lg mb-1">{dog.name}</h4>
                <p className="text-[10px] font-bold text-amber-800/60 mb-2 uppercase tracking-wide">{dog.breed} • {formatDogAge(dog.age, dog.age_unit)}</p>
                <div className="flex items-center gap-1.5 text-xs font-black text-primary mb-5">
                   <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center">📍</div>
                   {dog.distance_km ? `${dog.distance_km.toFixed(1)} km away` : 'Nearby'}
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
        "md:hidden fixed bottom-16 left-0 right-0 z-[1001] bg-white rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out border-t border-amber-50",
        isSheetExpanded ? "h-[70vh]" : "h-24"
      )}>
        <div 
          className="w-full flex flex-col items-center py-4 cursor-grab active:cursor-grabbing"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
        >
          <div className="w-12 h-1.5 bg-amber-100 rounded-full mb-3" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-secondary uppercase tracking-widest">
              {filteredDogs.length} dogs found 🐾
            </span>
            {isSheetExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronUp className="w-4 h-4 text-primary" />}
          </div>
        </div>

        <div className="px-6 pb-20 overflow-y-auto h-[calc(70vh-80px)]">
          <div className="grid grid-cols-1 gap-4">
            {filteredDogs.length > 0 ? filteredDogs.map(dog => (
              <div 
                key={dog.id} 
                className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-3xl border border-amber-100/50 hover:bg-amber-100/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${dog.id}`)}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm border-2 border-white shrink-0">
                  {dog.dog_photo ? (
                    <img src={dog.dog_photo} className="w-full h-full object-cover" alt={dog.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-amber-100">🐾</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-secondary truncate">{dog.name}</h4>
                  <p className="text-[10px] font-bold text-amber-800/40 uppercase tracking-wider">{dog.breed} • {formatDogAge(dog.age, dog.age_unit)}</p>
                  <p className="text-[10px] font-black text-primary mt-1">📍 {dog.distance_km ? `${dog.distance_km.toFixed(1)} km away` : 'Nearby'}</p>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full text-primary h-10 w-10 shrink-0">
                  🐾
                </Button>
              </div>
            )) : (
              <div className="bg-amber-50/50 p-10 rounded-3xl border border-dashed border-amber-200 text-center py-20">
                <p className="text-sm font-bold text-amber-800/40">No dogs found in this area. Move the map and try searching again! 🐾</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

