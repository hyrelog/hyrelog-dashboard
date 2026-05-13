'use client';

import { useState } from 'react';

import {
  STORAGE_REGION_LABEL,
  REGION_HELP_TEXT,
  HYRELOG_SUPPORT_EMAIL
} from '@/lib/onboarding/constants';
import { DATA_REGION_OPTIONS } from '@/lib/constants/regions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface RegionStepProps {
  /** Current DataRegion enum value(s) backing the workspace/company defaults. */
  initialRegion?: 'US' | 'EU' | 'UK' | 'AU' | null | undefined;
  onContinue: (region: 'US' | 'EU' | 'UK' | 'AU') => void;
  pending: boolean;
  error?: string | null;
}

export function RegionStep({ initialRegion, onContinue, pending, error }: RegionStepProps) {
  const [region, setRegion] = useState<'US' | 'EU' | 'UK' | 'AU'>(
    initialRegion === 'EU' || initialRegion === 'UK' || initialRegion === 'AU' || initialRegion === 'US'
      ? initialRegion
      : 'US'
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{STORAGE_REGION_LABEL}</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{REGION_HELP_TEXT}</p>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            Regions are fixed at setup time for your organisation. If none of the options below are close enough to
            your users or you have a specific locality need,{' '}
            <a
              href={`mailto:${HYRELOG_SUPPORT_EMAIL}?subject=HyreLog%20data%20region`}
              className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              contact us
            </a>{' '}
            and we will see what we can do.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2" role="radiogroup" aria-label="Data region">
        {DATA_REGION_OPTIONS.map((opt) => {
          const val = opt.value as 'US' | 'EU' | 'UK' | 'AU';
          const sel = region === val;
          return (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={sel}
              disabled={pending}
              onClick={() => setRegion(val)}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sel ? 'border-brand-500 bg-brand-500/10' : 'border-border hover:bg-accent/50'
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <p className="font-semibold">{opt.label}</p>
                <p className="text-xs text-muted-foreground">Region code: {val}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-brand-500 hover:bg-brand-600"
          disabled={pending}
          onClick={() => onContinue(region)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
