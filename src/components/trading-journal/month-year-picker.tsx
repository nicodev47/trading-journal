'use client';

import { useId, useMemo, useState } from 'react';
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
  triggerLabel?: string;
  showTodayButton?: boolean;
  actionLabel?: string;
  onActionClick?: () => void;
  firstTradeMonth?: Date | null;
  lastTradeMonth?: Date | null;
  availableMonths?: Date[];
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
  triggerLabel,
  showTodayButton = false,
  actionLabel,
  onActionClick,
  firstTradeMonth,
  lastTradeMonth,
  availableMonths,
}: MonthYearPickerProps) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const hasTradeNavigation =
    firstTradeMonth !== undefined || lastTradeMonth !== undefined;
  const years = useMemo(() => {
    if (availableMonths) {
      return Array.from(
        new Set(availableMonths.map((month) => month.getFullYear()))
      ).sort((a, b) => b - a);
    }

    const currentYear = new Date().getFullYear();
    const selectedYear = value.getFullYear();
    const minYear = Math.min(2018, selectedYear);
    const maxYear = Math.max(currentYear, selectedYear);

    return Array.from(
      { length: maxYear - minYear + 1 },
      (_, index) => maxYear - index
    );
  }, [availableMonths, value]);
  const months = useMemo(() => {
    if (!availableMonths) {
      return MONTHS.map((label, index) => ({ label, index }));
    }

    const availableMonthIndexes = new Set(
      availableMonths
        .filter((month) => month.getFullYear() === value.getFullYear())
        .map((month) => month.getMonth())
    );

    return MONTHS
      .map((label, index) => ({ label, index }))
      .filter((month) => availableMonthIndexes.has(month.index));
  }, [availableMonths, value]);

  const handleMonthChange = (monthIndex: number) => {
    onChange(new Date(value.getFullYear(), monthIndex, 1));
  };

  const handleYearChange = (year: number) => {
    const monthsInYear = availableMonths
      ?.filter((month) => month.getFullYear() === year)
      .map((month) => month.getMonth())
      .sort((a, b) => a - b);
    const nextMonth = monthsInYear?.includes(value.getMonth())
      ? value.getMonth()
      : monthsInYear?.at(-1) ?? value.getMonth();

    onChange(new Date(year, nextMonth, 1));
  };

  const handleTodayClick = () => {
    onChange(new Date());
    setIsOpen(false);
  };

  const handleTradeMonthClick = (date?: Date | null) => {
    if (!date) return;

    onChange(date);
    setIsOpen(false);
  };

  const handleActionClick = () => {
    if (onActionClick) {
      onActionClick();
      setIsOpen(false);
      return;
    }

    handleTodayClick();
  };

  const handleGoToChange = (nextValue: string) => {
    if (nextValue === 'first-trade') {
      handleTradeMonthClick(firstTradeMonth);
      return;
    }

    if (nextValue === 'last-trade') {
      handleTradeMonthClick(lastTradeMonth);
      return;
    }

    if (nextValue === 'today') {
      handleActionClick();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          className={cn(
            'h-9 min-w-0 rounded-lg border border-border bg-background/50 px-3 text-sm font-semibold capitalize text-foreground hover:bg-secondary/70 hover:text-foreground sm:min-w-[150px] sm:px-4',
            triggerClassName
          )}
        >
          {triggerLabel ?? formatMonthYear(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[min(260px,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 text-foreground shadow-xl"
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
                {months.map((month) => (
                  <SelectItem key={month.label} value={String(month.index)}>
                    {month.label}
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

          {hasTradeNavigation && (
            <div className="space-y-1.5">
              <label
                htmlFor={`${id}-go-to`}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Vai a
              </label>
              <Select
                value=""
                onValueChange={handleGoToChange}
              >
                <SelectTrigger
                  id={`${id}-go-to`}
                  className="relative flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background/50 px-4 text-sm font-semibold text-foreground hover:bg-secondary/40 focus-visible:border-profit/60"
                >
                  <SelectValue placeholder="Seleziona destinazione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first-trade" disabled={!firstTradeMonth}>
                    Primo trade
                  </SelectItem>
                  <SelectItem value="last-trade" disabled={!lastTradeMonth}>
                    Ultimo trade
                  </SelectItem>
                  {showTodayButton && (
                    <SelectItem value="today">
                      {actionLabel ?? 'Oggi'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {showTodayButton && !hasTradeNavigation && (
            <Button
              type="button"
              variant="outline"
              onClick={handleActionClick}
              className="mt-1 h-11 w-full rounded-xl border-profit/35 bg-profit/10 font-sans text-sm font-semibold text-profit transition-colors hover:border-profit/60 hover:bg-profit/15 hover:text-profit"
            >
              {actionLabel ?? 'Vai a oggi'}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
