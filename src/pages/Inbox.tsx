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
  const [playdateRequests, setPlaydateRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setMyId(user.id);

      // Fetch all user's dogs
      const { data: myDogs } = await supabase.from('dogs').select('id, name').eq('owner_id', user.id);
      const myDogIds = myDogs?.map(d => d.id) || [];
      
      if (myDogIds.length === 0) {
        setConversations([]);
        setPlaydateRequests([]);
        setLoading(false);
        return;
      }

      // Fetch playdate requests where receiver is one of user's dogs
      const { data: requests, error: requestsError } = await supabase
        .from('playdate_requests')
        .select(`
          id,
          status,
          created_at,
          requester_dog:requester_dog_id(id, name, dog_photo, owner_id),
          receiver_dog:receiver_dog_id(id, name, dog_photo)
        `)
        .in('receiver_dog_id', myDogIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setPlaydateRequests(requests || []);

      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          dog_one:dog_one_id(id, name, dog_photo, owner_id),
          dog_two:dog_two_id(id, name, dog_photo, owner_id),
          messages(content, created_at, read, sender_id)
        `)
        .or(`dog_one_id.in.(${myDogIds.join(',')}),dog_two_id.in.(${myDogIds.join(',')})`);

      if (convError) throw convError;

      const sorted = (convData || []).map((conv: any) => {
        const lastMsg = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const otherDog = myDogIds.includes(conv.dog_one.id) ? conv.dog_two : conv.dog_one;
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
      console.error("Error fetching data:", error);
      toast.error("Failed to load inbox: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: any) => {
    try {
      // Update request status
      const { error } = await supabase
        .from('playdate_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (error) throw error;

      // Notify the requester
      await supabase.from('notifications').insert({
        owner_id: request.requester_dog.owner_id,
        type: 'request_accepted',
        title: 'Playdate Accepted! 🎉',
        message: `${request.receiver_dog.name} accepted a playdate with ${request.requester_dog.name}!`,
        read: false,
        data: { request_id: request.id }
      });

      toast.success('Playdate accepted! 🐾');
      setPlaydateRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      toast.error("Failed to accept request");
    }
  };

  const handleDecline = async (request: any) => {
    try {
      const { error } = await supabase
        .from('playdate_requests')
        .update({ status: 'declined' })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        owner_id: request.requester_dog.owner_id,
        type: 'request_declined',
        title: 'Playdate Declined',
        message: `${request.receiver_dog.name} is not available for a playdate with ${request.requester_dog.name}.`,
        read: false,
        data: { request_id: request.id }
      });

      toast.info('Request declined 🐾');
      setPlaydateRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      toast.error("Failed to decline request");
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

      {playdateRequests.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 className="text-xs font-black text-amber-900/40 uppercase tracking-[0.2em] mb-4 pl-1">New Playdate Requests ({playdateRequests.length})</h2>
          <div className="grid gap-3">
            {playdateRequests.map((request) => (
              <div 
                key={request.id}
                className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-amber-50/50 rounded-[2rem] border border-amber-100 shadow-sm"
              >
                <div className="flex items-center gap-4 flex-1 w-full">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-amber-100">
                    <img 
                      src={request.requester_dog.dog_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.requester_dog.name}`} 
                      alt={request.requester_dog.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-secondary tracking-tight leading-tight">
                      <span className="text-primary">{request.requester_dog.name}</span> wants a playdate with <span className="text-secondary">{request.receiver_dog.name}</span>!
                    </p>
                    <p className="text-[10px] font-bold text-amber-800/40 uppercase tracking-tighter mt-1">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleAccept(request)}
                    className="flex-1 sm:flex-none px-6 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(request)}
                    className="flex-1 sm:flex-none px-6 py-2 bg-white text-gray-500 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xs font-black text-amber-900/40 uppercase tracking-[0.2em] mb-4 pl-1">Messages</h2>
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
