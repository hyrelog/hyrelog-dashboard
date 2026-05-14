'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Company, Workspace } from '@/types/dashboard';

const COMPANY_VALUE = '__company__';

type DashboardScopeBarProps = {
  company: Company;
  workspaces: Workspace[];
  isCompanyAdmin: boolean;
  /** Resolved server-side: Prisma workspace id or undefined for company overview (admins only). */
  workspaceFocusId?: string | null;
  planLabel?: string;
};

export function DashboardScopeBar({
  company,
  workspaces,
  isCompanyAdmin,
  workspaceFocusId,
  planLabel,
}: DashboardScopeBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sorted = useMemo(
    () => [...workspaces].sort((a, b) => a.name.localeCompare(b.name)),
    [workspaces]
  );

  const selectValue = useMemo(() => {
    if (isCompanyAdmin) {
      return workspaceFocusId ?? COMPANY_VALUE;
    }
    return workspaceFocusId ?? sorted[0]?.id ?? '';
  }, [isCompanyAdmin, workspaceFocusId, sorted]);

  const onScopeChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (isCompanyAdmin && value === COMPANY_VALUE) {
        next.delete('workspace');
      } else {
        next.set('workspace', value);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      router.refresh();
    },
    [isCompanyAdmin, pathname, router, searchParams]
  );

  const activeWorkspace = workspaceFocusId ? sorted.find((w) => w.id === workspaceFocusId) : undefined;
  const title = isCompanyAdmin && !workspaceFocusId ? company.name : activeWorkspace?.name ?? company.name;
  const subtitle = isCompanyAdmin && !workspaceFocusId
    ? 'Company overview · switch scope to drill into a workspace'
    : activeWorkspace
      ? `Workspace · ${company.name}`
      : 'Dashboard';

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8 dark:bg-card/80">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            {isCompanyAdmin && !workspaceFocusId ? (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Company scope
              </>
            ) : (
              <>
                <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Workspace scope
              </>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
            {planLabel ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Plan · {planLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="w-full max-w-md shrink-0 space-y-2 lg:w-80">
          <label htmlFor="dashboard-scope" className="text-xs font-medium text-muted-foreground">
            View as
          </label>
          <Select value={selectValue} onValueChange={onScopeChange}>
            <SelectTrigger id="dashboard-scope" className="h-11 w-full">
              <SelectValue placeholder="Choose scope" />
            </SelectTrigger>
            <SelectContent position="popper">
              {isCompanyAdmin ? (
                <SelectItem value={COMPANY_VALUE}>
                  <span className="font-medium">{company.name}</span>
                  <span className="block text-xs text-muted-foreground">Full company metrics</span>
                </SelectItem>
              ) : null}
              {sorted.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="font-medium">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {w.region} · {w.memberCount} members
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
