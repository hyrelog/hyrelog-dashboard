import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, PlugZap } from 'lucide-react';

interface ApiHealthCardProps {
  apiConfigured: boolean;
  errorMessage?: string | null;
  /** Ingestion / connectivity CTAs (do not invent unsupported Explorer filters). */
  explorerHref?: string;
  settingsHref?: string;
}

export function ApiHealthCard({ apiConfigured, errorMessage, explorerHref, settingsHref }: ApiHealthCardProps) {
  const ok = apiConfigured && !errorMessage;
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {ok ? (
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <PlugZap className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
          )}
          API connectivity
        </CardTitle>
        <CardDescription>HyreLog dashboard service reachability (server-side check).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {ok ? (
          <p className="text-muted-foreground">HyreLog API is configured and responded for dashboard queries.</p>
        ) : !apiConfigured ? (
          <p className="text-muted-foreground">
            HYRELOG_API_URL / DASHBOARD_SERVICE_TOKEN are not set. Live charts and feeds stay empty.
          </p>
        ) : (
          <div className="space-y-2 text-destructive">
            <p>Live metrics could not be loaded from HyreLog right now.</p>
            <p className="text-muted-foreground">
              Refresh this page to retry. If the problem continues, confirm API access settings and service
              reachability.
            </p>
          </div>
        )}
        {(explorerHref || settingsHref) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {explorerHref ? (
              <Link
                href={explorerHref}
                className="text-sm font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400 cursor-pointer"
                aria-label="Open Event Explorer in the dashboard sample window"
              >
                Browse events
              </Link>
            ) : null}
            {settingsHref ? (
              <Link
                href={settingsHref}
                className="text-sm font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400 cursor-pointer"
                aria-label="Open API access settings"
              >
                API access settings
              </Link>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
