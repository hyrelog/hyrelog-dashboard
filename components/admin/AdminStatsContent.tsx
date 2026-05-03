import type { PlatformAdminStats } from '@/actions/platform-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function StatCard({
  title,
  value,
  hint
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function AdminStatsContent({ stats }: { stats: PlatformAdminStats }) {
  const generated = new Date(stats.generatedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Platform admin · Statistics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate counts and metered usage only — no audit payloads or event bodies.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Generated {generated}</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How this works</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            Event totals are <strong>billing-meter</strong> sums from{' '}
            <code className="text-xs bg-muted px-1 rounded">usage_periods</code> (synced when the API
            ingests events). They match plan metering, not raw row counts inside regional API
            databases.
          </li>
          <li>
            Regional breakdowns use each company&apos;s <strong>preferred data region</strong>,
            not per-request routing.
          </li>
        </ul>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Users (total)" value={fmt(stats.users.total)} />
          <StatCard title="Events ingested (all periods)" value={fmt(stats.usage.eventsIngestedAllPeriods)} />
          <StatCard title="Companies" value={fmt(stats.tenancy.companies)} />
          <StatCard title="Workspaces" value={fmt(stats.tenancy.workspaces)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active" value={fmt(stats.users.active)} />
          <StatCard title="Deactivated / pending" value={fmt(stats.users.deactivated)} />
          <StatCard title="Email verified" value={fmt(stats.users.emailVerified)} />
          <StatCard title="With company membership" value={fmt(stats.users.withCompanyMembership)} />
          <StatCard title="Platform admins" value={fmt(stats.users.platformAdmins)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tenancy &amp; provisioning</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Companies linked to API"
            value={`${fmt(stats.tenancy.companiesLinkedToApi)} / ${fmt(stats.tenancy.companies)}`}
          />
          <StatCard
            title="Workspaces linked to API"
            value={`${fmt(stats.tenancy.workspacesLinkedToApi)} / ${fmt(stats.tenancy.workspaces)}`}
          />
          <StatCard
            title="Projects linked to API"
            value={`${fmt(stats.tenancy.projectsLinkedToApi)} / ${fmt(stats.tenancy.projects)}`}
          />
          <StatCard title="Projects (total)" value={fmt(stats.tenancy.projects)} />
          <StatCard title="Company member rows" value={fmt(stats.tenancy.companyMemberRows)} />
          <StatCard title="Workspace member rows" value={fmt(stats.tenancy.workspaceMemberRows)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Metered usage (dashboard)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Exports created (all periods)"
            value={fmt(stats.usage.exportsCreatedAllPeriods)}
          />
          <StatCard
            title="Usage period rows"
            value={fmt(stats.usage.usagePeriodRowCount)}
            hint="One row per company per billing period with activity."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">By preferred region</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Companies</TableHead>
                  <TableHead className="text-right">Workspaces</TableHead>
                  <TableHead className="text-right">Events (metered)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byRegion.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No companies yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.byRegion.map((r) => (
                    <TableRow key={r.region}>
                      <TableCell className="font-medium">{r.region}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.companies)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.workspaces)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(r.eventsIngestedAllPeriods)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Per company</h2>
            <p className="text-sm text-muted-foreground">
              Sorted by metered events (all billing periods). API identifiers are not shown.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-center">API</TableHead>
                  <TableHead className="text-right">WS</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Exports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No companies yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={c.name}>
                        {c.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[140px] truncate">
                        {c.slug}
                      </TableCell>
                      <TableCell>{c.preferredRegion}</TableCell>
                      <TableCell className="text-center">
                        {c.linkedToApi ? (
                          <Badge variant="default" className="text-xs">
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            —
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(c.workspaceCount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(c.memberCount)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(c.eventsIngestedAllPeriods)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(c.exportsCreatedAllPeriods)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
