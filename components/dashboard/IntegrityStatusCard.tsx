import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export function IntegrityStatusCard() {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
          Integrity & audit
        </CardTitle>
        <CardDescription>
          HyreLog stores append-only audit events suitable for compliance workflows. We do not claim third-party
          certification in this panel—verify retention and export policies against your obligations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc space-y-2 pl-5">
          <li>Events retain actor, resource, trace, and network context when provided by your apps.</li>
          <li>Use exports and webhooks for downstream evidence stores.</li>
          <li>Review workspace region and retention settings for data residency.</li>
        </ul>
        <p>
          <Link
            href="/exports"
            className="font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400 cursor-pointer"
            aria-label="Open exports"
          >
            Open exports
          </Link>{' '}
          for immutable evidence bundles.
        </p>
      </CardContent>
    </Card>
  );
}
