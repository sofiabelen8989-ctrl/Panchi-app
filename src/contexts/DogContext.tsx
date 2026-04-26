import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age: number;
  size: string;
  energy_level: string;
  personality_tags: string[];
  dog_photo: string | null;
  created_at: string;
}

interface DogContextType {
  myDogs: Dog[];
  activeDog: Dog | null;
  setActiveDog: (dog: Dog) => void;
  refreshDogs: () => Promise<void>;
  loading: boolean;
}

const DogContext = createContext<DogContextType | undefined>(undefined);

export function DogProvider({ children }: { children: React.ReactNode }) {
  const [myDogs, setMyDogs] = useState<Dog[]>([]);
  const [activeDog, setActiveDogState] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshDogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMyDogs([]);
      setActiveDogState(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMyDogs(data);
      
      const storedActiveId = localStorage.getItem('activeDogId');
      const foundActive = data.find(d => d.id === storedActiveId) || data[0] || null;
      
      setActiveDogState(foundActive);
      if (foundActive) {
        localStorage.setItem('activeDogId', foundActive.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshDogs();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshDogs();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refreshDogs]);

  const setActiveDog = (dog: Dog) => {
    setActiveDogState(dog);
    localStorage.setItem('activeDogId', dog.id);
  };

  return (
    <DogContext.Provider value={{ myDogs, activeDog, setActiveDog, refreshDogs, loading }}>
      {children}
    </DogContext.Provider>
  );
}

export function useDog() {
  const context = useContext(DogContext);
  if (context === undefined) {
    throw new Error('useDog must be used within a DogProvider');
  }
  return context;
}
