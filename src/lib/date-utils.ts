import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid,
} from 'date-fns';
import { it } from 'date-fns/locale';

export function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getWeeksOfMonth(date: Date): Date[][] {
  const days = getMonthDays(date);
  const weeks: Date[][] = [];
  
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  return weeks;
}

export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr) : '';
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: it });
}

export function formatDayOfWeek(date: Date): string {
  return format(date, 'EEE');
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'MMM d') : '';
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'HH:mm') : '';
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'd MMM yyyy HH:mm', { locale: it }) : '';
}

export function getDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1);
}

export function prevMonth(date: Date): Date {
  return subMonths(date, 1);
}

export function isCurrentMonth(date: Date, currentMonth: Date): boolean {
  return isSameMonth(date, currentMonth);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function getWeekRange(weekStart: Date): { start: string; end: string } {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  return {
    start: format(weekStart, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export function getDayOfWeekName(dayIndex: number): string {
  const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  return days[dayIndex];
}

export function getSessionFromHour(hour: number): string {
  // Asian: 00:00-08:00 UTC
  // London: 08:00-16:00 UTC  
  // New York: 13:00-21:00 UTC
  if (hour >= 0 && hour < 8) return 'Asian';
  if (hour >= 8 && hour < 13) return 'London';
  if (hour >= 13 && hour < 17) return 'London/NY Overlap';
  if (hour >= 17 && hour < 21) return 'New York';
  return 'Asian';
}

export function getWeekKey(date: Date): string {
  // Get ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}
