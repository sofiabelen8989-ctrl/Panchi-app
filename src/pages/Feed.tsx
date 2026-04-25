/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Dog, Owner } from "../types";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Filter, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Feed() {
  const [dogs, setDogs] = useState<any[]>([]);
  const [myDog, setMyDog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSize, setFilterSize] = useState<string>("all");
  const [filterEnergy, setFilterEnergy] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [requests, setRequests] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current user's dog
      const { data: myDogData } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      setMyDog(myDogData);

      // Fetch all dogs + owners
      let query = supabase
        .from('dogs')
        .select('*, owners(first_name, neighborhood, owner_photo)')
        .order('created_at', { ascending: false });
      
      if (myDogData) {
        query = query.neq('id', myDogData.id);
      }

      const { data: dogsData } = await query;
      setDogs(dogsData || []);

      // Fetch sent requests
      if (myDogData) {
        const { data: reqData } = await supabase
          .from('playdate_requests')
          .select('receiver_dog_id')
          .eq('requester_dog_id', myDogData.id);
        
        if (reqData) {
          setRequests(new Set(reqData.map(r => r.receiver_dog_id)));
        }
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (targetDogId: string) => {
    if (!myDog) return;
    
    try {
      const { error } = await supabase.from('playdate_requests').insert({
        requester_dog_id: myDog.id,
        receiver_dog_id: targetDogId,
        status: 'pending'
      });

      if (error) throw error;
      setRequests(prev => new Set([...prev, targetDogId]));
      toast.success("Playdate request sent! 🐾");
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast.error("Failed to send request: " + error.message);
    }
  };

  const handleContact = async (targetDogId: string) => {
    if (!myDog) return;
    setActionLoading(targetDogId);
    
    try {
      // Feature 1: Contact Owner Button logic
      // Check for existing conversation
      const { data: existing, error: searchError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(dog_one_id.eq.${myDog.id},dog_two_id.eq.${targetDogId}),and(dog_one_id.eq.${targetDogId},dog_two_id.eq.${myDog.id})`)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existing) {
        // Conversation already exists
        navigate(`/chat/${existing.id}`);
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            dog_one_id: myDog.id,
            dog_two_id: targetDogId
          })
          .select()
          .single();

        if (createError) throw createError;
        navigate(`/chat/${newConv.id}`);
      }
    } catch (error: any) {
      console.error("Error initiating chat:", error);
      toast.error("Failed to start chat: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredDogs = dogs.filter(dog => {
    const matchSize = filterSize === 'all' || dog.size === filterSize;
    const matchEnergy = filterEnergy === 'all' || dog.energy_level === filterEnergy;
    const matchSearch = !searchQuery || 
      dog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dog.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dog.personality_tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchSize && matchEnergy && matchSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="w-full aspect-square rounded-[2rem]" />
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!myDog) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-black text-secondary mb-4 tracking-tight">You haven't added your dog yet!</h2>
        <p className="text-amber-800/60 font-medium mb-8">Create your dog's profile to start connecting with other owners 🐾</p>
        <Button 
          onClick={() => navigate('/create-profile')}
          className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-10 font-bold shadow-xl shadow-amber-600/20 text-lg"
        >
          Create Profile Now
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-amber-100 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-800/40 w-5 h-5" />
          <Input 
            placeholder="Search breeds or personalities..." 
            className="pl-10 h-10 border-amber-100 rounded-xl"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <Select value={filterSize} onValueChange={setFilterSize}>
            <SelectTrigger className="w-full md:w-40 border-amber-100 rounded-xl h-10 bg-white">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes</SelectItem>
              <SelectItem value="Small">Small</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Large">Large</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEnergy} onValueChange={setFilterEnergy}>
            <SelectTrigger className="w-full md:w-44 border-amber-100 rounded-xl h-10 bg-white">
              <SelectValue placeholder="Energy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Energy</SelectItem>
              <SelectItem value="Calm">Calm</SelectItem>
              <SelectItem value="Playful">Playful</SelectItem>
              <SelectItem value="High Energy">High Energy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDogs.map((dog, idx) => (
          <motion.div
            key={dog.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <DogFeedCard 
              dog={dog} 
              isRequested={requests.has(dog.id)} 
              onRequest={() => handleRequest(dog.id)} 
              onContact={() => handleContact(dog.id)}
              isActionLoading={actionLoading === dog.id}
            />
          </motion.div>
        ))}
      </div>
      {filteredDogs.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-secondary font-bold text-xl">No dogs found matching your filters 🐾</p>
        </div>
      )}
    </div>
  );
}

function DogFeedCard({ 
  dog, 
  isRequested, 
  onRequest, 
  onContact, 
  isActionLoading 
}: { 
  dog: any, 
  isRequested: boolean, 
  onRequest: () => void, 
  onContact: () => void,
  isActionLoading: boolean
}) {
  const navigate = useNavigate();
  return (
    <Card className="rounded-[2rem] p-4 shadow-lg border border-amber-50 flex flex-col bg-white hover:-translate-y-2 transition-all duration-300 group">
      <div 
        className="w-full aspect-square bg-amber-100 rounded-2xl mb-4 overflow-hidden relative cursor-pointer"
        onClick={() => navigate(`/profile/${dog.id}`)}
      >
        <img 
          src={dog.dog_photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'} 
          alt={dog.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-secondary shadow-sm flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary" />
          {dog.owners?.neighborhood || 'Nearby'}
        </div>
      </div>
      <CardContent className="p-0 mb-4 px-1">
        <h3 
          className="text-xl font-bold text-secondary group-hover:text-primary transition-colors cursor-pointer"
          onClick={() => navigate(`/profile/${dog.id}`)}
        >
          {dog.name}
        </h3>
        <p className="text-amber-800/60 font-semibold text-xs mb-3">{dog.breed} • {dog.age} years</p>
        <div className="flex flex-wrap gap-1.5">
          {dog.personality_tags?.slice(0, 2).map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-100">
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-3 border-t border-amber-50 mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full px-1 py-1">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-100 bg-blue-50">
            <img 
              src={dog.owners?.owner_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dog.owners?.first_name}`} 
              alt={dog.owners?.first_name} 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[10px] font-bold text-amber-900/40 uppercase tracking-tighter">
            Owner: <span className="text-secondary">{dog.owners?.first_name}</span>
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button 
            disabled={isRequested}
            onClick={onRequest}
            className={`h-10 px-2 text-[11px] font-bold rounded-xl transition-all ${
              isRequested 
              ? "bg-green-500 text-white hover:bg-green-500 cursor-default shadow-md shadow-green-100" 
              : "bg-primary hover:bg-[#B45309] text-white shadow-md shadow-amber-600/10"
            }`}
          >
            {isRequested ? "Sent ✓" : "Request 🐾"}
          </Button>

          <Button 
            onClick={onContact}
            disabled={isActionLoading}
            variant="outline"
            className="h-10 px-2 text-[11px] font-bold rounded-xl border-amber-200 text-secondary hover:bg-amber-50 transition-all flex items-center justify-center gap-1"
          >
            {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Chat 💬</>}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
