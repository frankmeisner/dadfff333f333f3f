import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DurationPickerProps {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}

interface DurationOption {
  label: string;
  minutes: number;
  color: string;
}

export function DurationPicker({ value, onChange, className }: DurationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  const durationOptions: DurationOption[] = [
    { label: '15 Min', minutes: 15, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
    { label: '30 Min', minutes: 30, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20' },
    { label: '45 Min', minutes: 45, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
    { label: '1 Std', minutes: 60, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20' },
    { label: '1,5 Std', minutes: 90, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20' },
    { label: '2 Std', minutes: 120, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20' },
  ];

  const handleSelect = (minutes: number) => {
    onChange(minutes);
    setIsOpen(false);
  };

  const handleCustom = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0) {
      onChange(mins);
      setCustomMinutes('');
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} Std`;
    return `${hours} Std ${mins} Min`;
  };

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
            <Clock className="mr-2 h-4 w-4 text-primary" />
            {value ? formatDuration(value) : 'Dauer...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Bearbeitungsdauer
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.minutes}
                  type="button"
                  onClick={() => handleSelect(option.minutes)}
                  className={cn(
                    'p-2 rounded-lg border text-center font-medium text-sm transition-all duration-200',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    value === option.minutes ? 'ring-2 ring-primary ring-offset-1' : '',
                    option.color
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Benutzerdefiniert (Minuten)
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="z.B. 75"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCustom}
                  disabled={!customMinutes || isNaN(parseInt(customMinutes))}
                >
                  OK
                </Button>
              </div>
            </div>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                Dauer entfernen
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
