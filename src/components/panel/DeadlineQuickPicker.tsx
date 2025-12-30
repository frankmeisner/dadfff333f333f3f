import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock, Sun, Moon, Zap, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addHours, addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface DeadlineQuickPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface QuickOption {
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  getValue: () => Date;
  color: string;
}

export function DeadlineQuickPicker({ value, onChange, className }: DeadlineQuickPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  const quickOptions: QuickOption[] = [
    {
      label: 'Heute 18:00',
      sublabel: 'Feierabend',
      icon: Sun,
      getValue: () => setMinutes(setHours(today, 18), 0),
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
    },
    {
      label: 'Heute 22:00',
      sublabel: 'Spät',
      icon: Moon,
      getValue: () => setMinutes(setHours(today, 22), 0),
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20',
    },
    {
      label: 'In 2 Stunden',
      sublabel: format(addHours(now, 2), 'HH:mm'),
      icon: Zap,
      getValue: () => addHours(now, 2),
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
    },
    {
      label: 'Morgen 12:00',
      sublabel: 'Mittag',
      icon: CalendarDays,
      getValue: () => setMinutes(setHours(tomorrow, 12), 0),
      color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20',
    },
    {
      label: 'Morgen 18:00',
      sublabel: 'Feierabend',
      icon: Sun,
      getValue: () => setMinutes(setHours(tomorrow, 18), 0),
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    },
    {
      label: 'In 3 Tagen',
      sublabel: format(addDays(today, 3), 'EEEE', { locale: de }),
      icon: Calendar,
      getValue: () => setMinutes(setHours(addDays(today, 3), 18), 0),
      color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20',
    },
  ];

  const handleQuickSelect = (option: QuickOption) => {
    const date = option.getValue();
    // Format for datetime-local input
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const displayValue = value
    ? format(new Date(value), "dd.MM.yyyy 'um' HH:mm", { locale: de })
    : null;

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className={cn(
              'w-full justify-start text-left font-normal h-10',
              !value && 'text-muted-foreground',
              value && 'border-primary/30 bg-primary/5'
            )}
          >
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            {displayValue || 'Deadline wählen...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Schnellauswahl
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleQuickSelect(option)}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200',
                      'hover:scale-[1.02] active:scale-[0.98]',
                      option.color
                    )}
                  >
                    <div className="shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{option.label}</div>
                      {option.sublabel && (
                        <div className="text-[10px] opacity-70">{option.sublabel}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Benutzerdefiniert
              </div>
              <Input
                type="datetime-local"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setIsOpen(false);
                }}
                className="text-sm"
              />
            </div>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                Deadline entfernen
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
