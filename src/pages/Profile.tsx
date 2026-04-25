/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Dog, Owner } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Heart, ShieldCheck, Edit3, Camera, Loader2, Plus, MessageCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "../lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Profile() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const [dog, setDog] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const dogPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDog();
  }, [dogId]);

  useEffect(() => {
    if (dog?.id) {
      fetchPosts();
    }
  }, [dog?.id]);

  const fetchPosts = async () => {
    if (!dog?.id) return;
    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          owners(id, first_name, owner_photo),
          dogs(id, name, dog_photo),
          likes(id, owner_id),
          comments(
            id, content, created_at,
            owners(first_name, owner_photo)
          )
        `)
        .eq('dog_id', dog.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchDog = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let targetId = dogId;

      if (dogId === 'me') {
        if (!user) {
          navigate('/auth');
          return;
        }
        const { data: myDog } = await supabase.from('dogs').select('id').eq('owner_id', user.id).maybeSingle();
        if (!myDog) {
          navigate('/create-profile');
          return;
        }
        targetId = myDog.id;
        setIsMe(true);
      } else {
        // Check if this dog belongs to current user
        if (user) {
          const { data: checkDog } = await supabase.from('dogs').select('owner_id').eq('id', targetId).maybeSingle();
          if (checkDog?.owner_id === user.id) setIsMe(true);
        }
      }

      const { data: dogData, error } = await supabase
        .from('dogs')
        .select('*, owners(*)')
        .eq('id', targetId)
        .single();
      
      if (error) throw error;
      setDog(dogData);
      setEditName(dogData.name);
      setEditBreed(dogData.breed);
    } catch (error) {
      console.error("Error fetching dog:", error);
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!dog || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('dogs')
        .update({
          name: editName,
          breed: editBreed,
          dog_photo: editPhoto || dog.dog_photo
        })
        .eq('id', dog.id);

      if (error) throw error;
      
      setDog((prev: any) => ({
        ...prev,
        name: editName,
        breed: editBreed,
        dog_photo: editPhoto || prev.dog_photo
      }));
      setIsEditing(false);
    } catch (error: any) {
      alert("Error saving profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <span className="font-bold text-secondary">Fetching the pack...</span>
    </div>
  );

  if (!dog) return <div className="p-20 text-center font-bold text-secondary">Dog not found 🐾</div>;

  const dogImage = dog.dog_photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
  const owner = dog.owners;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 mt-6 md:mt-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-amber-50"
      >
        {/* Hero Section */}
        <div className="relative h-80 md:h-[450px]">
          <img src={dogImage} alt={dog.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8 md:p-12">
            <div className="text-white">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2">{dog.name}</h1>
              <p className="text-lg md:text-xl font-medium text-white/90 flex items-center gap-2">
                {dog.breed} • {dog.age} years old
              </p>
            </div>
          </div>
          
          {isMe && (
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-full hover:bg-white/30">
                  <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-amber-50">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-secondary tracking-tight">Edit Dog Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-amber-50 relative group">
                      <img src={editPhoto || dogImage} alt="Edit preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => dogPhotoInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Camera className="w-6 h-6" />
                      </button>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={dogPhotoInputRef} 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => dogPhotoInputRef.current?.click()}
                      className="text-primary font-bold hover:bg-primary/5"
                    >
                      Change Photo
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-bold text-secondary text-xs uppercase tracking-widest pl-1">Dog's Name</Label>
                    <Input 
                      id="name" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)}
                      className="rounded-xl border-amber-100" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed" className="font-bold text-secondary text-xs uppercase tracking-widest pl-1">Breed</Label>
                    <Input 
                      id="breed" 
                      value={editBreed} 
                      onChange={e => setEditBreed(e.target.value)}
                      className="rounded-xl border-amber-100" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={saveProfile} 
                    disabled={isSaving}
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 font-bold shadow-lg shadow-amber-600/20 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            {/* Personality section */}
            <section>
              <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary fill-primary" /> Personality
              </h2>
              <div className="flex flex-wrap gap-3">
                {dog.personality_tags?.map((tag: string) => (
                  <span key={tag} className="px-5 py-2.5 bg-amber-50 text-amber-800 font-bold rounded-2xl text-sm border border-amber-100 shadow-sm transition-transform hover:scale-105">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Playdate History */}
            <section>
              <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" /> Playdate History
              </h2>
              <div className="space-y-4">
                {[
                  { id: 'h1', date: 'Last week', companionName: 'Bork', status: 'Completed', location: 'Neighborhood Park' },
                  { id: 'h2', date: '2 weeks ago', companionName: 'Daisy', status: 'Completed', location: 'Sunshine Field' }
                ].map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl shadow-sm">
                        🐕
                      </div>
                      <div>
                        <h4 className="font-bold text-secondary">Playdate with {h.companionName}</h4>
                        <p className="text-xs text-amber-800/60 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {h.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">{h.date}</p>
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Dog's Moments Section */}
            <section className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
                  <Camera className="w-6 h-6 text-primary" /> {dog.name}'s Moments
                </h2>
                {isMe && (
                  <CreatePostModal 
                    currentUser={{ id: owner.id }} // Assuming owner.id is the current user's id since isMe is true
                    onSuccess={fetchPosts}
                    trigger={
                      <Button size="sm" className="bg-primary hover:bg-[#B45309] text-white rounded-full h-10 w-10 p-0 shadow-lg shadow-amber-600/20">
                        <Plus className="h-5 w-5" />
                      </Button>
                    }
                  />
                )}
              </div>

              {postsLoading ? (
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-amber-50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="py-12 text-center bg-amber-50/50 rounded-3xl border border-dashed border-amber-200">
                  <p className="text-amber-800/60 font-medium italic">No moments shared yet. Be the first to share! 🐾</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  {posts.map((post) => (
                    <PostLightbox key={post.id} post={post} currentUser={{ id: owner.id }} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            {/* Owner Section */}
            <section className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">The Human</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full border-2 border-white shadow-md overflow-hidden bg-white">
                  <img src={owner?.owner_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${owner?.first_name}`} alt={owner?.first_name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-secondary text-lg">{owner?.first_name}</h4>
                  <p className="text-xs text-secondary/60 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {owner?.neighborhood}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-amber-800/80 leading-relaxed mb-6 italic">
                "{owner?.bio || 'Just a dog lover looking for some fun playmates for my pup!'}"
              </p>
              <Button variant="outline" className="w-full rounded-xl border-amber-200 text-amber-800 font-bold hover:bg-amber-100">
                Contact Owner
              </Button>
            </section>

            {/* Quick Stats */}
            <div className="bg-secondary p-6 rounded-3xl text-white shadow-xl shadow-secondary/20">
               <div className="flex items-center gap-2 mb-4">
                 <ShieldCheck className="w-5 h-5 text-primary" />
                 <span className="font-bold">Verified Panchi</span>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between text-sm">
                   <span className="text-white/60">Dog Size</span>
                   <span className="font-bold">{dog.size}</span>
                 </div>
                 <Separator className="bg-white/10" />
                 <div className="flex justify-between text-sm">
                   <span className="text-white/60">Energy</span>
                   <span className="font-bold">{dog.energy_level}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface PostLightboxProps {
  post: any;
  currentUser: any;
  key?: React.Key;
}

function PostLightbox({ post, currentUser }: PostLightboxProps) {
  const [isLiked, setIsLiked] = useState(post.likes?.some((l: any) => l.owner_id === currentUser?.id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    // Fast UI update
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('owner_id', currentUser.id);
      } else {
        await supabase.from('likes').insert({ post_id: post.id, owner_id: currentUser.id });
      }
    } catch (error) {
      // Revert if failed
      setIsLiked(!newLikedState);
      setLikeCount(prev => !newLikedState ? prev + 1 : prev - 1);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative border border-amber-50">
          <img src={post.photo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
            <div className="flex items-center gap-1 font-bold">
              <Heart className="w-4 h-4 fill-white" /> {likeCount}
            </div>
            <div className="flex items-center gap-1 font-bold">
              <MessageCircle className="w-4 h-4 fill-white" /> {post.comments?.length || 0}
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden sm:rounded-[2.5rem] border-none bg-transparent shadow-none">
        <div className="flex flex-col md:flex-row bg-white h-[90vh] md:h-[600px]">
          <div className="md:w-3/5 bg-black flex items-center justify-center h-1/2 md:h-full">
            <img src={post.photo} className="max-h-full max-w-full object-contain" alt="" />
          </div>
          <div className="md:w-2/5 flex flex-col h-1/2 md:h-full">
            <div className="p-6 border-b flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-amber-50">
                <AvatarImage src={post.dogs?.dog_photo} />
                <AvatarFallback>{post.dogs?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-secondary">{post.dogs?.name}</h4>
                <p className="text-[10px] font-bold text-amber-800/40 uppercase tracking-widest">By {post.owners?.first_name}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {post.caption && (
                <p className="text-secondary font-medium leading-relaxed italic border-b pb-4 border-amber-50">
                  "{post.caption}"
                </p>
              )}
              <div className="space-y-4">
                {post.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.owners?.owner_photo} />
                      <AvatarFallback>{comment.owners?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-secondary">{comment.owners?.first_name}</span>
                        <span className="text-[9px] font-bold text-amber-800/20 uppercase tracking-tighter">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/70 font-medium leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t bg-amber-50/20">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={handleLike} className="flex items-center gap-1.5 group/btn">
                  <Heart className={cn("w-6 h-6 transition-all", isLiked ? "fill-red-500 text-red-500 scale-110" : "text-amber-800/40 group-hover/btn:text-red-400")} />
                  <span className={cn("font-bold", isLiked ? "text-red-500" : "text-amber-800/60")}>{likeCount}</span>
                </button>
                <div className="flex items-center gap-1.5 text-amber-800/40">
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-bold">{post.comments?.length || 0}</span>
                </div>
                <span className="ml-auto text-[10px] font-bold text-amber-800/20 uppercase tracking-widest">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePostModal({ currentUser, onSuccess, trigger }: { currentUser: any, onSuccess: () => void, trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [myDogs, setMyDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser?.id) {
      supabase.from('dogs').select('id, name').eq('owner_id', currentUser.id)
        .then(({ data }) => {
          if (data) {
            setMyDogs(data);
            if (data.length === 1) setSelectedDogId(data[0].id);
          }
        });
    }
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photo || !selectedDogId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          owner_id: currentUser.id,
          dog_id: selectedDogId,
          caption: caption.trim(),
          photo: photo
        });

      if (error) throw error;
      
      toast.success("Moment shared! 🐾");
      setPhoto(null);
      setCaption("");
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to share moment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl rounded-[3rem] p-0 overflow-hidden border-amber-100 shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black text-secondary">Share a moment 📸</DialogTitle>
          <DialogDescription className="text-amber-800/60 font-medium">Capture a memory and share it with the pack.</DialogDescription>
        </DialogHeader>

        <div className="p-8 pt-4 space-y-6">
          {!photo ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square w-full border-4 border-dashed border-amber-100 rounded-[2.5rem] bg-amber-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-all"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Camera className="w-8 h-8 text-amber-200" />
              </div>
              <p className="text-lg font-black text-secondary">Upload dog photo</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          ) : (
            <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden group shadow-lg border border-amber-100">
              <img src={photo} className="w-full h-full object-cover" alt="Selected" />
              <button 
                onClick={() => setPhoto(null)}
                className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-secondary shadow-lg hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <Label className="text-[10px] font-black uppercase text-secondary">Caption</Label>
                <span className="text-[10px] font-medium text-amber-800/30">{caption.length}/300</span>
              </div>
              <Textarea 
                placeholder="What's happening?"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                className="rounded-2xl border-amber-100 h-24 resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-amber-50/30 border-t border-amber-100">
          <Button onClick={handleSubmit} disabled={!photo || !selectedDogId || loading} className="w-full rounded-2xl bg-primary hover:bg-[#B45309] h-12 font-bold text-white shadow-lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Share with the pack 🐾"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
