import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, CheckCircle2, XCircle, Clock, User, Download, 
  Eye, Calendar, RefreshCw, Search, FileCheck, 
  FileX, Filter, X, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Document {
  id: string;
  user_id: string;
  task_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  document_type: string | null;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  task?: {
    title: string;
    customer_name: string;
  };
}

const documentTypeLabels: Record<string, string> = {
  'documentation': 'Dokumentation',
  'id_card': 'Personalausweis',
  'passport': 'Reisepass',
  'address_proof': 'Adressnachweis',
  'contract': 'Vertrag',
  'certificate': 'Zertifikat',
  'task_document': 'Auftragsdokument',
  'letter': 'Brief',
  'screenshot': 'Screenshot',
  'other': 'Sonstiges',
};

const statusLabels: Record<string, string> = {
  'pending': 'Ausstehend',
  'approved': 'Genehmigt',
  'rejected': 'Abgelehnt',
};

export default function AdminDocumentsView() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  
  const [users, setUsers] = useState<{ user_id: string; name: string }[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    
    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      toast({ title: 'Fehler', description: 'Dokumente konnten nicht geladen werden.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (docs) {
      const userIds = [...new Set(docs.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const taskIds = docs.filter(d => d.task_id).map(d => d.task_id) as string[];
      const { data: tasks } = taskIds.length > 0 
        ? await supabase
            .from('tasks')
            .select('id, title, customer_name')
            .in('id', taskIds)
        : { data: [] };

      const enrichedDocs = docs.map(doc => ({
        ...doc,
        status: (doc.status || 'pending') as 'pending' | 'approved' | 'rejected',
        profile: profiles?.find(p => p.user_id === doc.user_id),
        task: tasks?.find(t => t.id === doc.task_id),
      }));

      setDocuments(enrichedDocs as Document[]);
      
      // Extract unique users for filter
      const uniqueUsers = profiles?.map(p => ({
        user_id: p.user_id,
        name: `${p.first_name} ${p.last_name}`.trim()
      })) || [];
      setUsers(uniqueUsers);
    }
    
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDocuments();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePreview = async (doc: Document) => {
    setSelectedDocument(doc);
    setReviewNotes(doc.review_notes || '');
    
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);

    if (data && !error) {
      setPreviewUrl(data.signedUrl);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
      if (error) throw error;
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Download fehlgeschlagen.', variant: 'destructive' });
    }
  };

  const handleApprove = async (doc: Document) => {
    if (!user) return;
    setIsProcessing(true);
    
    try {
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_notes: reviewNotes || null
        })
        .eq('id', doc.id);

      if (updateError) {
        toast({ title: 'Fehler', description: 'Genehmigung fehlgeschlagen.', variant: 'destructive' });
        return;
      }

      // Notify user
      await supabase.from('notifications').insert({
        user_id: doc.user_id,
        title: 'Dokument genehmigt',
        message: `Dein Dokument "${doc.file_name}" wurde genehmigt.${reviewNotes ? ` Anmerkung: ${reviewNotes}` : ''}`,
        type: 'document_approved',
      });

      toast({ title: 'Erfolg', description: 'Dokument wurde genehmigt.' });
      setSelectedDocument(null);
      setReviewNotes('');
      setPreviewUrl(null);
      await fetchDocuments();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (doc: Document) => {
    if (!user || !reviewNotes.trim()) {
      toast({ title: 'Hinweis', description: 'Bitte gib einen Ablehnungsgrund an.', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_notes: reviewNotes
        })
        .eq('id', doc.id);

      if (updateError) {
        toast({ title: 'Fehler', description: 'Ablehnung fehlgeschlagen.', variant: 'destructive' });
        return;
      }

      // Notify user
      await supabase.from('notifications').insert({
        user_id: doc.user_id,
        title: 'Dokument abgelehnt',
        message: `Dein Dokument "${doc.file_name}" wurde abgelehnt. Grund: ${reviewNotes}`,
        type: 'document_rejected',
      });

      toast({ title: 'Erfolg', description: 'Dokument wurde abgelehnt.' });
      setSelectedDocument(null);
      setReviewNotes('');
      setPreviewUrl(null);
      await fetchDocuments();
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setUserFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || userFilter !== 'all';

  // Apply filters
  const filteredDocuments = documents.filter(doc => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        doc.file_name.toLowerCase().includes(q) ||
        doc.profile?.first_name.toLowerCase().includes(q) ||
        doc.profile?.last_name.toLowerCase().includes(q) ||
        doc.task?.title.toLowerCase().includes(q) ||
        doc.task?.customer_name.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    
    // Type filter
    if (typeFilter !== 'all' && doc.document_type !== typeFilter) return false;
    
    // User filter
    if (userFilter !== 'all' && doc.user_id !== userFilter) return false;
    
    return true;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">Genehmigt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">Abgelehnt</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">Ausstehend</Badge>;
    }
  };

  // Get unique document types from current documents
  const uniqueDocTypes = [...new Set(documents.map(d => d.document_type).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dokumenten-Übersicht</h2>
          <p className="text-muted-foreground">
            Alle hochgeladenen Dokumente verwalten und filtern
          </p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Ausstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === 'approved').length}</p>
                <p className="text-xs text-muted-foreground">Genehmigt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === 'rejected').length}</p>
                <p className="text-xs text-muted-foreground">Abgelehnt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                <X className="h-4 w-4" />
                Filter zurücksetzen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="approved">Genehmigt</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dokumenttyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {uniqueDocTypes.map(type => (
                  <SelectItem key={type} value={type!}>
                    {documentTypeLabels[type!] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* User filter */}
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Mitarbeiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredDocuments.length} von {documents.length} Dokumenten
        </p>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileX className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Keine Dokumente gefunden</p>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters ? 'Versuche andere Filtereinstellungen.' : 'Es wurden noch keine Dokumente hochgeladen.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-lg transition-all group">
              <CardContent className="p-0">
                {/* Header with document type badge */}
                <div className="p-4 bg-gradient-to-r from-muted/50 to-transparent border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold line-clamp-1 text-sm">{doc.file_name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {documentTypeLabels[doc.document_type || 'other']}
                          </Badge>
                          {doc.file_size && (
                            <span className="text-xs text-muted-foreground">
                              {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {doc.profile?.first_name} {doc.profile?.last_name}
                      </span>
                    </div>
                    {statusBadge(doc.status)}
                  </div>

                  {doc.task && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCheck className="h-4 w-4" />
                      <span className="line-clamp-1">Auftrag: {doc.task.title}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(doc.uploaded_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>

                  {doc.review_notes && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
                      {doc.review_notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handlePreview(doc)}
                  >
                    <Eye className="h-4 w-4" />
                    Ansehen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => { setSelectedDocument(null); setPreviewUrl(null); setReviewNotes(''); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.file_name}
            </DialogTitle>
            <DialogDescription>
              Von {selectedDocument?.profile?.first_name} {selectedDocument?.profile?.last_name}
              {selectedDocument?.task && ` • Auftrag: ${selectedDocument.task.title}`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 p-1">
              {/* Document preview */}
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border bg-muted/30">
                  {selectedDocument?.file_type.startsWith('image/') ? (
                    <img src={previewUrl} alt={selectedDocument.file_name} className="max-h-[400px] w-full object-contain" />
                  ) : selectedDocument?.file_type === 'application/pdf' ? (
                    <iframe src={previewUrl} className="w-full h-[400px]" title="PDF Preview" />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Vorschau nicht verfügbar</p>
                        <Button variant="outline" className="mt-4 gap-2" onClick={() => selectedDocument && handleDownload(selectedDocument)}>
                          <Download className="h-4 w-4" />
                          Herunterladen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Typ</p>
                  <p className="font-medium">{documentTypeLabels[selectedDocument?.document_type || 'other']}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div>{selectedDocument && statusBadge(selectedDocument.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Hochgeladen am</p>
                  <p className="font-medium">{selectedDocument && format(new Date(selectedDocument.uploaded_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                </div>
                {selectedDocument?.file_size && (
                  <div>
                    <p className="text-muted-foreground">Größe</p>
                    <p className="font-medium">{(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>

              {/* Review notes */}
              {selectedDocument?.status === 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anmerkungen / Ablehnungsgrund</label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional für Genehmigung, erforderlich für Ablehnung..."
                    rows={3}
                  />
                </div>
              )}

              {selectedDocument?.review_notes && selectedDocument.status !== 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anmerkungen</label>
                  <p className="text-sm bg-muted/50 p-3 rounded">{selectedDocument.review_notes}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => selectedDocument && handleDownload(selectedDocument)} className="gap-2">
              <Download className="h-4 w-4" />
              Herunterladen
            </Button>
            {selectedDocument?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10"
                  onClick={() => selectedDocument && handleReject(selectedDocument)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4" />
                  Ablehnen
                </Button>
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => selectedDocument && handleApprove(selectedDocument)}
                  disabled={isProcessing}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Genehmigen
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
