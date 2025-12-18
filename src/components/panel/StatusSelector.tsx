import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Circle } from 'lucide-react';

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

const statusConfig: Record<UserStatus, { label: string; color: string; bgClass: string }> = {
  online: { label: 'Online', color: 'text-green-500', bgClass: 'bg-green-500' },
  away: { label: 'Abwesend', color: 'text-yellow-500', bgClass: 'bg-yellow-500' },
  busy: { label: 'Beschäftigt', color: 'text-red-500', bgClass: 'bg-red-500' },
  offline: { label: 'Offline', color: 'text-gray-400', bgClass: 'bg-gray-400' },
};

export function StatusSelector() {
  const [status, setStatus] = useState<UserStatus>('offline');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [user]);

  const fetchStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('status')
      .eq('user_id', user.id)
      .single();
    
    if (data?.status) {
      setStatus(data.status as UserStatus);
    }
  };

  const updateStatus = async (newStatus: UserStatus) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', user.id);
    
    if (!error) {
      setStatus(newStatus);
    }
  };

  const currentStatus = statusConfig[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
          <span className={`h-2.5 w-2.5 rounded-full ${currentStatus.bgClass}`} />
          <span className="text-xs font-medium hidden sm:inline">{currentStatus.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(Object.keys(statusConfig) as UserStatus[]).map((key) => (
          <DropdownMenuItem
            key={key}
            onClick={() => updateStatus(key)}
            className="gap-2 cursor-pointer"
          >
            <Circle className={`h-3 w-3 fill-current ${statusConfig[key].color}`} />
            <span>{statusConfig[key].label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
