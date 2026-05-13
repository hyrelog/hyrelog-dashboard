'use client';

import { cn } from '@/lib/utils';
import type { WizardStepId } from '@/lib/onboarding/constants';
import { WIZARD_STEPS_UI } from '@/lib/onboarding/constants';
import { Check } from 'lucide-react';

const ORDER: WizardStepId[] = WIZARD_STEPS_UI.map((s) => s.id);

function stepIndex(id: WizardStepId) {
  const i = ORDER.indexOf(id);
  return i >= 0 ? i : 0;
}

export function OnboardingWizardProgress({ currentStep }: { currentStep: WizardStepId }) {
  const cur = stepIndex(currentStep);

  return (
    <nav aria-label="Onboarding progress" className="space-y-1">
      {WIZARD_STEPS_UI.map((s, idx) => {
        const done = idx < cur;
        const active = idx === cur;

        return (
          <div
            key={s.id}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              active && 'bg-accent/80 text-accent-foreground',
              !active && !done && 'text-muted-foreground',
              done && 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                done && 'border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400',
                active && !done && 'border-brand-500 text-brand-600 dark:text-brand-400',
                !done && !active && 'border-border'
              )}
              aria-hidden
            >
              {done ? <Check className="h-3 w-3" /> : idx + 1}
            </span>
            <div className="min-w-0">
              <p className={cn('font-medium leading-tight', active && 'text-foreground')}>{s.label}</p>
              {s.helper ? <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{s.helper}</p> : null}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
