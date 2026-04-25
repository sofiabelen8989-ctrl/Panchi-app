/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, Dog as DogIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Inbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setMyId(user.id);

      // Fetch conversations involving the user's dog
      // We need to find the user's dog first
      const { data: myDog } = await supabase.from('dogs').select('id').eq('owner_id', user.id).maybeSingle();
      
      if (!myDog) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          dog_one:dog_one_id(id, name, dog_photo, owner_id),
          dog_two:dog_two_id(id, name, dog_photo, owner_id),
          messages(content, created_at, read, sender_id)
        `)
        .or(`dog_one_id.eq.${myDog.id},dog_two_id.eq.${myDog.id}`);

      if (error) throw error;

      // Sort by last message locally since we can't easily do it in a nested select with Supabase without more complex queries or views
      const sorted = (data || []).map((conv: any) => {
        const lastMsg = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const otherDog = conv.dog_one.id === myDog.id ? conv.dog_two : conv.dog_one;
        const unread = conv.messages?.some((m: any) => !m.read && m.sender_id !== user.id);

        return {
          ...conv,
          otherDog,
          lastMsg,
          unread
        };
      }).sort((a: any, b: any) => {
        const timeA = a.lastMsg ? new Date(a.lastMsg.created_at).getTime() : 0;
        const timeB = b.lastMsg ? new Date(b.lastMsg.created_at).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(sorted);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load inbox: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-secondary tracking-tight">Your Inbox</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="py-20 text-center bg-amber-50/50 rounded-[3rem] border border-dashed border-amber-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <DogIcon className="w-10 h-10 text-amber-200" />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">No conversations yet</h2>
          <p className="text-amber-800/60 font-medium">Find a dog and say hello! 🐾</p>
          <button 
            onClick={() => navigate('/feed')}
            className="mt-8 text-primary font-bold hover:underline"
          >
            Go to Feed
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="group relative flex items-center gap-4 p-4 bg-white rounded-3xl shadow-md border border-amber-50 cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 border-2 border-amber-50 ring-2 ring-white shadow-sm">
                <img 
                  src={conv.otherDog.dog_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.otherDog.name}`} 
                  alt={conv.otherDog.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-lg font-black text-secondary truncate tracking-tight">{conv.otherDog.name}</h3>
                  {conv.lastMsg && (
                    <span className="text-[10px] font-bold text-amber-800/40 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(conv.lastMsg.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-sm truncate",
                  conv.unread ? "font-bold text-secondary" : "text-amber-800/60 font-medium"
                )}>
                  {conv.lastMsg ? conv.lastMsg.content : "No messages yet"}
                </p>
              </div>

              {conv.unread && (
                <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-amber-600/40" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
