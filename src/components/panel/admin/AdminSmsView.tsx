import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SmsCodeRequest, Task, Profile } from '@/types/panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Send, Clock, CheckCircle, User, RefreshCw, Filter, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type SmsStatus = 'pending' | 'forwarded' | 'done';

export default function AdminSmsView() {
  const [requests, setRequests] = useState<(SmsCodeRequest & { task?: Task; profile?: Profile })[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SmsCodeRequest | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [activeFilter, setActiveFilter] = useState<SmsStatus | 'all'>('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('sms-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_code_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('sms_code_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (data) {
      // Fetch related tasks and profiles
      const taskIds = [...new Set(data.map(r => r.task_id))];
      const userIds = [...new Set(data.map(r => r.user_id))];

      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from('tasks').select('*').in('id', taskIds),
        supabase.from('profiles').select('*').in('user_id', userIds)
      ]);

      const enrichedData = data.map(request => ({
        ...request,
        task: tasksRes.data?.find(t => t.id === request.task_id) as Task | undefined,
        profile: profilesRes.data?.find(p => p.user_id === request.user_id) as Profile | undefined
      }));

      setRequests(enrichedData);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleForwardCode = async () => {
    if (!selectedRequest || !smsCode.trim()) {
      toast({ title: 'Fehler', description: 'Bitte SMS-Code eingeben.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('sms_code_requests')
      .update({
        sms_code: smsCode,
        forwarded_at: new Date().toISOString(),
        forwarded_by: user?.id,
        status: 'forwarded'
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Fehler', description: 'Code konnte nicht weitergeleitet werden.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'SMS-Code wurde weitergeleitet.' });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setSmsCode('');
      fetchRequests();
    }
  };

  const handleMarkAsDone = async (requestId: string) => {
    const { error } = await supabase
      .from('sms_code_requests')
      .update({ status: 'done' })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'Fehler', description: 'Status konnte nicht aktualisiert werden.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Anfrage als erledigt markiert.' });
      fetchRequests();
    }
  };

  // Counts
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'resend_requested');
  const forwardedRequests = requests.filter(r => r.status === 'forwarded');
  const doneRequests = requests.filter(r => r.status === 'done');

  const getFilteredRequests = () => {
    switch (activeFilter) {
      case 'pending':
        return pendingRequests;
      case 'forwarded':
        return forwardedRequests;
      case 'done':
        return doneRequests;
      default:
        return requests;
    }
  };

  const filteredRequests = getFilteredRequests();

  const renderRequestCard = (request: (SmsCodeRequest & { task?: Task; profile?: Profile })) => {
    const isPending = request.status === 'pending' || request.status === 'resend_requested';
    const isForwarded = request.status === 'forwarded';
    const isDone = request.status === 'done';

    return (
      <Card 
        key={request.id} 
        className={`shadow-card border-l-4 ${
          isPending ? 'border-l-orange-500' : 
          isForwarded ? 'border-l-blue-500' : 
          'border-l-green-500 opacity-75'
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{request.task?.title || 'Unbekannter Auftrag'}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <User className="h-4 w-4" />
                {request.profile?.first_name} {request.profile?.last_name}
              </p>
            </div>
            <Badge 
              variant="status" 
              className={
                isPending ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                isForwarded ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                'bg-green-500/20 text-green-700 dark:text-green-400'
              }
            >
              {isPending ? 'Ausstehend' : isForwarded ? 'Weitergeleitet' : 'Erledigt'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Angefordert: {format(new Date(request.requested_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
              {request.forwarded_at && (
                <p>Weitergeleitet: {format(new Date(request.forwarded_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isPending && (
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setIsDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Code weiterleiten
                </Button>
              )}
              {isForwarded && (
                <Button
                  variant="outline"
                  onClick={() => handleMarkAsDone(request.id)}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Erledigt
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SMS-Code Anfragen</h2>
          <p className="text-muted-foreground">Live-Übersicht aller SMS-Code Anfragen</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Filter className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={activeFilter === 'pending' ? 'ring-2 ring-orange-500' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setActiveFilter('pending')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-xs text-muted-foreground">Ausstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={activeFilter === 'forwarded' ? 'ring-2 ring-blue-500' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setActiveFilter('forwarded')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{forwardedRequests.length}</p>
                <p className="text-xs text-muted-foreground">Weitergeleitet</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={activeFilter === 'done' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setActiveFilter('done')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{doneRequests.length}</p>
                <p className="text-xs text-muted-foreground">Erledigt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as SmsStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Alle ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Ausstehend ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="forwarded" className="gap-2">
            <Send className="h-4 w-4" />
            Weitergeleitet ({forwardedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="done" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Erledigt ({doneRequests.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {activeFilter === 'pending' && 'Keine ausstehenden SMS-Anfragen.'}
                {activeFilter === 'forwarded' && 'Keine weitergeleiteten SMS-Anfragen.'}
                {activeFilter === 'done' && 'Keine erledigten SMS-Anfragen.'}
                {activeFilter === 'all' && 'Keine SMS-Anfragen vorhanden.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map(renderRequestCard)}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS-Code weiterleiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Auftrag: <strong>{selectedRequest?.task?.title}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Mitarbeiter: <strong>{selectedRequest?.profile?.first_name} {selectedRequest?.profile?.last_name}</strong>
            </p>
            <div className="space-y-2">
              <Label>SMS-Code eingeben</Label>
              <Input
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                placeholder="123456"
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <Button onClick={handleForwardCode} className="w-full gap-2">
              <Send className="h-4 w-4" />
              Code weiterleiten
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
