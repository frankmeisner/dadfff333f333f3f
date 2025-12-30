import { useState, useMemo } from 'react';
import { Check, Search, Bookmark, Plus, Clock, Star, ChevronRight } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface TemplateCommandMenuProps {
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
  onManageTemplates: () => void;
  className?: string;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  high: 'bg-red-500/20 text-red-700 dark:text-red-400',
  urgent: 'bg-red-600/30 text-red-800 dark:text-red-300',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend',
};

export function TemplateCommandMenu({
  templates,
  onSelectTemplate,
  onManageTemplates,
  className,
}: TemplateCommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

  // Group templates by first tag
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, TaskTemplate[]> = { 'Ohne Tag': [] };
    
    filteredTemplates.forEach((t) => {
      const tags = stringToTags(t.tag);
      if (tags.length === 0) {
        groups['Ohne Tag'].push(t);
      } else {
        const firstTag = tags[0];
        if (!groups[firstTag]) groups[firstTag] = [];
        groups[firstTag].push(t);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) delete groups[key];
    });

    return groups;
  }, [filteredTemplates]);

  // Get recent templates (last 3)
  const recentTemplates = useMemo(() => {
    return [...templates]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [templates]);

  if (templates.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-11 text-sm font-normal',
            'border-dashed hover:border-primary/50 hover:bg-primary/5',
            'transition-all duration-200',
            className
          )}
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            Vorlage auswählen...
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Vorlagen durchsuchen..."
            value={search}
            onValueChange={setSearch}
          />
          
          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 border-b bg-muted/30">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full border transition-all',
                  !selectedTag
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                )}
              >
                Alle
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  <TagBadge
                    tag={tag}
                    size="sm"
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedTag === tag && 'ring-2 ring-primary ring-offset-1'
                    )}
                  />
                </button>
              ))}
            </div>
          )}
          
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              <div className="py-6 text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Keine Vorlagen gefunden</p>
              </div>
            </CommandEmpty>

            {/* Recent Templates - only show when no search/filter */}
            {!search && !selectedTag && recentTemplates.length > 0 && (
              <>
                <CommandGroup heading="Zuletzt erstellt">
                  {recentTemplates.map((template) => (
                    <CommandItem
                      key={`recent-${template.id}`}
                      value={template.id}
                      onSelect={() => {
                        onSelectTemplate(template);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 py-3"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{template.title}</p>
                        {template.customer_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {template.customer_name}
                          </p>
                        )}
                      </div>
                      <Badge className={cn(priorityColors[template.priority], 'text-[10px] shrink-0')}>
                        {priorityLabels[template.priority]}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Grouped Templates */}
            {Object.entries(groupedTemplates).map(([groupName, groupTemplates]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {groupTemplates.map((template) => {
                  const tags = stringToTags(template.tag);
                  return (
                    <CommandItem
                      key={template.id}
                      value={template.id}
                      onSelect={() => {
                        onSelectTemplate(template);
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 py-3"
                    >
                      <Bookmark className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{template.title}</p>
                        </div>
                        {template.customer_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {template.customer_name}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className={cn(priorityColors[template.priority], 'text-[10px]')}>
                            {priorityLabels[template.priority]}
                          </Badge>
                          {template.special_compensation && (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                              {template.special_compensation}€
                            </Badge>
                          )}
                          {tags.slice(0, 2).map((tag) => (
                            <TagBadge key={tag} tag={tag} size="sm" />
                          ))}
                          {tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
          
          <CommandSeparator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                onManageTemplates();
              }}
            >
              <Plus className="h-4 w-4" />
              Vorlagen verwalten...
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
