import { useState, useMemo } from 'react';
import { Search, Plus, Clock, Tag, Euro, Mail, Key, FileText, ChevronRight, Sparkles, Briefcase, Building2, UserCheck, CreditCard, ShieldCheck, Smartphone, Globe, FileCheck, Users, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TagBadge, stringToTags } from './TagInput';
import { cn } from '@/lib/utils';
import { TaskPriority } from '@/types/panel';

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  customer_name: string | null;
  tag: string | null;
  priority: TaskPriority;
  special_compensation: number | null;
  test_email: string | null;
  test_password: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface TemplateGalleryProps {
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
  onManageTemplates: () => void;
  onCreateNew: () => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string; borderColor: string }> = {
  low: { 
    label: 'Niedrig', 
    color: 'text-slate-600 dark:text-slate-300', 
    bgColor: 'bg-slate-50 dark:bg-slate-800/40',
    borderColor: 'border-slate-200 dark:border-slate-700'
  },
  medium: { 
    label: 'Mittel', 
    color: 'text-sky-600 dark:text-sky-400', 
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    borderColor: 'border-sky-200 dark:border-sky-800'
  },
  high: { 
    label: 'Hoch', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  urgent: { 
    label: 'Dringend', 
    color: 'text-rose-600 dark:text-rose-400', 
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    borderColor: 'border-rose-200 dark:border-rose-800'
  },
};

// Smart icon selection based on template content
const getTemplateIcon = (template: TaskTemplate) => {
  const title = template.title.toLowerCase();
  const tags = stringToTags(template.tag).map(t => t.toLowerCase());
  const allText = `${title} ${tags.join(' ')} ${template.description || ''}`.toLowerCase();
  
  if (allText.includes('kyc') || allText.includes('identif') || allText.includes('verif')) {
    return ShieldCheck;
  }
  if (allText.includes('bank') || allText.includes('konto') || allText.includes('kredit') || allText.includes('finanz')) {
    return CreditCard;
  }
  if (allText.includes('firma') || allText.includes('business') || allText.includes('unternehm') || allText.includes('gmbh')) {
    return Building2;
  }
  if (allText.includes('kund') || allText.includes('client') || allText.includes('person')) {
    return UserCheck;
  }
  if (allText.includes('handy') || allText.includes('mobil') || allText.includes('sms') || allText.includes('phone')) {
    return Smartphone;
  }
  if (allText.includes('web') || allText.includes('online') || allText.includes('digital')) {
    return Globe;
  }
  if (allText.includes('dokument') || allText.includes('vertrag') || allText.includes('antrag')) {
    return FileCheck;
  }
  if (allText.includes('team') || allText.includes('gruppe') || allText.includes('mitarbeiter')) {
    return Users;
  }
  if (template.priority === 'urgent' || template.priority === 'high') {
    return Zap;
  }
  return Briefcase;
};

export function TemplateGallery({
  templates,
  onSelectTemplate,
  onManageTemplates,
  onCreateNew,
}: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<TaskTemplate | null>(null);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach((t) => {
      stringToTags(t.tag).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(searchLower) ||
        t.customer_name?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower);

      const tags = stringToTags(t.tag);
      const matchesTag = !selectedTag || tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [templates, search, selectedTag]);

  // Get recent templates (last 5)
  const recentTemplates = useMemo(() => {
    return [...templates]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [templates]);

  // Display template = hovered or first filtered
  const displayTemplate = hoveredTemplate || (filteredTemplates.length > 0 ? filteredTemplates[0] : null);

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
          <Briefcase className="h-10 w-10 text-primary/70" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Keine Vorlagen vorhanden</h3>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
          Erstelle deinen ersten Auftrag und speichere ihn als Vorlage für die Zukunft.
        </p>
        <Button onClick={onCreateNew} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" />
          Auftrag erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="space-y-4 pb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vorlagen durchsuchen..."
            className="pl-11 h-12 bg-muted/30 border-0 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        
        {/* Tag Pills - Modern Style */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
                !selectedTag
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Alle
            </button>
            {allTags.slice(0, 6).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className="transition-transform duration-200 hover:scale-105"
              >
                <TagBadge
                  tag={tag}
                  className={cn(
                    'cursor-pointer transition-all duration-200 px-3 py-1',
                    selectedTag === tag && 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg'
                  )}
                />
              </button>
            ))}
            {allTags.length > 6 && (
              <span className="px-3 py-1.5 text-sm text-muted-foreground font-medium">
                +{allTags.length - 6} mehr
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Template List */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {filteredTemplates.length} Vorlage{filteredTemplates.length !== 1 ? 'n' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTemplates}
              className="h-8 text-xs text-muted-foreground hover:text-primary gap-1.5 font-medium"
            >
              Verwalten
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2 pb-4">
              {/* Recent Templates Section */}
              {!search && !selectedTag && recentTemplates.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zuletzt verwendet</span>
                  </div>
                  <div className="space-y-2">
                    {recentTemplates.slice(0, 3).map((template) => (
                      <TemplateListItem
                        key={`recent-${template.id}`}
                        template={template}
                        isHovered={hoveredTemplate?.id === template.id}
                        onHover={() => setHoveredTemplate(template)}
                        onLeave={() => setHoveredTemplate(null)}
                        onSelect={() => onSelectTemplate(template)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Templates */}
              <div className="space-y-2">
                {filteredTemplates.map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    isHovered={hoveredTemplate?.id === template.id}
                    onHover={() => setHoveredTemplate(template)}
                    onLeave={() => setHoveredTemplate(null)}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Keine Vorlagen gefunden</p>
                  <p className="text-xs mt-1 opacity-70">Versuche andere Suchbegriffe</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 overflow-hidden flex flex-col shadow-inner">
          {displayTemplate ? (
            <TemplatePreview
              template={displayTemplate}
              onSelect={() => onSelectTemplate(displayTemplate)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Wähle eine Vorlage aus
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  um die Vorschau zu sehen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-5 mt-5 border-t border-border/50 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCreateNew}
          className="gap-2 text-muted-foreground hover:text-foreground font-medium"
        >
          <Plus className="h-4 w-4" />
          Ohne Vorlage erstellen
        </Button>
      </div>
    </div>
  );
}

// Template List Item Component
function TemplateListItem({
  template,
  isHovered,
  onHover,
  onLeave,
  onSelect,
}: {
  template: TaskTemplate;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const tags = stringToTags(template.tag);
  const priority = priorityConfig[template.priority];
  const Icon = getTemplateIcon(template);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/5',
        isHovered
          ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]'
          : 'border-transparent bg-background/60 hover:bg-background/80'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
          'shadow-sm',
          isHovered 
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
            : cn(priority.bgColor, priority.color, 'border', priority.borderColor)
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{template.title}</p>
          {template.customer_name && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {template.customer_name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
              priority.bgColor, priority.color, priority.borderColor
            )}>
              {priority.label}
            </span>
            {template.special_compensation && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {template.special_compensation}€
              </span>
            )}
            {tags.slice(0, 1).map((tag) => (
              <TagBadge key={tag} tag={tag} size="sm" />
            ))}
            {tags.length > 1 && (
              <span className="text-[10px] text-muted-foreground font-medium">+{tags.length - 1}</span>
            )}
          </div>
        </div>
        <ChevronRight className={cn(
          'h-5 w-5 shrink-0 transition-all duration-300',
          isHovered ? 'text-primary opacity-100 translate-x-0.5' : 'text-muted-foreground/30 opacity-0'
        )} />
      </div>
    </button>
  );
}

// Template Preview Component
function TemplatePreview({
  template,
  onSelect,
}: {
  template: TaskTemplate;
  onSelect: () => void;
}) {
  const tags = stringToTags(template.tag);
  const priority = priorityConfig[template.priority];
  const Icon = getTemplateIcon(template);

  return (
    <div className="flex flex-col h-full">
      {/* Header with Gradient */}
      <div className={cn(
        'p-5 border-b relative overflow-hidden',
        priority.bgColor
      )}>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-transparent -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-gradient-to-tr from-primary/5 to-transparent translate-y-1/2 -translate-x-1/2" />
        
        <div className="flex items-start gap-4 relative">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg',
            'bg-white dark:bg-background border-2',
            priority.borderColor
          )}>
            <Icon className={cn('h-7 w-7', priority.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight">{template.title}</h3>
            {template.customer_name && (
              <p className="text-sm text-muted-foreground mt-1">{template.customer_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-5">
        <div className="space-y-5">
          {/* Priority & Compensation */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(
              'font-semibold border',
              priority.bgColor, priority.color, priority.borderColor
            )}>
              {priority.label}
            </Badge>
            {template.special_compensation && (
              <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold gap-1.5">
                <Euro className="h-3 w-3" />
                {template.special_compensation}€
              </Badge>
            )}
          </div>

          {/* Description */}
          {template.description && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Beschreibung
              </p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background/80 rounded-xl p-4 border shadow-sm">
                {template.description}
              </div>
            </div>
          )}

          {/* Test Credentials */}
          {(template.test_email || template.test_password) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Test-Zugangsdaten
              </p>
              <div className="grid gap-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-200 dark:border-sky-800 shadow-sm">
                {template.test_email && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-800/50 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded">{template.test_email}</span>
                  </div>
                )}
                {template.test_password && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-800/50 flex items-center justify-center">
                      <Key className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded">{template.test_password}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} className="px-3 py-1" />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {template.notes && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notizen</p>
              <p className="text-sm bg-background/80 rounded-xl p-4 border whitespace-pre-wrap shadow-sm">
                {template.notes}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-5 border-t bg-background/50">
        <Button onClick={onSelect} size="lg" className="w-full gap-2 h-12 text-base font-semibold shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" />
          Vorlage verwenden
        </Button>
      </div>
    </div>
  );
}
