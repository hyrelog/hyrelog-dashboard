import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} style={style} />;
}

function ChartSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="flex items-end justify-between gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Shimmer key={i} className={cn('w-full rounded-sm', tall ? 'h-24' : 'h-16')} style={{ maxWidth: '12%' }} />
        ))}
      </div>
      <Shimmer className="h-3 w-full max-w-md" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        <div className="space-y-3">
          <Shimmer className="h-9 w-2/3 max-w-md" />
          <Shimmer className="h-4 w-1/2 max-w-sm" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Shimmer className="h-9 w-24 rounded-lg" />
            <Shimmer className="h-9 w-24 rounded-lg" />
            <Shimmer className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-border/60">
              <CardHeader className="space-y-3 pb-2">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-9 w-20" />
                <Shimmer className="h-3 w-full max-w-40" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 sm:p-5">
          <div className="mb-4 space-y-2">
            <Shimmer className="h-4 w-48" />
            <Shimmer className="h-3 w-full max-w-xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl border-border/60 bg-card/60">
                <CardHeader className="space-y-2 pb-2">
                  <Shimmer className="h-3 w-24" />
                  <Shimmer className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Shimmer className="h-3 w-5/6" />
                  <Shimmer className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="rounded-2xl border-border/60 xl:col-span-2">
            <CardHeader className="space-y-2">
              <Shimmer className="h-5 w-40" />
              <Shimmer className="h-3 w-full max-w-lg" />
              <div className="flex flex-wrap gap-2 pt-2">
                <Shimmer className="h-8 w-14 rounded-md" />
                <Shimmer className="h-8 w-14 rounded-md" />
                <Shimmer className="h-8 w-14 rounded-md" />
                <Shimmer className="h-8 w-14 rounded-md" />
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-wrap items-end gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                    <Shimmer className="h-16 w-full max-w-14 rounded-md" />
                    <Shimmer className="h-2 w-8" />
                  </div>
                ))}
              </div>
              <ChartSkeleton tall />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/60">
              <CardHeader className="space-y-2">
                <Shimmer className="h-5 w-36" />
                <Shimmer className="h-3 w-full max-w-xs" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Shimmer className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Shimmer className="h-3 w-full" />
                      <Shimmer className="h-3 w-4/5" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60">
              <CardHeader>
                <Shimmer className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Shimmer className="h-24 w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
