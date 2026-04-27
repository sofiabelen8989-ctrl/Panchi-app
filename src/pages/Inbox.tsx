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
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function Inbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [playdateRequests, setPlaydateRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUser(user);

      // STEP 1: Get all current owner's dog ids
      const { data: myDogs, error: myDogsError } = 
        await supabase
          .from('dogs')
          .select('id, name')
          .eq('owner_id', user.id)

      if (myDogsError) throw myDogsError

      const myDogIds = myDogs?.map(d => d.id) || []

      if (myDogIds.length === 0) {
        setConversations([])
        setPlaydateRequests([])
        setLoading(false)
        return
      }

      // STEP (Playdate Requests): Fetch playdate requests where receiver is one of user's dogs
      const { data: requests } = await supabase
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

      setPlaydateRequests(requests || []);

      // STEP 2: Get conversations where any of 
      // my dogs appear
      const { data: conversations, error: convError } = 
        await supabase
          .from('conversations')
          .select('id, dog_one_id, dog_two_id, created_at')
          .or(
            `dog_one_id.in.(${myDogIds.join(',')}),` +
            `dog_two_id.in.(${myDogIds.join(',')})`
          )
          .order('created_at', { ascending: false })

      if (convError) throw convError
      if (!conversations || conversations.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // STEP 3: Get all unique dog ids
      const allDogIds = [
        ...new Set([
          ...conversations.map(c => c.dog_one_id),
          ...conversations.map(c => c.dog_two_id)
        ])
      ].filter(Boolean)

      // STEP 4: Fetch dogs separately
      const { data: dogs } = await supabase
        .from('dogs')
        .select('id, name, dog_photo, age, age_unit, owner_id')
        .in('id', allDogIds)

      // STEP 5: Fetch owners separately
      const ownerIds = [
        ...new Set(
          dogs?.map(d => d.owner_id).filter(Boolean) || []
        )
      ]

      const { data: owners } = await supabase
        .from('owners')
        .select('id, first_name, owner_photo')
        .in('id', ownerIds)

      // STEP 6: Fetch last message per conversation
      const { data: lastMessages } = await supabase
        .from('messages')
        .select(
          'conversation_id, content, created_at, sender_id'
        )
        .in(
          'conversation_id', 
          conversations.map(c => c.id)
        )
        .order('created_at', { ascending: false })

      // STEP 7: Fetch unread counts
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('conversation_id, id')
        .in(
          'conversation_id',
          conversations.map(c => c.id)
        )
        .eq('read', false)
        .neq('sender_id', user.id)

      // STEP 8: Assemble everything manually
      const getDog = (id: string) => 
        dogs?.find(d => d.id === id) || null
      const getOwner = (id: string) => 
        owners?.find(o => o.id === id) || null
      const getLastMessage = (convId: string) =>
        lastMessages?.find(
          m => m.conversation_id === convId
        ) || null
      const getUnreadCount = (convId: string) =>
        unreadMessages?.filter(
          m => m.conversation_id === convId
        ).length || 0

      const enriched = conversations.map(conv => {
        const dogOne = getDog(conv.dog_one_id)
        const dogTwo = getDog(conv.dog_two_id)

        const isMyDogOne = myDogIds.includes(conv.dog_one_id)
        const myDog = isMyDogOne ? dogOne : dogTwo
        const otherDog = isMyDogOne ? dogTwo : dogOne

        return {
          id: conv.id,
          created_at: conv.created_at,
          myDog: myDog ? {
            ...myDog,
            owner: getOwner(myDog.owner_id)
          } : null,
          otherDog: otherDog ? {
            ...otherDog,
            owner: getOwner(otherDog.owner_id)
          } : null,
          lastMessage: getLastMessage(conv.id),
          unreadCount: getUnreadCount(conv.id)
        }
      })

      setConversations(enriched)

    } catch (error) {
      console.error('Inbox error:', error)
      toast.error('Could not load conversations 🐾')
    } finally {
      setLoading(false)
    }
  }

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
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Your Inbox</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl animate-pulse border border-amber-50">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-amber-100 rounded w-1/3" />
                <div className="h-2 bg-amber-50 rounded w-1/2" />
                <div className="h-2 bg-amber-50 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-amber-50/50 rounded-[3rem] border border-dashed border-amber-200">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-amber-800 font-bold text-lg mb-2">
            No conversations yet
          </h3>
          <p className="text-amber-600 text-sm">
            Find a dog and say hello! 🐾
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium"
          >
            Find Dogs 🐾
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-amber-100 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={conv.otherDog?.dog_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.otherDog?.name || 'dog'}`}
                  alt={conv.otherDog?.name || 'Dog'}
                  className="w-14 h-14 rounded-full object-cover bg-amber-100"
                />
                {conv.myDog?.dog_photo && (
                  <img
                    src={conv.myDog.dog_photo}
                    alt={conv.myDog.name}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full object-cover border-2 border-white bg-amber-50"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="font-bold text-amber-900 text-sm">
                    {conv.otherDog?.name || 'Unknown dog'}
                  </p>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTimeAgo(conv.lastMessage?.created_at || conv.created_at)}
                  </p>
                </div>
                <p className="text-xs text-amber-500 mb-1">
                  via {conv.myDog?.name || 'your dog'} 🐾
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {conv.lastMessage?.content || 'Start the conversation! 🐾'}
                </p>
              </div>

              {conv.unreadCount > 0 && (
                <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
