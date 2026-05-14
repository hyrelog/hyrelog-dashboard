'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EventsExplorerError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Event explorer unavailable</CardTitle>
          <CardDescription>
            We could not load this page. Your session is unchanged; try again in a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
