'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { createOnboardingApiKeyAction } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKeyStepProps {
  workspaceId: string;
  returnTo?: string;
  existingKeyCount: number;
  /** When set (after creation), shows copy-once UX and continue. */
  revealedKey: string | null;
  /** Called immediately after creation with the plaintext key. */
  onKeyCreated?: (fullKey: string) => void;
  /** Clear the in-memory key so user can create another (plaintext cannot be shown again later). */
  onDiscardRevealedKey?: () => void;
  onContinue?: () => void;
}

export function ApiKeyStep({
  workspaceId,
  returnTo,
  existingKeyCount,
  revealedKey,
  onKeyCreated,
  onDiscardRevealedKey,
  onContinue
}: ApiKeyStepProps) {
  const [name, setName] = useState('Onboarding key');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      const uniq = `${name.trim() || 'Onboarding'} ${crypto.randomUUID().slice(0, 8)}`;
      const res = await createOnboardingApiKeyAction({
        workspaceId,
        name: uniq,
        returnTo
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onKeyCreated?.(res.fullKey);
    } finally {
      setBusy(false);
    }
  }

  if (revealedKey) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="rounded-lg bg-brand-500/10 p-3 text-brand-600 dark:text-brand-400">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Save your workspace API key</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              This is a <span className="font-medium text-foreground">workspace key</span> — use it with{' '}
              <span className="font-medium text-foreground">POST /v1/events</span> to ingest audit events into this
              workspace only. Copy it somewhere safe; HyreLog will not show the full secret again after you leave
              this screen.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reveal-api-key-onb">Workspace ingest key</Label>
          <div className="flex gap-2">
            <Input id="reveal-api-key-onb" readOnly value={revealedKey} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(revealedKey);
                toast.success('Copied API key.');
                setCopied(true);
              }}
              aria-label="Copy API key"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Company-wide API keys (if you use them) are separate and can be created later from company settings; they
          are not what you use here for workspace event ingestion.
        </p>

        {onDiscardRevealedKey ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lost this secret or need a fresh key?{' '}
            <button
              type="button"
              className="font-medium text-brand-600 underline-offset-4 hover:underline"
              onClick={() => onDiscardRevealedKey()}
            >
              Create another workspace key
            </button>
            . You can keep older keys active until you revoke them.
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" className="bg-brand-500 hover:bg-brand-600" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="rounded-lg bg-brand-500/10 p-3 text-brand-600 dark:text-brand-400">
          <KeyRound className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">Create a workspace API key</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            You are creating a <span className="font-medium text-foreground">workspace-scoped</span> key.{' '}
            <span className="font-medium text-foreground">Audit events are ingested with a workspace key</span> — it
            authorises writes into this workspace only. Company-level keys for broader API access can be added later
            from company settings; they are not used for this ingest flow.
            {existingKeyCount > 0 ? (
              <>
                {' '}
                You already have {existingKeyCount} active workspace{' '}
                {existingKeyCount === 1 ? 'key' : 'keys'}. Older keys stay valid; create another if you need a fresh
                secret — the plaintext is only shown once.
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Think of the workspace key as the credential your apps or pipelines use when they call HyreLog to record
          what happened inside <span className="font-medium text-foreground">this</span> workspace. Keep production
          and staging on different keys or workspaces when you are ready.
        </p>
      </div>

      {error ? (
        <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-2 max-w-md">
        <Label htmlFor="key-name-onb">Friendly name</Label>
        <Input id="key-name-onb" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        <p className="text-xs text-muted-foreground">We append a short unique suffix when saving to avoid name clashes.</p>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" className="bg-brand-500 hover:bg-brand-600" onClick={generate} disabled={busy}>
          {busy ? 'Creating…' : 'Create key'}
        </Button>
      </div>
    </div>
  );
}
