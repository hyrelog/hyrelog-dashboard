'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_MEASUREMENT_ID } from '@/lib/google-analytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 page_view on client-side navigations. Initial load is covered by
 * {@link GoogleAnalytics} from `@next/third-parties/google` in the root layout.
 */
export function GoogleAnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const isFirst = useRef(true);

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    const path = query ? `${pathname}?${query}` : pathname;

    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    window.gtag('config', GA_MEASUREMENT_ID, { page_path: path });
  }, [pathname, query]);

  return null;
}
