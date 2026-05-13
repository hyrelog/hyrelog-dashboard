'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { provisionOnboardingWorkspaceAction } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';

interface ProvisioningStepProps {
  workspaceId: string;
  hasApiWorkspace: boolean;
  returnTo?: string;
  onProvisioned: () => void;
}

export function ProvisioningStep({
  workspaceId,
  hasApiWorkspace,
  returnTo,
  onProvisioned
}: ProvisioningStepProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setMessage(null);
    setBusy(true);
    try {
      const res = await provisionOnboardingWorkspaceAction(workspaceId, returnTo);
      if (!res.ok) {
        setMessage(res.error ?? 'Provisioning failed.');
        return;
      }
      onProvisioned();
    } finally {
      setBusy(false);
    }
  }

  if (hasApiWorkspace) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-brand-500/30 bg-brand-500/5 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium leading-tight">Workspace linked in HyreLog</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              This step registers your <span className="font-medium text-foreground">workspace</span> with the HyreLog
              API in the region you chose — so audit events and workspace settings line up between the dashboard and
              ingestion. Your company already exists in HyreLog; next you will create a{' '}
              <span className="font-medium text-foreground">workspace API key</span> used to send events into this
              workspace only.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" className="bg-brand-500 hover:bg-brand-600" onClick={onProvisioned}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Provisioning your workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          We connect this dashboard workspace to HyreLog in your chosen region so you can create keys and send audit
          events. Retry if anything went wrong earlier.
        </p>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            Provisioning is <span className="font-medium text-foreground">per workspace</span>: it is the link
            between this workspace here and HyreLog&apos;s API for that same workspace. Audit events are always
            ingested with a <span className="font-medium text-foreground">workspace-scoped</span> key tied to this
            workspace (you will create that key on the next step).
          </p>
          <p>
            Broader <span className="font-medium text-foreground">company-level</span> API keys (for organisation-wide
            operations) can be created later from company settings when you need them — they are not used for the
            workspace event ingest path you are setting up now.
          </p>
        </div>
      </div>

      {message ? (
        <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
          {message}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={retry} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Provisioning…
            </>
          ) : (
            'Provision now'
          )}
        </Button>
      </div>
    </div>
  );
}
