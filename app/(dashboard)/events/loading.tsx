import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} style={style} />;
}

/** Matches `EventsExplorerContent` shell heights to avoid layout jump (sticky header + results card). */
export default function EventsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-8 w-48 max-w-full" />
              <Shimmer className="h-4 w-full max-w-xl" />
              <Shimmer className="h-3 w-40" />
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Shimmer className="h-9 w-28 rounded-md" />
              <Shimmer className="h-9 w-24 rounded-md" />
              <Shimmer className="h-9 w-36 rounded-md" />
              <Shimmer className="h-9 w-24 rounded-md" />
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-7 w-36 max-w-[min(100%,14rem)] rounded-full" />
            ))}
          </div>

          <div className="-mx-4 flex min-w-0 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex w-[200px] shrink-0 flex-col gap-1.5 sm:w-auto sm:min-w-[160px]">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-9 w-full rounded-md" />
              </div>
            ))}
            <Shimmer className="h-9 w-28 shrink-0 self-end rounded-md" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 p-4 sm:p-6">
        <Card>
          <CardHeader className="space-y-2">
            <Shimmer className="h-6 w-32" />
            <Shimmer className="h-4 w-full max-w-2xl" />
            <Shimmer className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <div className="min-w-[900px] p-0">
                <div className="grid grid-cols-9 gap-2 border-b bg-muted/30 px-3 py-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Shimmer key={i} className="h-4 w-full" />
                  ))}
                </div>
                {Array.from({ length: 8 }, (_v, row: number) => (
                  <div key={row} className="grid grid-cols-9 gap-2 border-b px-3 py-3 last:border-0">
                    {Array.from({ length: 9 }, (_w, col: number) => (
                      <Shimmer key={`${row}-${col}`} className="h-4 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
