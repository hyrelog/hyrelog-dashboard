'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Workspace } from '@/types/dashboard';
import { buildWorkspaceEventsUrl, type ExplorerTimeRange } from '@/lib/dashboard/drilldown';

interface WorkspaceDrilldownTableProps {
  companySlug: string;
  workspaces: Workspace[];
  drillRange?: ExplorerTimeRange;
}

export function WorkspaceDrilldownTable({ companySlug, workspaces, drillRange }: WorkspaceDrilldownTableProps) {
  const router = useRouter();
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Workspaces</CardTitle>
          <CardDescription>Open Event Explorer scoped to a workspace.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workspaces yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((w) => {
                const eventsHref =
                  drillRange?.from && drillRange?.to
                    ? buildWorkspaceEventsUrl(w.id, drillRange)
                    : buildWorkspaceEventsUrl(w.id);
                return (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer hover:bg-muted/40"
                    tabIndex={0}
                    aria-label={`Workspace ${w.name}: open settings or events`}
                    onClick={() => router.push(eventsHref)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(eventsHref);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/workspaces/${companySlug}-${w.slug}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {w.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {w.region}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={eventsHref}
                          aria-label={`Open events for ${w.name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Events
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
