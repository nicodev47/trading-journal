'use client';

import { useId, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMonthYear } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  triggerClassName?: string;
  triggerVariant?: 'outline' | 'ghost';
}

const MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

export function MonthYearPicker({
  value,
  onChange,
  triggerClassName,
  triggerVariant = 'outline',
}: MonthYearPickerProps) {
  const id = useId();
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const selectedYear = value.getFullYear();
    const minYear = Math.min(2018, selectedYear);
    const maxYear = Math.max(currentYear, selectedYear);

    return Array.from(
      { length: maxYear - minYear + 1 },
      (_, index) => maxYear - index
    );
  }, [value]);

  const handleMonthChange = (monthIndex: number) => {
    onChange(new Date(value.getFullYear(), monthIndex, 1));
  };

  const handleYearChange = (year: number) => {
    onChange(new Date(year, value.getMonth(), 1));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          className={cn(
            'h-9 min-w-[150px] rounded-lg border border-border bg-background/50 px-4 text-sm font-semibold capitalize text-foreground hover:bg-secondary/70 hover:text-foreground',
            triggerClassName
          )}
        >
          {formatMonthYear(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[260px] rounded-xl border border-border bg-card p-4 text-foreground shadow-xl"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`${id}-month`}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Mese
            </label>
            <Select
              value={String(value.getMonth())}
              onValueChange={(nextValue) =>
                handleMonthChange(Number(nextValue))
              }
            >
              <SelectTrigger
                id={`${id}-month`}
                className="relative flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background/50 px-4 text-sm font-semibold text-foreground hover:bg-secondary/40 focus-visible:border-profit/60"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={String(index)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${id}-year`}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Anno
            </label>
            <Select
              value={String(value.getFullYear())}
              onValueChange={(nextValue) =>
                handleYearChange(Number(nextValue))
              }
            >
              <SelectTrigger
                id={`${id}-year`}
                className="relative flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background/50 px-4 text-sm font-semibold text-foreground hover:bg-secondary/40 focus-visible:border-profit/60"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
