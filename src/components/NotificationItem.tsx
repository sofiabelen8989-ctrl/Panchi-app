import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatTimeAgo } from '../lib/utils';

interface NotificationItemProps {
  notification: any;
  onRead: (id: string) => void;
  key?: React.Key;
}

const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
  const navigate = useNavigate();

  const handleClick = async () => {
    // Mark as read
    if (!notification.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);
      onRead(notification.id);
    }

    // Navigate based on type
    if (notification.type === 'playdate_request') {
      navigate('/inbox');
    } else if (notification.type === 'request_accepted' || notification.type === 'request_declined') {
      navigate('/inbox');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-amber-50 transition-colors border-b border-amber-50 last:border-0 ${
        !notification.read ? 'bg-amber-50/50' : 'bg-white'
      }`}
    >
      {/* Icon based on type */}
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-xl">
        {notification.type === 'playdate_request' 
          ? '🎾' 
          : notification.type === 'request_accepted'
            ? '✅'
            : '❌'
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${
          !notification.read ? 'font-semibold text-amber-900' : 'text-amber-800'
        }`}>
          {notification.title}
        </p>
        <p className="text-xs text-amber-600 mt-0.5 leading-snug">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1"/>
      )}
    </div>
  );
};

export default NotificationItem;
