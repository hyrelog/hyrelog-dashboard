'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const DASHBOARD_COMPANY_SCOPE_VALUE = '__company__';

export function useDashboardScopeNavigation(isCompanyAdmin: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isScopePending, startScopeTransition] = useTransition();

  const setScope = useCallback(
    (value: string) => {
      startScopeTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (isCompanyAdmin && value === DASHBOARD_COMPANY_SCOPE_VALUE) {
          next.delete('workspace');
        } else {
          next.set('workspace', value);
        }
        const q = next.toString();
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
        router.refresh();
      });
    },
    [isCompanyAdmin, pathname, router, searchParams]
  );

  return { setScope, isScopePending };
}
