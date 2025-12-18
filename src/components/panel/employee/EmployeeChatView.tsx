import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, ChatMessage } from '@/types/panel';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

const statusColors: Record<UserStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const statusLabels: Record<UserStatus, string> = {
  online: 'Online',
  away: 'Abwesend',
  busy: 'Beschäftigt',
  offline: 'Offline'
};

interface ProfileWithStatus extends Profile {
  status?: UserStatus;
}

export default function EmployeeChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profiles, setProfiles] = useState<Record<string, ProfileWithStatus>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchProfiles();

      const channel = supabase
        .channel('chat-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (!newMsg.is_group_message && (newMsg.sender_id === user.id || newMsg.recipient_id === user.id)) {
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
          const updatedMsg = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        })
        .subscribe();

      // Mark incoming messages as read
      markMessagesAsRead();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .is('read_at', null)
      .eq('is_group_message', false);
  };

  const fetchMessages = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('is_group_message', false)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data && !error) {
      setMessages(data as ChatMessage[]);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      const profileMap: Record<string, ProfileWithStatus> = {};
      (data as any[]).forEach((p) => {
        profileMap[p.user_id] = { ...p, status: p.status || 'offline' };
      });
      setProfiles(profileMap);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    // Find admin to send to
    const lastAdminMessage = [...messages].reverse().find(m => m.sender_id !== user.id);
    const recipientId = lastAdminMessage?.sender_id;

    if (!recipientId) {
      toast({ title: 'Fehler', description: 'Kein Empfänger gefunden.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('chat_messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      message: newMessage.trim(),
      is_group_message: false
    });

    if (error) {
      toast({ title: 'Fehler', description: 'Nachricht konnte nicht gesendet werden.', variant: 'destructive' });
    } else {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getProfileAvatar = (userId: string) => {
    const p = profiles[userId];
    if (!p?.avatar_url) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(p.avatar_url);
    return data.publicUrl;
  };

  const getStatus = (userId: string): UserStatus => {
    return profiles[userId]?.status || 'offline';
  };

  return (
    <div className="h-[calc(100vh-12rem)]">
      <Card className="shadow-lg h-full flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Nachrichten</h2>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>Noch keine Nachrichten.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const senderProfile = profiles[msg.sender_id];
                  const senderStatus = getStatus(msg.sender_id);
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={getProfileAvatar(msg.sender_id) || ''} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {senderProfile?.first_name?.[0]}{senderProfile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status indicator */}
                        <span 
                          className={`absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${statusColors[senderStatus]}`}
                          title={statusLabels[senderStatus]}
                        />
                      </div>
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-medium">
                            {isOwn ? 'Du' : `${senderProfile?.first_name || 'Unbekannt'} ${senderProfile?.last_name || ''}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: de })}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        {/* Read receipt */}
                        {isOwn && (
                          <div className="flex justify-end mt-1" title={msg.read_at ? 'Gelesen' : 'Gesendet'}>
                            {msg.read_at ? (
                              <CheckCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Check className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          
          {messages.length > 0 && (
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nachricht schreiben..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
