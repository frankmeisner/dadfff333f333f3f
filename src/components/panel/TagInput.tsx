import { useState, KeyboardEvent, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Predefined color palette for tags
const TAG_COLORS = [
  { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/30' },
  { bg: 'bg-sky-500/20', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-500/30' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500/30' },
  { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500/30' },
  { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-400', border: 'border-fuchsia-500/30' },
  { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/30' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500/30' },
  { bg: 'bg-teal-500/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/30' },
];

// Get a consistent color for a tag based on its hash
export function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function TagBadge({ tag, onRemove, className, size = 'default' }: TagBadgeProps) {
  const color = getTagColor(tag);
  
  return (
    <Badge
      variant="outline"
      className={cn(
        color.bg,
        color.text,
        color.border,
        'border transition-all duration-200',
        size === 'sm' ? 'text-xs px-2 py-0' : 'text-xs px-2.5 py-0.5',
        onRemove && 'pr-1 gap-1 hover:opacity-80',
        className
      )}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'ml-1 rounded-full p-0.5 hover:bg-foreground/10 transition-colors',
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          )}
        >
          <X className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        </button>
      )}
    </Badge>
  );
}

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  onTagsChange,
  placeholder = 'Tag hinzufügen...',
  suggestions = [],
  maxTags = 5,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) => 
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onTagsChange([...tags, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              onRemove={() => removeTag(tag)}
            />
          ))}
        </div>
      )}

      {/* Input */}
      {tags.length < maxTags && (
        <div className="relative">
          <div className="relative flex items-center">
            <Plus className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
              <div className="max-h-40 overflow-y-auto p-1">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(suggestion);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md hover:bg-muted transition-colors"
                  >
                    <TagBadge tag={suggestion} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tags.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          Maximale Anzahl an Tags erreicht ({maxTags})
        </p>
      )}
    </div>
  );
}

// Utility to convert tags array to comma-separated string (for DB storage)
export function tagsToString(tags: string[]): string {
  return tags.join(', ');
}

// Utility to parse comma-separated tags string to array
export function stringToTags(tagString: string | null | undefined): string[] {
  if (!tagString) return [];
  return tagString.split(',').map(t => t.trim()).filter(Boolean);
}
