import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  message: string;
}

interface SingleToastProps {
  notification: ToastNotification;
  onClose: () => void;
  onClick?: () => void;
  index: number;
}

function SingleToast({ notification, onClose, onClick, index }: SingleToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Staggered animation
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

  return (
    <div
      className={`w-full transition-all duration-300 ease-out cursor-pointer ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
      onClick={handleClick}
    >
      <div className="backdrop-blur-xl bg-background/80 border border-border/50 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
          <AvatarImage src={notification.senderAvatar} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {notification.senderInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{notification.senderName}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
            {notification.message}
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
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm w-full flex flex-col gap-2">
      {notifications.slice(0, 5).map((notification, index) => (
        <SingleToast
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
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
      notifications={[{ id: 'single', senderName, senderAvatar, senderInitials, message }]}
      onClose={onClose}
      onClick={onClick}
    />
  );
}
