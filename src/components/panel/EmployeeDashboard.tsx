import { useState, createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PanelSidebar from './PanelSidebar';
import PanelHeader from './PanelHeader';
import { NotificationBell } from './NotificationBell';
import { ClipboardList, Clock, FileText, Calendar, User, Bell, LayoutDashboard, ClipboardCheck, Euro, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import EmployeeDashboardView from './employee/EmployeeDashboardView';
import EmployeeTasksView from './employee/EmployeeTasksView';
import EmployeeTimeView from './employee/EmployeeTimeView';
import EmployeeDocumentsView from './employee/EmployeeDocumentsView';
import EmployeeVacationView from './employee/EmployeeVacationView';
import EmployeeProfileView from './employee/EmployeeProfileView';
import EmployeeNotificationsView from './employee/EmployeeNotificationsView';
import EmployeeEvaluationsView from './employee/EmployeeEvaluationsView';
import EmployeeCompensationView from './employee/EmployeeCompensationView';
import EmployeeChatView from './employee/EmployeeChatView';
import { NotificationSettings } from './employee/NotificationSettings';
import { cn } from '@/lib/utils';

// Context to share tab navigation with optional pending task and document type
interface TabContextValue {
  setActiveTab: (tab: string) => void;
  pendingTaskId: string | null;
  setPendingTaskId: (taskId: string | null) => void;
  pendingDocumentType: string | null;
  setPendingDocumentType: (docType: string | null) => void;
}
export const TabContext = createContext<TabContextValue | null>(null);
export const useTabContext = () => useContext(TabContext);

// Request notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

// Show desktop notification
const showDesktopNotification = (title: string, body: string, onClick?: () => void) => {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.png',
      tag: 'chat-message',
    });
    
    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
};

export default function EmployeeDashboard() {
  const [activeTab, setActiveTabState] = useState(() => {
    return sessionStorage.getItem('employeeActiveTab') || 'tasks';
  });
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingDocumentType, setPendingDocumentType] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingEvaluations, setPendingEvaluations] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTasks, setUnreadTasks] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const activeTabRef = useRef(activeTab);

  // Keep ref in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const setActiveTab = (tab: string) => {
    sessionStorage.setItem('employeeActiveTab', tab);
    setActiveTabState(tab);
  };

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Save scroll position continuously and restore on mount/visibility change
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('employeeScrollPosition');
    if (savedPosition) {
      setTimeout(() => window.scrollTo({ top: parseInt(savedPosition), behavior: 'smooth' }), 100);
    }

    const handleScroll = () => {
      sessionStorage.setItem('employeeScrollPosition', window.scrollY.toString());
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const pos = sessionStorage.getItem('employeeScrollPosition');
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

  // Fetch unread notifications count, pending evaluations, unread messages, and unread tasks
  useEffect(() => {
    if (!user) return;

    const fetchUnreadNotificationsCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      setUnreadNotifications(count || 0);
    };

    const fetchUnreadMessages = async () => {
      // Count only direct messages where user is recipient and not read
      const { count: directCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_group_message', false)
        .is('read_at', null);

      setUnreadMessages(directCount || 0);
    };

    const fetchUnreadTasks = async () => {
      // Count task assignments that haven't been accepted yet (no accepted_at date)
      const { count } = await supabase
        .from('task_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('accepted_at', null);

      setUnreadTasks(count || 0);
    };

    const fetchPendingEvaluations = async () => {
      // Get assigned tasks
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', user.id);

      if (!assignments || assignments.length === 0) {
        setPendingEvaluations(0);
        return;
      }

      const taskIds = assignments.map(a => a.task_id);

      // Get existing evaluations
      const { data: existingEvals } = await supabase
        .from('task_evaluations')
        .select('task_id')
        .eq('user_id', user.id);

      const evaluatedTaskIds = existingEvals?.map(e => e.task_id) || [];

      // Get tasks that need evaluation (in_progress or sms_requested, not yet evaluated)
      const { data: tasksNeedingEval } = await supabase
        .from('tasks')
        .select('id')
        .in('id', taskIds)
        .in('status', ['in_progress', 'sms_requested', 'pending_review']);

      const pendingCount = tasksNeedingEval?.filter(t => !evaluatedTaskIds.includes(t.id)).length || 0;
      setPendingEvaluations(pendingCount);
    };

    const markChatAsReadIfInChatTab = async () => {
      if (activeTabRef.current !== 'chat') return;

      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_group_message', false)
        .is('read_at', null);

      await fetchUnreadMessages();
    };

    fetchUnreadNotificationsCount();
    fetchUnreadMessages();
    fetchUnreadTasks();
    fetchPendingEvaluations();

    // If user is already on chat tab, clear badge immediately
    markChatAsReadIfInChatTab();

    const channel = supabase
      .channel(`employee-badge-counts-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications'
      }, (payload: any) => {
        // Only process if this notification is for the current user
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchUnreadNotificationsCount();
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages'
      }, async (payload: any) => {
        const newMessage = payload.new;
        console.log('Employee: New chat message received:', newMessage);
        
        // Only process direct messages to this user
        if (newMessage.recipient_id !== user.id || newMessage.is_group_message) {
          return;
        }
        
        if (!newMessage.read_at && newMessage.sender_id !== user.id) {
          // Only increment if not currently in chat tab
          if (activeTabRef.current !== 'chat') {
            setUnreadMessages(prev => prev + 1);
            
            // Show desktop notification
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            const senderName = senderProfile
              ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim()
              : 'Jemand';

            showDesktopNotification(
              `Neue Nachricht von ${senderName}`,
              newMessage.message?.substring(0, 100) || 'Bild gesendet',
              () => setActiveTab('chat')
            );
          } else {
            // Auto-mark as read if in chat tab
            await supabase
              .from('chat_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'chat_messages'
      }, async (payload: any) => {
        // When a message to this user is marked as read, refresh the count
        if (payload.new?.recipient_id === user.id && payload.new?.read_at && !payload.old?.read_at) {
          await fetchUnreadMessages();
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_evaluations'
      }, (payload: any) => {
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchPendingEvaluations();
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_assignments'
      }, (payload: any) => {
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchPendingEvaluations();
          fetchUnreadTasks();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab('tasks');
  };

  const menuSections = [
    {
      title: 'NAVIGATION',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tasks', label: 'Meine Aufträge', icon: ClipboardList, badge: unreadTasks > 0 ? unreadTasks : undefined },
        { id: 'evaluations', label: 'Bewertungsbögen', icon: ClipboardCheck, badge: pendingEvaluations > 0 ? pendingEvaluations : undefined },
        { id: 'compensation', label: 'Sondervergütungen', icon: Euro },
        { id: 'chat', label: 'Nachrichten', icon: MessageCircle, badge: unreadMessages > 0 ? unreadMessages : undefined },
        { id: 'documents', label: 'Dokumente', icon: FileText },
      ],
    },
    {
      title: 'VERWALTUNG',
      items: [
        { id: 'time', label: 'Zeiterfassung', icon: Clock },
        { id: 'vacation', label: 'Urlaub', icon: Calendar },
        { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
        { id: 'profile', label: 'Profil', icon: User },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EmployeeDashboardView onNavigate={setActiveTab} />;
      case 'tasks':
        return <EmployeeTasksView />;
      case 'evaluations':
        return <EmployeeEvaluationsView />;
      case 'compensation':
        return <EmployeeCompensationView />;
      case 'chat':
        return <EmployeeChatView />;
      case 'time':
        return <EmployeeTimeView />;
      case 'documents':
        return <EmployeeDocumentsView />;
      case 'vacation':
        return <EmployeeVacationView />;
      case 'notifications':
        return <EmployeeNotificationsView />;
      case 'profile':
        return <EmployeeProfileView />;
      default:
        return <EmployeeTasksView />;
    }
  };

  return (
    <TabContext.Provider value={{ setActiveTab, pendingTaskId, setPendingTaskId, pendingDocumentType, setPendingDocumentType }}>
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
            headerActions={<NotificationBell onClick={() => setActiveTab('notifications')} />}
            onNavigateToProfile={() => setActiveTab('profile')}
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
      </div>
    </TabContext.Provider>
  );
}
