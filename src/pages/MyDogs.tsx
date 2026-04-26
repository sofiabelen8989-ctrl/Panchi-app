import React, { useState, useEffect } from 'react';
import { useDog } from '../contexts/DogContext';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Eye, Trash2, Camera, ChevronRight, ChevronLeft, 
  CheckCircle2, Info, Heart, Star, Sparkles, Dog as DogIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const BREEDS = [
  "Labrador", "Golden Retriever", "Bulldog", "Poodle", "Beagle", 
  "Dachshund", "Husky", "Chihuahua", "Shih Tzu", "Border Collie", 
  "Mixed breed", "Other"
];

const PERSONALITY_TAGS = [
  { id: 'fetch', label: '🎾 Fetch Lover' },
  { id: 'water', label: '💧 Loves Water' },
  { id: 'lazy', label: '😴 Lazy Mornings' },
  { id: 'running', label: '🏃 Running Buddy' },
  { id: 'friendly', label: '🐕 Friendly with all dogs' },
  { id: 'selective', label: '😾 Selective with dogs' },
  { id: 'kids', label: '👶 Great with kids' },
  { id: 'homebody', label: '🏠 Homebody' },
  { id: 'explorer', label: '🌳 Outdoor Explorer' },
  { id: 'food', label: '🍖 Food Motivated' },
  { id: 'learner', label: '🧠 Quick Learner' },
  { id: 'drama', label: '🎭 Drama Queen/King' },
];

export default function MyDogs() {
  const { myDogs, refreshDogs, loading, activeDog } = useDog();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDogId, setCurrentDogId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: 0,
    size: 'medium',
    energy_level: 'playful',
    personality_tags: [] as string[],
    dog_photo: null as string | null
  });

  // Automatically open modal if no dogs
  useEffect(() => {
    if (!loading && myDogs.length === 0 && !isModalOpen) {
      handleAddNew();
    }
  }, [loading, myDogs.length]);

  const handleAddNew = () => {
    setIsEditMode(false);
    setCurrentDogId(null);
    setFormData({
      name: '',
      breed: '',
      age: 0,
      size: 'medium',
      energy_level: 'playful',
      personality_tags: [],
      dog_photo: null
    });
    setStep(1);
    setIsModalOpen(true);
  };

  const handleEdit = (dog: any) => {
    setIsEditMode(true);
    setCurrentDogId(dog.id);
    setFormData({
      name: dog.name,
      breed: dog.breed,
      age: dog.age,
      size: dog.size,
      energy_level: dog.energy_level,
      personality_tags: dog.personality_tags,
      dog_photo: dog.dog_photo
    });
    setStep(1);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, dog_photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      personality_tags: prev.personality_tags.includes(tagId)
        ? prev.personality_tags.filter(t => t !== tagId)
        : [...prev.personality_tags, tagId]
    }));
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dogData = {
        owner_id: user.id,
        name: formData.name,
        breed: formData.breed,
        age: formData.age,
        size: formData.size,
        energy_level: formData.energy_level,
        personality_tags: formData.personality_tags,
        dog_photo: formData.dog_photo
      };

      if (isEditMode && currentDogId) {
        const { error } = await supabase
          .from('dogs')
          .update(dogData)
          .eq('id', currentDogId);
        if (error) throw error;
        toast.success(`${formData.name}'s profile updated! 🐾`);
      } else {
        const { error } = await supabase
          .from('dogs')
          .insert(dogData);
        if (error) throw error;
        toast.success(`${formData.name} joined the pack! 🐾`);
      }

      await refreshDogs();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!currentDogId) return;
    try {
      const { error } = await supabase
        .from('dogs')
        .delete()
        .eq('id', currentDogId);
      if (error) throw error;
      
      toast.success(`${formData.name} was removed from the pack`);
      await refreshDogs();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'calm': return 'bg-green-100 text-green-700 border-green-200';
      case 'playful': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'high energy': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && myDogs.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[400px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-8 min-h-screen bg-amber-50/30">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-amber-700 tracking-tight flex items-center gap-3">
            My Pack <span className="hidden sm:inline">🐾</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage your fuzzy family members</p>
        </div>
        <Button 
          onClick={handleAddNew}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6 py-6 shadow-lg shadow-amber-200 transition-all hover:scale-105 active:scale-95 text-lg font-bold"
        >
          <Plus className="mr-2 h-6 w-6" /> Add a Dog
        </Button>
      </header>

      {myDogs.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white/50 rounded-[3rem] border-2 border-dashed border-amber-200"
        >
          <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center text-6xl shadow-inner">
            🐾
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-secondary">Your pack is empty!</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">Add your first dog to start meeting others in the community.</p>
          </div>
          <Button 
            onClick={handleAddNew}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-8 py-7 shadow-xl shadow-amber-200 transition-all hover:scale-105 active:scale-95 text-xl font-black"
          >
            Add My First Dog 🐾
          </Button>
        </motion.div>
      ) : (
        <>
          {myDogs.length >= 5 && (
            <div className="bg-amber-100/50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 font-medium">
              <Sparkles className="h-5 w-5" />
              Wow, you have a big pack! 🐾 You're a true dog lover.
            </div>
          )}
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {myDogs.map((dog) => (
                <motion.div
                  key={dog.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 rounded-[2rem] group h-full flex flex-col bg-white">
                    <div className="relative h-56 w-full overflow-hidden">
                      {dog.dog_photo ? (
                        <img 
                          src={dog.dog_photo} 
                          alt={dog.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                          <DogIcon className="h-16 w-16 text-amber-300" />
                        </div>
                      )}
                      {activeDog?.id === dog.id && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> ACTIVE
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                         <p className="text-white text-xs font-medium">Click View Profile to see details</p>
                      </div>
                    </div>
                    <CardContent className="p-6 flex-grow space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-2xl font-black text-secondary tracking-tight">{dog.name}</h3>
                          <Badge className={cn("capitalize font-bold px-3 py-1 border", getEnergyColor(dog.energy_level))}>
                            {dog.energy_level}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground font-semibold mt-0.5">{dog.breed} • {dog.age} years</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {dog.personality_tags.slice(0, 3).map(tagId => {
                          const tag = PERSONALITY_TAGS.find(t => t.id === tagId);
                          return tag ? (
                            <span key={tagId} className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                              {tag.label.split(' ')[1]}
                            </span>
                          ) : null;
                        })}
                        {dog.personality_tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-bold">
                            +{dog.personality_tags.length - 3} MORE
                          </span>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="px-6 pb-6 pt-0 flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 rounded-xl font-bold h-11 border-2 border-gray-100 hover:bg-amber-50 hover:border-amber-200 transition-all"
                        onClick={() => handleEdit(dog)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                      </Button>
                      <Button 
                        className="flex-1 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold h-11 shadow-lg shadow-gray-200 transition-all hover:-translate-y-1"
                        onClick={() => navigate(`/profile/${dog.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Profile
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="bg-amber-500 p-8 text-white relative">
            <DialogTitle className="text-3xl font-black tracking-tight">
              {isEditMode ? `Update ${formData.name}'s Profile` : 'Add New Dog 🐾'}
            </DialogTitle>
            <DialogDescription className="text-white/80 font-medium mt-1">
              {isEditMode ? 'Keep your pup\'s information up to date!' : 'Tell us all about your furry friend.'}
            </DialogDescription>
            <div className="absolute -bottom-6 right-6 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-3xl">
              {step === 1 ? '🐶' : step === 2 ? '🎾' : '⭐'}
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <span>Step {step} of 3</span>
                <span>{Math.round((step / 3) * 100)}% Complete</span>
              </div>
              <Progress value={(step / 3) * 100} className="h-2 rounded-full" />
            </div>

            <ScrollArea className="max-h-[60vh] pr-4">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-sm font-bold text-secondary">Dog Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. Buddy" 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="rounded-xl border-2 border-gray-100 focus:border-amber-500 h-12 font-medium"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="breed" className="text-sm font-bold text-secondary">Breed</Label>
                      <Input 
                        id="breed" 
                        list="breeds-list"
                        placeholder="e.g. Dachshund" 
                        value={formData.breed}
                        onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                        className="rounded-xl border-2 border-gray-100 focus:border-amber-500 h-12 font-medium"
                      />
                      <datalist id="breeds-list">
                        {BREEDS.map(breed => <option key={breed} value={breed} />)}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="age" className="text-sm font-bold text-secondary">Age (Years)</Label>
                        <Input 
                          id="age" 
                          type="number"
                          min="0"
                          max="20"
                          value={formData.age}
                          onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                          className="rounded-xl border-2 border-gray-100 focus:border-amber-500 h-12 font-bold"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm font-bold text-secondary">Size</Label>
                        <RadioGroup 
                          value={formData.size} 
                          onValueChange={(val) => setFormData(prev => ({ ...prev, size: val }))}
                          className="flex gap-2"
                        >
                          {['small', 'medium', 'large'].map((s) => (
                            <Label key={s} className={cn(
                              "flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer transition-all",
                              formData.size === s ? "border-amber-500 bg-amber-50" : "border-gray-100 hover:bg-gray-50"
                            )}>
                              <RadioGroupItem value={s} className="sr-only" />
                              <span className="text-lg">{s === 'small' ? '🐭' : s === 'medium' ? '🐕' : '🦮'}</span>
                              <span className="text-[10px] font-bold uppercase">{s}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-sm font-bold text-secondary">Energy Level</Label>
                      <RadioGroup 
                        value={formData.energy_level} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, energy_level: val }))}
                        className="grid grid-cols-3 gap-3"
                      >
                        {['calm', 'playful', 'high energy'].map((level) => (
                          <Label key={level} className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all text-center",
                            formData.energy_level === level 
                              ? "border-amber-500 bg-amber-50 text-amber-700" 
                              : "border-gray-100 text-gray-500 hover:bg-gray-50"
                          )}>
                            <RadioGroupItem value={level} className="sr-only" />
                            <span className="text-xl">{level === 'calm' ? '😴' : level === 'playful' ? '🎾' : '⚡'}</span>
                            <span className="text-[10px] font-black uppercase leading-tight">{level}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-sm font-bold text-secondary">Dog Photo</Label>
                      <div 
                        className="relative h-40 w-full rounded-2xl border-2 border-dashed border-gray-200 hover:border-amber-300 transition-colors cursor-pointer group bg-gray-50 overflow-hidden"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        {formData.dog_photo ? (
                          <img src={formData.dog_photo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-amber-500">
                            <Camera className="h-8 w-8" />
                            <span className="text-xs font-bold uppercase">Upload Photo</span>
                          </div>
                        )}
                        <Input 
                          id="photo-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-secondary">What makes {formData.name} special?</h3>
                    <p className="text-sm text-muted-foreground font-medium">Select at least 1 tag that describes your pup.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PERSONALITY_TAGS.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "px-4 py-3 rounded-2xl border-2 text-sm font-bold text-left transition-all",
                          formData.personality_tags.includes(tag.id)
                            ? "border-amber-500 bg-amber-50 text-amber-700 shadow-md shadow-amber-100"
                            : "border-gray-100 text-gray-500 hover:border-amber-200 hover:bg-gray-50"
                        )}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="space-y-2">
                    <h3 className="text-xl font-black text-secondary">Review {formData.name}'s Profile</h3>
                    <p className="text-sm text-muted-foreground font-medium">Everything looks good? Join the pack! 🐾</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-[2rem] p-6 border-2 border-white shadow-inner space-y-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-2xl bg-amber-100 overflow-hidden shadow-md flex-shrink-0">
                        {formData.dog_photo ? (
                          <img src={formData.dog_photo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-2xl font-black text-secondary">{formData.name}</h4>
                        <p className="text-sm font-bold text-muted-foreground">{formData.breed} • {formData.age} years</p>
                        <div className="flex gap-2 pt-1">
                          <Badge className={cn("text-[10px] font-black uppercase", getEnergyColor(formData.energy_level))}>
                            {formData.energy_level}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-black uppercase border-gray-200 text-gray-500">
                            {formData.size}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Personality</h5>
                      <div className="flex flex-wrap gap-2">
                        {formData.personality_tags.map(tagId => {
                          const tag = PERSONALITY_TAGS.find(t => t.id === tagId);
                          return (
                            <span key={tagId} className="px-3 py-1.5 bg-white shadow-sm border border-gray-100 rounded-xl text-xs font-bold text-gray-700">
                              {tag?.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {isEditMode && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="w-full text-center text-xs font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest pt-2">
                          Remove dog from Panchi
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black text-secondary">Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground font-medium text-base">
                            Removing <span className="text-red-500 font-bold">{formData.name}</span> is permanent and will remove all their activities from Panchi. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-3">
                          <AlertDialogCancel className="rounded-xl border-2 font-bold h-12 flex-1">Keep Dog</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDelete}
                            className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold h-12 flex-1"
                          >
                            Yes, Remove Dog
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="p-8 bg-gray-50 flex border-t border-gray-100">
            <div className="flex justify-between w-full gap-4">
              {step > 1 ? (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)}
                  className="rounded-xl border-2 font-bold h-14 w-14 p-0 hover:bg-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              ) : <div className="w-14" />}
              
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1)}
                  disabled={!formData.name || (step === 2 && formData.personality_tags.length === 0)}
                  className="flex-grow rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black h-14 shadow-lg shadow-amber-200 text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  className="flex-grow rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black h-14 shadow-lg shadow-amber-200 text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isEditMode ? 'Update Profile ✨' : 'Join the Pack! 🐾'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
