import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAvatarRefresh } from '@/hooks/useAvatarRefresh';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PanelHeaderProps {
  onMenuToggle: () => void;
  headerActions?: ReactNode;
  onNavigateToProfile?: () => void;
}

export default function PanelHeader({
  onMenuToggle,
  headerActions,
  onNavigateToProfile,
}: PanelHeaderProps) {
  const { profile, signOut } = useAuth();
  const avatarRefreshKey = useAvatarRefresh();

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
    // Add cache-busting timestamp when refreshKey changes
    return `${data.publicUrl}?t=${avatarRefreshKey || Date.now()}`;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 md:px-6 gap-4">
        {/* Left side - Menu toggle */}
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {headerActions}
          
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 ring-2 ring-border cursor-pointer hover:ring-primary transition-all">
                <AvatarImage src={getAvatarUrl() || ''} alt={`${profile?.first_name} ${profile?.last_name}`} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border border-border">
              <DropdownMenuItem 
                onClick={onNavigateToProfile}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Zum Profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
