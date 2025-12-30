import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanelSidebar from './PanelSidebar';
import PanelHeader from './PanelHeader';
import { TelegramToastStack, ToastNotification } from './TelegramToast';
import AdminDashboardView from './admin/AdminDashboardView';
import AdminTasksView from './admin/AdminTasksView';
import AdminUsersView from './admin/AdminUsersView';
import AdminSmsView from './admin/AdminSmsView';
import AdminVacationView from './admin/AdminVacationView';
import AdminStatsView from './admin/AdminStatsView';
import AdminActivityView from './admin/AdminActivityView';
import AdminChatView from './admin/AdminChatView';
import AdminEvaluationsView from './admin/AdminEvaluationsView';
import AdminKycView from './admin/AdminKycView';
import AdminDocumentsView from './admin/AdminDocumentsView';
import { ClipboardList, Users, MessageSquare, Calendar, BarChart3, Activity, LayoutDashboard, MessageCircle, Settings, ClipboardCheck, FileSearch, Files } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ToastNotification type is now imported from TelegramToast

export default function AdminDashboard() {
  const [activeTab, setActiveTabState] = useState(() => {
    return sessionStorage.getItem('adminActiveTab') || 'tasks';
  });
  const [pendingSmsCount, setPendingSmsCount] = useState(0);
  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  const [openNewTaskDialog, setOpenNewTaskDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const activeTabRef = useRef(activeTab);

  // Keep ref in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const setActiveTab = (tab: string) => {
    sessionStorage.setItem('adminActiveTab', tab);
    setActiveTabState(tab);
  };

  // Keyboard shortcut: Ctrl+N to open new task dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        // Navigate to tasks and trigger dialog
        setActiveTab('tasks');
        setOpenNewTaskDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save scroll position continuously and restore on mount/visibility change
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('adminScrollPosition');
    if (savedPosition) {
      setTimeout(() => window.scrollTo({ top: parseInt(savedPosition), behavior: 'smooth' }), 100);
    }

    const handleScroll = () => {
      sessionStorage.setItem('adminScrollPosition', window.scrollY.toString());
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const pos = sessionStorage.getItem('adminScrollPosition');
        if (pos) {
          setTimeout(() => window.scrollTo({ top: parseInt(pos), behavior: 'smooth' }), 100);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    fetchPendingSmsCount();
    fetchPendingKycCount();
    fetchUnreadMessages();

    // SMS code request notifications
    const smsChannel = supabase
      .channel('admin-sms-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sms_code_requests' 
      }, (payload) => {
        console.log('SMS request received:', payload);
        if (payload.new?.status === 'pending') {
          setPendingSmsCount(prev => prev + 1);
          toast({
            title: 'Neue SMS-Code Anfrage',
            description: 'Ein Mitarbeiter hat einen SMS-Code angefordert.',
            variant: 'default',
          });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sms_code_requests' 
      }, (payload) => {
        console.log('SMS request updated:', payload);
        fetchPendingSmsCount();
      })
      .subscribe((status) => {
        console.log('SMS channel status:', status);
      });

    // Task notifications (completed tasks from employees)
    const notificationsChannel = supabase
      .channel('admin-notifications-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        console.log('Notification received:', payload);
        if (user && payload.new.user_id === user.id) {
          toast({
            title: payload.new.title,
            description: payload.new.message,
          });
        }
      })
      .subscribe((status) => {
        console.log('Notifications channel status:', status);
      });

    // Chat message notifications - listen for messages where user is recipient
    const chatChannel = supabase
      .channel(`admin-chat-badge-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `recipient_id=eq.${user.id}`
      }, async (payload) => {
        console.log('Chat message received:', payload);
        if (!payload.new.is_group_message && !payload.new.read_at) {
          // Only increment if not currently in chat tab (use ref for accurate value in callback)
          if (activeTabRef.current !== 'chat') {
            setUnreadMessages(prev => prev + 1);
            
            // Fetch sender info for toast
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name, avatar_url')
              .eq('user_id', payload.new.sender_id)
              .maybeSingle();
            
            const senderName = senderProfile
              ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim()
              : 'Jemand';
            
            const initials = senderProfile
              ? `${senderProfile.first_name?.[0] || ''}${senderProfile.last_name?.[0] || ''}`.toUpperCase()
              : '?';
            
            // Add toast notification to stack
            setToastNotifications(prev => [...prev, {
              id: payload.new.id,
              senderId: payload.new.sender_id,
              senderName,
              senderAvatar: senderProfile?.avatar_url || undefined,
              senderInitials: initials,
              message: payload.new.message?.substring(0, 100) || 'Bild gesendet'
            }]);
          } else {
            // Auto-mark as read if in chat tab
            supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', payload.new.id)
              .then(() => {});
          }
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        // When a message is marked as read, refresh the count
        if (payload.new.read_at && !payload.old?.read_at) {
          fetchUnreadMessages();
        }
      })
      .subscribe((status) => {
        console.log('Chat channel status:', status);
      });

    // KYC document notifications (id_card, passport, address_proof)
    const documentsChannel = supabase
      .channel('admin-kyc-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'documents' 
      }, (payload) => {
        console.log('Document received:', payload);
        // KYC view handles id_card, passport, and address_proof
        if (payload.new?.document_type && ['id_card', 'passport', 'address_proof'].includes(payload.new.document_type)) {
          fetchPendingKycCount();
          toast({
            title: 'Neues KYC-Dokument',
            description: 'Ein Mitarbeiter hat ein neues Dokument zur Prüfung eingereicht.',
          });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'documents' 
      }, () => {
        fetchPendingKycCount();
      })
      .subscribe((status) => {
        console.log('Documents channel status:', status);
      });

    // Task status change notifications
    const tasksChannel = supabase
      .channel('admin-tasks-live')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'tasks'
      }, (payload) => {
        console.log('Task updated:', payload);
        const oldStatus = payload.old?.status;
        const newStatus = payload.new?.status;
        const title = payload.new?.title || 'Auftrag';
        
        if (oldStatus !== newStatus) {
          const statusLabels: Record<string, string> = {
            pending: 'Offen',
            assigned: 'Zugewiesen',
            in_progress: 'In Bearbeitung',
            sms_requested: 'SMS angefordert',
            pending_review: 'In Überprüfung',
            completed: 'Abgeschlossen',
            cancelled: 'Storniert'
          };
          
          toast({
            title: 'Auftragsstatus geändert',
            description: `"${title}" ist jetzt: ${statusLabels[newStatus] || newStatus}`,
          });
        }
      })
      .subscribe((status) => {
        console.log('Tasks channel status:', status);
      });

    return () => {
      supabase.removeChannel(smsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    // When admin opens the chat tab, mark all direct incoming messages as read
    // so the sidebar badge immediately reflects reality.
    if (activeTab !== 'chat') return;

    (async () => {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_group_message', false)
        .is('read_at', null);

      await fetchUnreadMessages();
    })();
  }, [activeTab, user]);

  const fetchUnreadMessages = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_group_message', false)
      .is('read_at', null);
    
    setUnreadMessages(count || 0);
  };

  const fetchPendingSmsCount = async () => {
    const { count } = await supabase
      .from('sms_code_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    setPendingSmsCount(count || 0);
  };

  const fetchPendingKycCount = async () => {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .in('document_type', ['id_card', 'passport', 'address_proof'])
      .eq('status', 'pending');
    
    setPendingKycCount(count || 0);
  };

  const handleLogoClick = () => {
    setActiveTab('tasks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const menuSections = [
    {
      title: 'ÜBERSICHT',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tasks', label: 'Aufträge', icon: ClipboardList },
        { id: 'users', label: 'Mitarbeiter', icon: Users },
      ],
    },
    {
      title: 'ANFRAGEN',
      items: [
        { id: 'sms', label: 'SMS-Codes', icon: MessageSquare, badge: pendingSmsCount > 0 ? pendingSmsCount : undefined },
        { id: 'vacation', label: 'Urlaubsanträge', icon: Calendar },
        { id: 'kyc', label: 'KYC-Prüfung', icon: FileSearch, badge: pendingKycCount > 0 ? pendingKycCount : undefined },
        { id: 'documents', label: 'Dokumente', icon: Files },
      ],
    },
    {
      title: 'KOMMUNIKATION',
      items: [
        { id: 'chat', label: 'Chat', icon: MessageCircle, badge: unreadMessages > 0 ? unreadMessages : undefined },
        { id: 'activity', label: 'Aktivität', icon: Activity },
      ],
    },
    {
      title: 'VERWALTUNG',
      items: [
        { id: 'evaluations', label: 'Bewertungen', icon: ClipboardCheck },
        { id: 'stats', label: 'Statistiken', icon: BarChart3 },
        { id: 'settings', label: 'Einstellungen', icon: Settings },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardView onNavigate={setActiveTab} />;
      case 'tasks':
        return <AdminTasksView externalOpenDialog={openNewTaskDialog} onDialogOpened={() => setOpenNewTaskDialog(false)} />;
      case 'users':
        return <AdminUsersView />;
      case 'activity':
        return <AdminActivityView />;
      case 'sms':
        return <AdminSmsView />;
      case 'vacation':
        return <AdminVacationView />;
      case 'stats':
        return <AdminStatsView />;
      case 'evaluations':
        return <AdminEvaluationsView />;
      case 'kyc':
        return <AdminKycView />;
      case 'documents':
        return <AdminDocumentsView />;
      case 'chat':
        return <AdminChatView />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Einstellungen</h2>
            <p className="text-muted-foreground">Einstellungen werden bald verfügbar sein.</p>
          </div>
        );
      default:
        return <AdminTasksView />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <PanelSidebar
        sections={menuSections}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogoClick={handleLogoClick}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          sidebarCollapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-64"
        )}
      >
        <PanelHeader
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
          {renderContent()}
        </main>
      </div>

      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Toast notifications for new messages */}
      <TelegramToastStack
        notifications={toastNotifications}
        onClose={(id) => setToastNotifications(prev => prev.filter(n => n.id !== id))}
        onClick={() => setActiveTab('chat')}
      />
    </div>
  );
}
