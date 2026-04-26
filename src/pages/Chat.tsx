/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn, formatDogAge } from "@/lib/utils";

export function Chat() {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [conversation, setConversation] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Feature 3: Real-time Messages
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        // Fetch sender info for the new message
        const { data: owner } = await supabase
          .from('owners')
          .select('first_name, owner_photo')
          .eq('id', payload.new.sender_id)
          .single();
        
        const newMessage = {
          ...payload.new,
          owners: owner
        };
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUser(user);

      // Fetch conversation info
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          dog_one:dog_one_id(id, name, dog_photo, age, age_unit, owners(first_name, owner_photo)),
          dog_two:dog_two_id(id, name, dog_photo, age, age_unit, owners(first_name, owner_photo))
        `)
        .eq('id', conversationId)
        .single();
      
      if (convError) throw convError;

      // Find my dog's ID to determine who is "other"
      const { data: myDog } = await supabase.from('dogs').select('id').eq('owner_id', user.id).maybeSingle();
      
      const dogOne = Array.isArray(convData.dog_one) ? convData.dog_one[0] : convData.dog_one;
      const dogTwo = Array.isArray(convData.dog_two) ? convData.dog_two[0] : convData.dog_two;
      
      const otherDog = dogOne.id === myDog?.id ? dogTwo : dogOne;
      setConversation({ ...convData, otherDog });

      // Load Messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*, owners(first_name, owner_photo)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (msgError) throw msgError;
      setMessages(msgData || []);

      // Mark as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);

    } catch (error: any) {
      console.error("Error loading chat:", error);
      toast.error("Failed to load chat: " + error.message);
      navigate('/inbox');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || sending || !currentUser) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: content.trim(),
        read: false
      });

      if (error) throw error;
      setContent('');
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-amber-50/30">
        <div className="flex items-center gap-3 p-4 bg-white border-b border-amber-100">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className={cn("h-16 w-3/4 rounded-2xl", i % 2 === 0 ? "ml-auto" : "")} />
          ))}
        </div>
      </div>
    );
  }

  const otherDog = conversation?.otherDog;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-amber-50/10">
      {/* Top Bar */}
      <div className="flex items-center gap-3 p-3 md:p-4 bg-white border-b border-amber-100 sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/inbox')}
          className="rounded-full text-amber-800/60"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-50 shadow-sm">
            <img 
              src={otherDog?.dog_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherDog?.name}`} 
              alt={otherDog?.name} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-black text-secondary tracking-tight leading-tight">{otherDog?.name}</h2>
            <p className="text-[10px] uppercase font-bold text-amber-800/40 tracking-wider">
              {formatDogAge(otherDog?.age, otherDog?.age_unit)} • Owner: {otherDog?.owners?.first_name}
            </p>
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-amber-800/40 font-bold italic">
              Start the conversation! Say hi to {otherDog?.name} 🐾
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div 
                key={msg.id}
                className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
              >
                <div 
                  className={cn(
                    "p-4 shadow-sm",
                    isMe 
                      ? "bg-primary text-white rounded-[2rem] rounded-br-[0.5rem] shadow-amber-600/10" 
                      : "bg-white text-secondary rounded-[2rem] rounded-bl-[0.5rem] border border-amber-50"
                  )}
                >
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-[9px] font-bold text-amber-800/30 mt-1.5 px-2">
                  {format(new Date(msg.created_at), 'p')}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-amber-100 flex items-center gap-3">
        <form onSubmit={sendMessage} className="flex flex-1 items-center gap-3">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Message ${otherDog?.name}...`}
            className="rounded-[1.5rem] border-amber-100 bg-amber-50/30 focus-visible:ring-primary h-12"
          />
          <Button 
            type="submit" 
            disabled={!content.trim() || sending}
            className="w-12 h-12 rounded-full bg-primary hover:bg-[#B45309] text-white shadow-lg shadow-amber-600/20 transition-transform active:scale-95 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
