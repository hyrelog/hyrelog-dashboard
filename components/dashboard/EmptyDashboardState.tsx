import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyDashboardStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  /** Additional outline links (e.g. Event Explorer, API access). */
  secondary?: { href: string; label: string }[];
}

export function EmptyDashboardState({
  icon: Icon,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondary,
}: EmptyDashboardStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center"
      role="status"
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {primaryHref && primaryLabel ? (
        <Button asChild className="mt-6 bg-brand-600 text-white hover:bg-brand-700">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
      ) : null}
      {secondary && secondary.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {secondary.map((s) => (
            <Button key={s.href} variant="outline" size="sm" asChild>
              <Link href={s.href}>{s.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
