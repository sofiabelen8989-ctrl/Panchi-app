/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dog, Owner } from "../types";
import { Sparkles, ArrowRight, ArrowLeft, Camera, PawPrint, User, Loader2, MapPin } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

const PERSONALITY_OPTIONS = [
  'Playful', 'Calm', 'Loves Fetch', 'Social', 'Gentle', 'High Energy', 
  'Loves Water', 'Independent', 'Quiet', 'Snack Lover', 'Barker', 'Fast Runner'
];

export function CreateProfile() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    personality: [],
    size: 'Medium',
    energyLevel: 'Playful',
    name: '',
    breed: '',
    age: '',
    ownerFirstName: '',
    city: '',
    latitude: null,
    longitude: null
  });

  const [dogPhoto, setDogPhoto] = useState<string>('');
  const [ownerPhoto, setOwnerPhoto] = useState<string>('');
  const dogPhotoInputRef = useRef<HTMLInputElement>(null);
  const ownerPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateFormData({ latitude, longitude });

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then(r => r.json())
          .then(data => {
            const neighborhood = data.address.suburb || data.address.neighbourhood || data.address.city || data.address.town || "";
            updateFormData({ city: neighborhood });
            toast.success("Location found! 🐾");
          })
          .catch(err => {
            console.error("Reverse geocoding error:", err);
            toast.error("Could not find neighborhood name, but saved your position!");
          })
          .finally(() => setLocationLoading(false));
      },
      (error) => {
        setLocationLoading(false);
        toast.error("Could not get your location. Please enable location access 🐾");
      }
    );
  };

  const handlePhotoUpload = (setter: (val: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateFormData = (data: any) => setFormData(prev => ({ ...prev, ...data }));

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      // Feature 2: Save Owner Profile
      const { error: ownerError } = await supabase.from('owners').update({
        first_name: formData.ownerFirstName,
        neighborhood: formData.city,
        owner_photo: ownerPhoto,
        latitude: formData.latitude,
        longitude: formData.longitude
      }).eq('id', user.id);

      if (ownerError) throw ownerError;

      // Feature 3: Save Dog Profile
      const { data: dogData, error: dogError } = await supabase.from('dogs').insert({
        owner_id: user.id,
        name: formData.name,
        breed: formData.breed,
        age: parseInt(formData.age) || 0,
        size: formData.size,
        energy_level: formData.energyLevel,
        personality_tags: formData.personality,
        dog_photo: dogPhoto,
        latitude: formData.latitude,
        longitude: formData.longitude
      }).select().single();

      if (dogError) throw dogError;

      navigate(`/profile/${dogData.id}`);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-3xl shadow-lg border border-amber-100 mb-4">
            <PawPrint className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-secondary">Create your Dog's Profile</h1>
          <p className="text-amber-800/60 font-medium">Join the Panchi pack in 3 simple steps!</p>
        </div>

        {/* Sticky Progress Section */}
        <div className="sticky top-0 bg-amber-50 pt-4 pb-4 z-10 space-y-2">
          <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest px-1">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2 bg-amber-200" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="pb-24"
          >
            <Card className="rounded-[2.5rem] border-amber-50 shadow-xl overflow-hidden bg-white">
              <CardHeader className="bg-amber-50/50 border-b border-amber-100/50 pb-8 pt-8 px-8">
                <CardTitle className="text-2xl font-bold text-secondary flex items-center gap-2">
                  {step === 1 && "Dog's Basic Info"}
                  {step === 2 && "Personality & Vibe"}
                  {step === 3 && "Owner Details"}
                  <Sparkles className="w-5 h-5 text-primary" />
                </CardTitle>
                <CardDescription className="font-medium text-amber-800/60">
                  {step === 1 && "Tell us about your furry best friend."}
                  {step === 2 && "What makes your pup unique?"}
                  {step === 3 && "Almost there! Just a bit about you."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="font-bold text-secondary">Dog's Name</Label>
                        <Input 
                          id="name" 
                          placeholder="Buddy" 
                          className="rounded-xl border-amber-100" 
                          value={formData.name || ''}
                          onChange={e => updateFormData({ name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="breed" className="font-bold text-secondary">Breed</Label>
                        <Input 
                          id="breed" 
                          placeholder="Labrador" 
                          className="rounded-xl border-amber-100" 
                          value={formData.breed || ''}
                          onChange={e => updateFormData({ breed: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age" className="font-bold text-secondary">Age</Label>
                        <Input 
                          id="age" 
                          placeholder="e.g. 2 years" 
                          className="rounded-xl border-amber-100" 
                          value={formData.age || ''}
                          onChange={e => updateFormData({ age: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-secondary">Size</Label>
                        <RadioGroup 
                          value={formData.size} 
                          onValueChange={val => updateFormData({ size: val })}
                          className="flex gap-4 pt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Small" id="s" />
                            <Label htmlFor="s" className="text-xs font-bold text-gray-500">S</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Medium" id="m" />
                            <Label htmlFor="m" className="text-xs font-bold text-gray-500">M</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Large" id="l" />
                            <Label htmlFor="l" className="text-xs font-bold text-gray-500">L</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="font-bold text-secondary">Dog Photo</Label>
                      <div className="flex flex-col items-center gap-4">
                        {dogPhoto ? (
                          <div className="w-[200px] h-[200px] rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                            <img src={dogPhoto} alt="Dog preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-[200px] h-[200px] rounded-2xl bg-amber-50 border-2 border-dashed border-amber-200 flex flex-col items-center justify-center text-amber-300">
                            <span className="text-4xl mb-2">🐾</span>
                            <p className="text-xs font-bold uppercase tracking-wider">No photo selected</p>
                          </div>
                        )}
                        
                        <input 
                          type="file" 
                          accept="image/*" 
                          ref={dogPhotoInputRef} 
                          onChange={handlePhotoUpload(setDogPhoto)} 
                          className="hidden" 
                        />
                        
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => dogPhotoInputRef.current?.click()}
                          className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-bold px-6 border-none"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {dogPhoto ? "Change dog photo" : "Upload Dog Photo 📷"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="font-bold text-secondary">Select Personality Tags</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {PERSONALITY_OPTIONS.map(tag => (
                          <div key={tag} className="flex items-center space-x-2 p-2 rounded-xl hover:bg-amber-50/50 transition-colors">
                            <Checkbox 
                              id={tag} 
                              checked={formData.personality?.includes(tag)}
                              onCheckedChange={(checked) => {
                                const personality = formData.personality || [];
                                const updated = checked 
                                  ? [...personality, tag] 
                                  : personality.filter(p => p !== tag);
                                updateFormData({ personality: updated });
                              }}
                            />
                            <label htmlFor={tag} className="text-sm font-semibold text-amber-800 cursor-pointer">{tag}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="font-bold text-secondary">Energy Level</Label>
                      <RadioGroup 
                        value={formData.energyLevel} 
                        onValueChange={val => updateFormData({ energyLevel: val })}
                        className="flex flex-col gap-2"
                      >
                        {['Calm', 'Playful', 'High Energy'].map(lvl => (
                          <div key={lvl} className="flex items-center space-x-2 border border-amber-100 p-3 rounded-xl">
                            <RadioGroupItem value={lvl} id={lvl} />
                            <Label htmlFor={lvl} className="font-bold text-amber-800">{lvl}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8">
                    {/* Owner Photo Upload */}
                    <div className="space-y-4 pt-2">
                      <Label className="font-bold text-secondary text-center block">Owner Photo</Label>
                      <div className="flex flex-col items-center gap-4">
                        {ownerPhoto ? (
                          <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-white shadow-lg">
                            <img src={ownerPhoto} alt="Owner preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-[80px] h-[80px] rounded-full bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center text-amber-300">
                            <span className="text-2xl">🧑</span>
                          </div>
                        )}
                        
                        <input 
                          type="file" 
                          accept="image/*" 
                          ref={ownerPhotoInputRef} 
                          onChange={handlePhotoUpload(setOwnerPhoto)} 
                          className="hidden" 
                        />
                        
                        <div className="text-center">
                          <Button 
                            type="button"
                            variant="ghost"
                            onClick={() => ownerPhotoInputRef.current?.click()}
                            className="rounded-full text-primary font-bold hover:bg-primary/5 h-auto py-1"
                          >
                            {ownerPhoto ? "Change your photo" : "Upload Your Photo 🧑"}
                          </Button>
                          <p className="text-[10px] text-amber-800/40 mt-1 max-w-[200px] mx-auto">
                            Add a photo of yourself so other owners know who they are meeting at the playdate 🐾
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="ofn" className="font-bold text-secondary">Your First Name</Label>
                        <Input 
                          id="ofn" 
                          placeholder="Sofia" 
                          className="rounded-xl border-amber-100" 
                          value={formData.ownerFirstName || ''}
                          onChange={e => updateFormData({ ownerFirstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="city" className="font-bold text-secondary">Your Neighborhood / City</Label>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleUseCurrentLocation}
                            disabled={locationLoading}
                            className="h-auto py-0 text-primary hover:text-primary/70 font-bold text-xs"
                          >
                            {locationLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : "📍"} Use my location
                          </Button>
                        </div>
                        <Input 
                          id="city" 
                          placeholder="Barcelona" 
                          className="rounded-xl border-amber-100" 
                          value={formData.city || ''}
                          onChange={e => updateFormData({ city: e.target.value })}
                        />
                      </div>
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <p className="text-xs font-bold text-amber-800 leading-relaxed text-center">
                          🐾 By creating a profile, you agree to follow the Panchi neighborhood guidelines for safe playdates.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Fixed Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-amber-100 p-4 flex gap-3 md:relative md:border-0 md:bg-transparent md:mt-8 md:p-0">
          {step > 1 && (
            <Button variant="outline" onClick={prevStep} className="flex-1 rounded-2xl h-12 border-amber-200 text-amber-800 font-bold bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          <Button 
            onClick={step === 3 ? handleSubmit : nextStep}
            disabled={loading}
            className="flex-[2] rounded-2xl h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
              <>
                {step === 3 ? "Complete Profile" : "Continue"} <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
