import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(date: Date | string, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
}

export function isThisWeek(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return dateObj >= weekAgo && dateObj <= today;
}

export function getQuarterRange(date: Date = new Date()): { start: Date; end: Date } {
  const month = date.getMonth(); // 0-11
  const q = Math.floor(month / 3); // 0..3
  const startMonth = q * 3;
  const start = new Date(date.getFullYear(), startMonth, 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999); // last day of quarter
  return { start, end };
}
