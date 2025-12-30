import { useState, useMemo } from 'react';
import { Search, Bookmark, Plus, Clock, Tag, Euro, Mail, Key, FileText, ChevronRight, Sparkles, X } from 'lucide-react';
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

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Niedrig', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800/50' },
  medium: { label: 'Mittel', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  high: { label: 'Hoch', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  urgent: { label: 'Dringend', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
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

  // Display template = hovered or first recent
  const displayTemplate = hoveredTemplate || (filteredTemplates.length > 0 ? filteredTemplates[0] : null);

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Keine Vorlagen vorhanden</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Erstelle deinen ersten Auftrag und speichere ihn als Vorlage für die Zukunft.
        </p>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Auftrag erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="space-y-3 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vorlagen durchsuchen..."
            className="pl-10 h-11 bg-muted/30"
          />
        </div>
        
        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full border transition-all',
                !selectedTag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              Alle
            </button>
            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                <TagBadge
                  tag={tag}
                  size="sm"
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105',
                    selectedTag === tag && 'ring-2 ring-primary ring-offset-1'
                  )}
                />
              </button>
            ))}
            {allTags.length > 8 && (
              <span className="px-2 py-1 text-xs text-muted-foreground">+{allTags.length - 8}</span>
            )}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Template List */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {filteredTemplates.length} Vorlage{filteredTemplates.length !== 1 ? 'n' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTemplates}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              Verwalten
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2 pb-4">
              {/* Recent Templates Section */}
              {!search && !selectedTag && recentTemplates.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Zuletzt verwendet</span>
                  </div>
                  <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine Vorlagen gefunden</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 border rounded-xl bg-muted/20 overflow-hidden flex flex-col">
          {displayTemplate ? (
            <TemplatePreview
              template={displayTemplate}
              onSelect={() => onSelectTemplate(displayTemplate)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Wähle eine Vorlage aus, um die Vorschau zu sehen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-4 border-t flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCreateNew}
          className="gap-2 text-muted-foreground hover:text-foreground"
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

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all duration-200',
        'hover:border-primary/40 hover:bg-primary/5',
        isHovered
          ? 'border-primary/50 bg-primary/5 shadow-sm'
          : 'border-transparent bg-background/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          priority.bgColor
        )}>
          <Bookmark className={cn('h-4 w-4', priority.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{template.title}</p>
          {template.customer_name && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {template.customer_name}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', priority.bgColor, priority.color)}>
              {priority.label}
            </span>
            {template.special_compensation && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                {template.special_compensation}€
              </span>
            )}
            {tags.slice(0, 1).map((tag) => (
              <TagBadge key={tag} tag={tag} size="sm" />
            ))}
            {tags.length > 1 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 1}</span>
            )}
          </div>
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 shrink-0 transition-all',
          isHovered ? 'text-primary opacity-100' : 'text-muted-foreground opacity-0'
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn('p-4 border-b', priority.bgColor)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center">
            <Bookmark className={cn('h-5 w-5', priority.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{template.title}</h3>
            {template.customer_name && (
              <p className="text-sm text-muted-foreground">{template.customer_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Priority & Compensation */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(priority.bgColor, priority.color, 'border-0')}>
              {priority.label}
            </Badge>
            {template.special_compensation && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 gap-1">
                <Euro className="h-3 w-3" />
                {template.special_compensation}€
              </Badge>
            )}
          </div>

          {/* Description */}
          {template.description && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Beschreibung
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap bg-background/50 rounded-lg p-3 border">
                {template.description}
              </p>
            </div>
          )}

          {/* Test Credentials */}
          {(template.test_email || template.test_password) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Key className="h-3 w-3" />
                Test-Zugangsdaten
              </p>
              <div className="grid gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800/30">
                {template.test_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span className="font-mono text-xs">{template.test_email}</span>
                  </div>
                )}
                {template.test_password && (
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-blue-500" />
                    <span className="font-mono text-xs">{template.test_password}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {template.notes && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notizen</p>
              <p className="text-sm bg-background/50 rounded-lg p-3 border whitespace-pre-wrap">
                {template.notes}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-background/50">
        <Button onClick={onSelect} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Vorlage verwenden
        </Button>
      </div>
    </div>
  );
}
