'use client';

import { useState } from 'react';

import type { UseCaseValue } from '@/lib/onboarding/constants';
import { USE_CASE_OPTIONS } from '@/lib/onboarding/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UseCaseStepProps {
  initialValue?: string | null;
  onContinue: (value: UseCaseValue) => void;
  pending: boolean;
  error?: string | null;
}

export function UseCaseStep({ initialValue, onContinue, pending, error }: UseCaseStepProps) {
  const [selected, setSelected] = useState<string | undefined>(
    initialValue && USE_CASE_OPTIONS.some((o) => o.value === initialValue) ? initialValue : undefined
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">How will you use HyreLog?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what best matches today — you can integrate more later.
        </p>
      </div>

      {error ? (
        <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      ) : null}

      <div role="radiogroup" aria-label="Use case" className="grid gap-2">
        {USE_CASE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={pending}
              onClick={() => setSelected(opt.value)}
              className={cn(
                'rounded-lg border px-4 py-3 text-left text-sm font-medium ring-offset-background transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'hover:bg-accent/50',
                isSelected ? 'border-brand-500 bg-brand-500/10 text-foreground' : 'border-border text-muted-foreground'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-brand-500 hover:bg-brand-600"
          disabled={!selected || pending}
          onClick={() => selected && onContinue(selected as UseCaseValue)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
