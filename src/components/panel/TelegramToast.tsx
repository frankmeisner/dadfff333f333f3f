import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  message: string;
}

interface GroupedNotification {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  messages: { id: string; message: string }[];
}

interface SingleToastProps {
  notification: GroupedNotification;
  onClose: () => void;
  onClick?: () => void;
  index: number;
}

function SingleToast({ notification, onClose, onClick, index }: SingleToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), index * 50);
    
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onClose, index]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    onClose();
  };

  const messageCount = notification.messages.length;
  const latestMessage = notification.messages[messageCount - 1]?.message;

  return (
    <div
      className={`w-full transition-all duration-300 ease-out cursor-pointer ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
      onClick={handleClick}
    >
      <div className="backdrop-blur-xl bg-background/80 border border-border/50 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
            <AvatarImage src={notification.senderAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {notification.senderInitials}
            </AvatarFallback>
          </Avatar>
          {messageCount > 1 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {messageCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            {notification.senderName}
            {messageCount > 1 && (
              <span className="text-muted-foreground font-normal ml-1">
                ({messageCount} Nachrichten)
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
            {latestMessage}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface TelegramToastStackProps {
  notifications: ToastNotification[];
  onClose: (id: string) => void;
  onClick?: () => void;
}

export function TelegramToastStack({ notifications, onClose, onClick }: TelegramToastStackProps) {
  // Group notifications by sender
  const groupedNotifications = useMemo(() => {
    const groups: Map<string, GroupedNotification> = new Map();
    
    for (const notification of notifications) {
      const existing = groups.get(notification.senderId);
      if (existing) {
        existing.messages.push({ id: notification.id, message: notification.message });
      } else {
        groups.set(notification.senderId, {
          senderId: notification.senderId,
          senderName: notification.senderName,
          senderAvatar: notification.senderAvatar,
          senderInitials: notification.senderInitials,
          messages: [{ id: notification.id, message: notification.message }]
        });
      }
    }
    
    return Array.from(groups.values());
  }, [notifications]);

  if (groupedNotifications.length === 0) return null;

  const handleCloseGroup = (senderId: string) => {
    // Close all notifications from this sender
    const group = groupedNotifications.find(g => g.senderId === senderId);
    if (group) {
      group.messages.forEach(msg => onClose(msg.id));
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm w-full flex flex-col gap-2">
      {groupedNotifications.slice(0, 5).map((group, index) => (
        <SingleToast
          key={group.senderId}
          notification={group}
          onClose={() => handleCloseGroup(group.senderId)}
          onClick={onClick}
          index={index}
        />
      ))}
    </div>
  );
}

// Legacy single toast for backwards compatibility
interface TelegramToastProps {
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  message: string;
  onClose: () => void;
  onClick?: () => void;
}

export function TelegramToast({
  senderName,
  senderAvatar,
  senderInitials,
  message,
  onClose,
  onClick
}: TelegramToastProps) {
  return (
    <TelegramToastStack
      notifications={[{ id: 'single', senderId: 'single', senderName, senderAvatar, senderInitials, message }]}
      onClose={onClose}
      onClick={onClick}
    />
  );
}
