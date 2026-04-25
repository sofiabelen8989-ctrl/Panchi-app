/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navbar, Hero } from "../components/PanchiUI";
import { DogCard } from "../components/PanchiUI";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function Home() {
  const navigate = useNavigate();
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchFeaturedDogs();
  }, []);

  const handleFindNearby = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in to save your location 🐾");
      navigate('/auth');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Update owner location
          await supabase.from('owners')
            .update({ latitude, longitude })
            .eq('id', session.user.id);
          
          // Update user's dogs location
          await supabase.from('dogs')
            .update({ latitude, longitude })
            .eq('owner_id', session.user.id);

          toast.success("Location updated! 🐾");
          navigate('/map');
        } catch (error) {
          console.error("Error updating location:", error);
          toast.error("Failed to sync location with the pack.");
          navigate('/map'); // Still go to map even if DB update fails
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        toast.error("Could not get your location. Please enable location access 🐾");
      }
    );
  };

  const fetchFeaturedDogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('dogs')
        .select('*, owners(first_name, owner_photo)')
        .limit(3);
      
      if (data) setDogs(data);
    } catch (error) {
      console.error("Error fetching featured dogs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto pb-20">
      <Hero onFindNearby={handleFindNearby} loading={locationLoading} />
      
      <div className="px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-secondary tracking-tight">Nearby Playmates</h2>
          <Button variant="link" onClick={() => navigate('/feed')} className="text-primary font-bold hover:underline">View all</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-96 rounded-[2rem] w-full" />)
          ) : (
            dogs.map((dog) => (
              <DogCard 
                key={dog.id} 
                name={dog.name}
                breed={dog.breed}
                age={dog.age + " years"}
                personality={dog.personality_tags || []}
                distance={"Nearby"}
                imageUrl={dog.dog_photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'}
                ownerName={dog.owners?.first_name || 'Owner'}
                ownerAvatar={dog.owners?.owner_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dog.id}`}
                onClick={() => navigate(`/profile/${dog.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
