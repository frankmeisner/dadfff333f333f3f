import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InboxButtonProps {
  onClick: () => void;
}

export function InboxButton({ onClick }: InboxButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      const channel = supabase
        .channel('inbox-notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `recipient_id=eq.${user.id}`
        }, (payload) => {
          if (!payload.new.is_group_message && !payload.new.read_at) {
            setUnreadCount(prev => prev + 1);
            toast({
              title: 'Neue Nachricht',
              description: 'Du hast eine neue Nachricht erhalten.',
            });
          }
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chat_messages' 
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_group_message', false)
      .is('read_at', null);
    
    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onClick}
      className="relative"
      title="Nachrichten"
    >
      <Inbox className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-background"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
