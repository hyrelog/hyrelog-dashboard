'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, PartyPopper } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { HYRELOG_DOCS_BASE_URL } from '@/lib/onboarding/constants';
import { safeReturnTo } from '@/lib/auth/redirects';
import type { OnboardingFirstEventSummary } from '@/types/onboarding';

interface ActivationSuccessStepProps {
  workspaceId: string;
  firstEvent: OnboardingFirstEventSummary | null;
  returnTo?: string;
}

export function ActivationSuccessStep({ workspaceId, firstEvent, returnTo }: ActivationSuccessStepProps) {
  const home = safeReturnTo(returnTo);
  const eventsHref = `/events?workspaceId=${encodeURIComponent(workspaceId)}`;
  const workspaceHref = `/workspaces/${encodeURIComponent(workspaceId)}`;

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="rounded-lg bg-brand-500/10 p-3 text-brand-600 dark:text-brand-400">
          <PartyPopper className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">You&apos;re all set</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            HyreLog is receiving immutable audit events for your workspace. Every ingested record is tamper-evident and
            ready for search, export, and integrations.
          </p>
        </div>
      </div>

      {firstEvent ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First event recorded</p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Action</dt>
              <dd className="font-mono text-xs break-all">{firstEvent.action ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Category</dt>
              <dd className="font-mono text-xs break-all">{firstEvent.category ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Actor</dt>
              <dd className="break-all">{firstEvent.actor ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Resource</dt>
              <dd className="break-all">{firstEvent.resource ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Timestamp</dt>
              <dd className="font-mono text-xs">{firstEvent.timestamp ?? '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="button" size="lg" className="bg-brand-500 hover:bg-brand-600" asChild>
          <Link href={home}>Continue to dashboard</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={eventsHref} className="font-medium text-brand-600 underline-offset-4 hover:underline">
          Event Explorer
        </Link>
        <Link href={workspaceHref} className="font-medium text-brand-600 underline-offset-4 hover:underline">
          Workspace and API keys
        </Link>
        <a
          href={HYRELOG_DOCS_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Documentation
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
      </div>

      <div className="rounded-lg border bg-muted/30 px-4 py-4">
        <p className="text-sm font-medium text-foreground">Suggested next steps</p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              <Link href="/company/invites" className="text-foreground underline-offset-4 hover:underline">
                Invite a teammate
              </Link>{' '}
              so others can review events with the right access.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>Add audit events to important workflows (sign-in, billing, admin actions, data access).</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              <Link href="/webhooks" className="text-foreground underline-offset-4 hover:underline">
                Configure webhooks
              </Link>{' '}
              to react to new audit activity in real time.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              Review{' '}
              <Link href="/exports" className="text-foreground underline-offset-4 hover:underline">
                export jobs
              </Link>{' '}
              and{' '}
              <Link href="/settings/company" className="text-foreground underline-offset-4 hover:underline">
                company settings
              </Link>{' '}
              for retention and compliance needs.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
