import { format, formatDistanceToNow } from 'date-fns';

export function formatLimit(value: number | null | undefined): string {
  if (value == null) return 'Unlimited';
  return value.toLocaleString();
}

export function formatCompactNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatEventTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return format(d, 'MMM d, HH:mm');
  } catch {
    return iso;
  }
}

export function formatRelativeFromNow(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}
