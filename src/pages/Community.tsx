/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Plus, 
  Camera, 
  X, 
  Loader2, 
  PawPrint,
  Clock,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

interface Post {
  id: string;
  owner_id: string;
  dog_id: string;
  caption: string;
  photo: string;
  created_at: string;
  owners: {
    id: string;
    first_name: string;
    owner_photo: string;
  };
  dogs: {
    id: string;
    name: string;
    dog_photo: string;
  };
  likes: { id: string; owner_id: string }[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    owners: {
      first_name: string;
      owner_photo: string;
    };
  }[];
}

export function Community() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    fetchPosts();

    // Real-time setup
    const likesChannel = supabase.channel('likes-community')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchPosts(false); // Silent refresh
      })
      .subscribe();

    const commentsChannel = supabase.channel('comments-community')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        handleRealtimeComment(payload.new);
      })
      .subscribe();

    const postsChannel = supabase.channel('posts-community')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(postsChannel);
    };
  }, []);

  const fetchPosts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load community feed");
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeComment = async (newComment: any) => {
    // We need to fetch owner info for the new comment to match our Post interface
    const { data: owner } = await supabase
      .from('owners')
      .select('first_name, owner_photo')
      .eq('id', newComment.owner_id)
      .single();

    const commentWithInfo = {
      ...newComment,
      owners: owner
    };

    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === newComment.post_id) {
        return {
          ...post,
          comments: [...(post.comments || []), commentWithInfo].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        };
      }
      return post;
    }));
  };

  if (loading && posts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-10">
          <Skeleton className="h-12 w-48 rounded-2xl" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => <PostSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 md:py-16 pb-24 md:pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-secondary tracking-tight mb-2">Community Pack 🏘️</h1>
          <p className="text-amber-800/60 font-medium text-lg">See what the pups are up to today!</p>
        </div>
        <CreatePostModal 
          currentUser={currentUser} 
          onSuccess={() => {
            fetchPosts(false);
            setIsCreateModalOpen(false);
          }}
        />
      </div>

      {posts.length === 0 ? (
        <div className="py-24 text-center bg-amber-50/50 rounded-[3rem] border border-dashed border-amber-200">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <PawPrint className="w-12 h-12 text-amber-200" />
          </div>
          <h2 className="text-3xl font-black text-secondary mb-3">The pack is quiet...</h2>
          <p className="text-amber-800/60 font-medium text-lg mb-10">Be the first to share a moment! 🐾</p>
          <CreatePostModal 
            currentUser={currentUser} 
            onSuccess={() => fetchPosts(false)}
            trigger={<Button className="bg-primary hover:bg-[#B45309] text-white px-10 h-14 rounded-full text-lg font-bold shadow-xl shadow-amber-600/20">Share Now 📸</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))}
        </div>
      )}
    </main>
  );
}

interface PostCardProps {
  post: Post;
  currentUser: any;
  key?: React.Key;
}

function PostCard({ post, currentUser }: PostCardProps) {
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const navigate = useNavigate();

  const isLiked = post.likes?.some(l => l.owner_id === currentUser?.id);
  const likeCount = post.likes?.length || 0;

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please log in to like posts");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('owner_id', currentUser.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            owner_id: currentUser.id
          });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          owner_id: currentUser.id,
          content: commentText.trim()
        });

      if (error) throw error;
      setCommentText("");
      setIsExpanded(true);
    } catch (error: any) {
      toast.error("Failed to add comment: " + error.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
      toast.success("Post deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete post: " + error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="rounded-[2.5rem] overflow-hidden border border-amber-50 shadow-md hover:shadow-xl transition-all duration-500 bg-white flex flex-col h-full">
        <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-50 shadow-sm cursor-pointer"
              onClick={() => navigate(`/profile/${post.dog_id}`)}
            >
              <img src={post.dogs?.dog_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.dogs?.name}`} className="w-full h-full object-cover" alt={post.dogs?.name} />
            </div>
            <div>
              <h3 
                className="font-bold text-primary leading-tight cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${post.dog_id}`)}
              >
                {post.dogs?.name}
              </h3>
              <p className="text-[10px] font-bold text-amber-800/40 uppercase tracking-widest">By {post.owners?.first_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-amber-800/30 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            {currentUser?.id === post.owner_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-800/20 hover:text-red-500 hover:bg-red-50">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-amber-100 shadow-xl">
                  <DropdownMenuItem 
                    className="text-red-500 font-bold focus:bg-red-50 focus:text-red-600 rounded-xl cursor-pointer"
                    onClick={() => setIsDeleteAlertOpen(true)}
                  >
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <div className="px-6 pb-0">
          <div className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden border border-amber-50 group-hover:shadow-lg transition-all duration-500">
            <img 
              src={post.photo} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              alt={post.caption || "Dog moment"} 
            />
          </div>
        </div>

        <CardContent className="p-6 pt-5 flex-1">
          {post.caption && (
            <p className="text-secondary font-medium mb-5 leading-relaxed bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 italic">
              "{post.caption}"
            </p>
          )}

          <div className="flex items-center gap-6 mb-6">
            <button 
              onClick={handleLike}
              className="flex items-center gap-2 group/btn"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                isLiked ? "bg-red-50" : "bg-amber-50 group-hover/btn:bg-red-50"
              )}>
                <Heart className={cn(
                  "w-5 h-5 transition-transform active:scale-125",
                  isLiked ? "fill-red-500 text-red-500" : "text-amber-800/40 group-hover/btn:text-red-400"
                )} />
              </div>
              <span className={cn("font-bold text-sm", isLiked ? "text-red-500" : "text-amber-800/60")}>
                {likeCount}
              </span>
            </button>

            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 group/btn"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center group-hover/btn:bg-blue-50 transition-all duration-300">
                <MessageCircle className="w-5 h-5 text-amber-800/40 group-hover/btn:text-blue-400" />
              </div>
              <span className="font-bold text-sm text-amber-800/60">
                {post.comments?.length || 0}
              </span>
            </button>

            <button 
              onClick={() => navigate(`/profile/${post.dog_id}`)}
              className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
            >
              Profile <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {(isExpanded || post.comments?.length > 0) && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {(isExpanded ? post.comments : post.comments?.slice(-2)).map((comment) => (
                    <div key={comment.id} className="flex gap-3 bg-amber-50/30 p-3 rounded-2xl border border-amber-100/30">
                      <Avatar className="h-8 w-8 border border-white shadow-sm shrink-0">
                        <AvatarImage src={comment.owners?.owner_photo} />
                        <AvatarFallback className="bg-amber-100 text-primary text-[10px] font-bold">
                          {comment.owners?.first_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-xs text-secondary">{comment.owners?.first_name}</span>
                          <span className="text-[9px] font-bold text-amber-800/20 uppercase tracking-tighter">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-amber-900/70 font-medium leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {!isExpanded && post.comments?.length > 2 && (
                    <button 
                      onClick={() => setIsExpanded(true)}
                      className="text-[10px] font-bold text-amber-800/40 uppercase tracking-widest hover:text-primary transition-colors pl-2"
                    >
                      View all {post.comments.length} comments
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="p-6 pt-0 mt-auto">
          <form onSubmit={handleComment} className="flex items-center gap-3 w-full">
            <Input 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`Say something nice about ${post.dogs?.name} 🐾`}
              className="rounded-xl border-amber-100 bg-amber-50/30 h-10 text-xs font-medium focus-visible:ring-primary flex-1"
            />
            <Button 
              type="submit" 
              disabled={!commentText.trim() || isSubmittingComment}
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-[#B45309] text-white shadow-md shadow-amber-600/10 transition-transform active:scale-95"
            >
              {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
            </Button>
          </form>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-amber-100 p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-secondary tracking-tight">Delete Post?</AlertDialogTitle>
            <AlertDialogDescription className="text-amber-800/60 font-medium text-lg leading-relaxed">
              This action cannot be undone. This will permanently delete your pup's moment from the community feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              className="rounded-full border-amber-100 font-bold px-6 h-12"
              variant="outline"
              size="default"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 h-12 rounded-full border-none"
              variant="default"
              size="default"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
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
    if (currentUser) {
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
      
      toast.success("Moment shared with the pack! 🐾");
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
        {trigger || (
          <Button className="bg-primary hover:bg-[#B45309] text-white rounded-full px-8 h-12 font-bold shadow-xl shadow-amber-600/20 flex items-center gap-2 group">
            <Camera className="w-5 h-5 transition-transform group-hover:rotate-12" />
            Share a moment 📸
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl rounded-[3rem] p-0 overflow-hidden border-amber-100 shadow-2xl">
        <DialogHeader className="p-8 pt-10 pb-4">
          <DialogTitle className="text-3xl font-black text-secondary tracking-tight">Share a moment 📸</DialogTitle>
          <DialogDescription className="text-amber-800/60 font-medium">Capture a memory and share it with the pack.</DialogDescription>
        </DialogHeader>

        <div className="p-8 pt-4 space-y-8">
          {!photo ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square md:aspect-[4/3] w-full border-4 border-dashed border-amber-100 rounded-[2.5rem] bg-amber-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 hover:border-primary transition-all duration-300 group"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <PawPrint className="w-10 h-10 text-amber-200" />
              </div>
              <p className="text-xl font-black text-secondary mb-2 tracking-tight">Upload your dog's photo</p>
              <p className="text-amber-800/40 font-bold uppercase text-[10px] tracking-widest px-8 text-center">Tap here or drag & drop high-quality puppy photos</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
          ) : (
            <div className="relative aspect-square md:aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden group shadow-2xl border border-amber-100">
              <img src={photo} className="w-full h-full object-cover" alt="Selected" />
              <button 
                onClick={() => setPhoto(null)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-full text-secondary shadow-lg hover:bg-red-50 hover:text-red-500 transition-all border border-amber-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black uppercase text-secondary tracking-widest">Caption</label>
                <span className={cn("text-[9px] font-bold uppercase", caption.length > 280 ? "text-red-500" : "text-amber-800/30")}>
                  {caption.length} / 300
                </span>
              </div>
              <Textarea 
                placeholder="What is your pup doing? #naptime #zoomies"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                className="rounded-2xl border-amber-100 focus-visible:ring-primary bg-amber-50/10 min-h-[100px] text-lg font-medium p-6 resize-none transition-all"
              />
            </div>

            {myDogs.length > 1 && (
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-secondary tracking-widest px-1">Which Dog?</label>
                <Select value={selectedDogId} onValueChange={setSelectedDogId}>
                  <SelectTrigger className="w-full h-14 rounded-2xl border-amber-100 focus:ring-primary bg-white text-lg font-bold text-secondary px-6 shadow-sm">
                    <SelectValue placeholder="Select a dog" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-amber-100 shadow-xl">
                    {myDogs.map(dog => (
                      <SelectItem key={dog.id} value={dog.id} className="text-secondary font-bold h-12 cursor-pointer focus:bg-amber-50">
                        {dog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-8 bg-amber-50/30 border-t border-amber-100 gap-4 sm:flex-row flex-col">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="rounded-full border-amber-100 font-bold px-8 h-14 text-lg w-full sm:w-auto hover:bg-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!photo || !selectedDogId || loading}
            className="rounded-full bg-primary hover:bg-[#B45309] text-white font-black px-10 h-14 text-lg shadow-xl shadow-amber-600/20 flex-1 w-full sm:w-auto"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Share with the pack 🐾"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PostSkeleton() {
  return (
    <Card className="rounded-[2.5rem] overflow-hidden border border-amber-50 shadow-md">
      <CardHeader className="p-6 flex flex-row items-center gap-3 space-y-0">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
      </CardHeader>
      <div className="px-6">
        <Skeleton className="aspect-square md:aspect-[4/3] w-full rounded-[2rem]" />
      </div>
      <CardContent className="p-6 space-y-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-4">
          <Skeleton className="w-16 h-10 rounded-full" />
          <Skeleton className="w-16 h-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
