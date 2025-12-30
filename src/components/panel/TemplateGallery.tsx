import { useState, useMemo } from 'react';
import { Search, Plus, Clock, Tag, Euro, Mail, Key, FileText, ChevronRight, Sparkles, Briefcase, Building2, UserCheck, CreditCard, ShieldCheck, Smartphone, Globe, FileCheck, Users, Zap, GripVertical, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TagBadge, stringToTags } from './TagInput';
import { cn } from '@/lib/utils';
import { TaskPriority } from '@/types/panel';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  sort_order?: number;
  is_favorite?: boolean;
  estimated_duration?: number | null;
}

interface TemplateGalleryProps {
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
  onManageTemplates: () => void;
  onCreateNew: () => void;
  onReorderTemplates?: (reorderedIds: string[]) => void;
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => void;
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
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  urgent: { 
    label: 'Dringend', 
    color: 'text-red-700 dark:text-red-300', 
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    borderColor: 'border-red-300 dark:border-red-700'
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
  onReorderTemplates,
  onToggleFavorite,
}: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<TaskTemplate | null>(null);
  const [localTemplates, setLocalTemplates] = useState<TaskTemplate[]>(templates);

  // Update local templates when props change
  useMemo(() => {
    setLocalTemplates(templates);
  }, [templates]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    localTemplates.forEach((t) => {
      stringToTags(t.tag).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [localTemplates]);

  // Separate favorites and sort templates
  const sortedTemplates = useMemo(() => {
    const favorites = localTemplates.filter(t => t.is_favorite);
    const regular = localTemplates.filter(t => !t.is_favorite);
    return [...favorites, ...regular];
  }, [localTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return sortedTemplates.filter((t) => {
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
  }, [sortedTemplates, search, selectedTag]);

  // Display template = hovered or first filtered
  const displayTemplate = hoveredTemplate || (filteredTemplates.length > 0 ? filteredTemplates[0] : null);

  // Can drag only when not searching/filtering
  const canDrag = !search && !selectedTag;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localTemplates.findIndex((t) => t.id === active.id);
      const newIndex = localTemplates.findIndex((t) => t.id === over.id);
      
      const newOrder = arrayMove(localTemplates, oldIndex, newIndex);
      setLocalTemplates(newOrder);
      
      if (onReorderTemplates) {
        onReorderTemplates(newOrder.map(t => t.id));
      }
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
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

  const favoriteCount = filteredTemplates.filter(t => t.is_favorite).length;

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="space-y-4 pb-4 shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vorlagen durchsuchen..."
            className="pl-11 h-11 bg-muted/30 border-0 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        
        {/* Tag Pills - Modern Style */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-all duration-200',
                !selectedTag
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Alle
            </button>
            {allTags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className="transition-transform duration-200 hover:scale-105"
              >
                <TagBadge
                  tag={tag}
                  size="sm"
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    selectedTag === tag && 'ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg'
                  )}
                />
              </button>
            ))}
            {allTags.length > 5 && (
              <span className="px-2 py-1 text-xs text-muted-foreground font-medium">
                +{allTags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-auto" style={{ maxHeight: '400px' }}>
        {/* Template List */}
        <div className="w-1/2 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {filteredTemplates.length} Vorlage{filteredTemplates.length !== 1 ? 'n' : ''}
              {favoriteCount > 0 && <span className="ml-1 text-amber-500">• {favoriteCount} ★</span>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTemplates}
              className="h-7 text-[10px] text-muted-foreground hover:text-primary gap-1 font-medium"
            >
              Verwalten
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto -mx-1 px-1" style={{ maxHeight: '340px' }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTemplates.map(t => t.id)}
                strategy={verticalListSortingStrategy}
                disabled={!canDrag}
              >
                <div className="space-y-1.5 pb-4">
                  {filteredTemplates.map((template, index) => (
                    <SortableTemplateItem
                      key={template.id}
                      template={template}
                      index={index}
                      isHovered={hoveredTemplate?.id === template.id}
                      onHover={() => setHoveredTemplate(template)}
                      onLeave={() => setHoveredTemplate(null)}
                      onSelect={() => onSelectTemplate(template)}
                      onToggleFavorite={onToggleFavorite}
                      canDrag={canDrag}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground animate-fade-in">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Search className="h-5 w-5 opacity-40" />
                </div>
                <p className="text-sm font-medium">Keine Vorlagen gefunden</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40 overflow-hidden flex flex-col">
          {displayTemplate ? (
            <TemplatePreview
              template={displayTemplate}
              onSelect={() => onSelectTemplate(displayTemplate)}
              onToggleFavorite={onToggleFavorite}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-7 w-7 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Vorlage auswählen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          onClick={onCreateNew}
          className="gap-2 text-muted-foreground hover:text-foreground text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Ohne Vorlage erstellen
        </Button>
      </div>
    </div>
  );
}

// Sortable Template List Item Component
function SortableTemplateItem({
  template,
  index,
  isHovered,
  onHover,
  onLeave,
  onSelect,
  onToggleFavorite,
  canDrag,
}: {
  template: TaskTemplate;
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => void;
  canDrag: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${index * 40}ms`,
  };

  const tags = stringToTags(template.tag);
  const priority = priorityConfig[template.priority];
  const Icon = getTemplateIcon(template);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'animate-fade-in',
        isDragging && 'z-50 relative'
      )}
    >
      <div
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className={cn(
          'w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer group',
          isDragging 
            ? 'shadow-2xl shadow-primary/20 border-primary bg-background scale-105 opacity-90'
            : isHovered
              ? 'border-primary/30 bg-primary/5 shadow-md'
              : 'border-transparent bg-background/70 hover:bg-background'
        )}
      >
        <div className="flex items-start gap-2.5">
          {/* Drag Handle */}
          {canDrag && (
            <div
              {...attributes}
              {...listeners}
              className={cn(
                'shrink-0 p-1 -ml-0.5 rounded cursor-grab active:cursor-grabbing transition-all',
                'text-muted-foreground/30 hover:text-muted-foreground/60',
                isDragging && 'text-primary'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
          
          {/* Favorite Star */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(template.id, !template.is_favorite);
            }}
            className={cn(
              'shrink-0 p-1 -ml-0.5 rounded transition-all duration-200',
              template.is_favorite 
                ? 'text-amber-500 hover:text-amber-600' 
                : 'text-muted-foreground/30 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            )}
          >
            <Star className={cn('h-3.5 w-3.5', template.is_favorite && 'fill-current')} />
          </button>
          
          <div 
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
              isHovered || isDragging
                ? 'bg-primary text-primary-foreground shadow-md' 
                : cn(priority.bgColor, priority.color)
            )}
            onClick={onSelect}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0" onClick={onSelect}>
            <p className="font-medium text-sm truncate leading-tight">{template.title}</p>
            {template.customer_name && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {template.customer_name}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={cn(
                'text-[9px] font-semibold px-1.5 py-0.5 rounded',
                priority.bgColor, priority.color
              )}>
                {priority.label}
              </span>
              {template.special_compensation && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  {template.special_compensation}€
                </span>
              )}
              {tags.slice(0, 1).map((tag) => (
                <TagBadge key={tag} tag={tag} size="sm" />
              ))}
              {tags.length > 1 && (
                <span className="text-[9px] text-muted-foreground">+{tags.length - 1}</span>
              )}
            </div>
          </div>
          <ChevronRight className={cn(
            'h-4 w-4 shrink-0 transition-all duration-200 self-center',
            isHovered ? 'text-primary opacity-100' : 'opacity-0'
          )} />
        </div>
      </div>
    </div>
  );
}

// Template Preview Component
function TemplatePreview({
  template,
  onSelect,
  onToggleFavorite,
}: {
  template: TaskTemplate;
  onSelect: () => void;
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => void;
}) {
  const tags = stringToTags(template.tag);
  const priority = priorityConfig[template.priority];
  const Icon = getTemplateIcon(template);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className={cn(
        'p-4 border-b relative overflow-hidden shrink-0',
        priority.bgColor
      )}>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-transparent -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-start gap-3 relative">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shadow-md',
            'bg-white dark:bg-background border',
            priority.borderColor
          )}>
            <Icon className={cn('h-6 w-6', priority.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-base leading-tight">{template.title}</h3>
              <button
                type="button"
                onClick={() => onToggleFavorite?.(template.id, !template.is_favorite)}
                className={cn(
                  'shrink-0 p-1.5 rounded-lg transition-all duration-200',
                  template.is_favorite 
                    ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' 
                    : 'text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                )}
              >
                <Star className={cn('h-4 w-4', template.is_favorite && 'fill-current')} />
              </button>
            </div>
            {template.customer_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{template.customer_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Priority & Compensation */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn('font-medium text-xs', priority.bgColor, priority.color)}>
              {priority.label}
            </Badge>
            {template.special_compensation && (
              <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium text-xs gap-1">
                <Euro className="h-3 w-3" />
                {template.special_compensation}€
              </Badge>
            )}
          </div>

          {/* Description */}
          {template.description && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Beschreibung
              </p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background/80 rounded-lg p-3 border">
                {template.description}
              </div>
            </div>
          )}

          {/* Test Credentials */}
          {(template.test_email || template.test_password) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Key className="h-3 w-3" />
                Test-Zugangsdaten
              </p>
              <div className="grid gap-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 border border-sky-200/50 dark:border-sky-800/50">
                {template.test_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-sky-500" />
                    <span className="font-mono text-xs">{template.test_email}</span>
                  </div>
                )}
                {template.test_password && (
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-3.5 w-3.5 text-sky-500" />
                    <span className="font-mono text-xs">{template.test_password}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} size="sm" />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {template.notes && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notizen</p>
              <p className="text-sm bg-background/80 rounded-lg p-3 border whitespace-pre-wrap">
                {template.notes}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-background/50 shrink-0">
        <Button onClick={onSelect} className="w-full gap-2 h-10 font-semibold shadow-md shadow-primary/15">
          <Plus className="h-4 w-4" />
          Vorlage verwenden
        </Button>
      </div>
    </div>
  );
}
