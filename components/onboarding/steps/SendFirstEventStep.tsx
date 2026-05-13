'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { checkOnboardingFirstEventAction, completeOnboardingActivationAction } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HYRELOG_DOCS_BASE_URL } from '@/lib/onboarding/constants';
import type { OnboardingFirstEventSummary } from '@/types/onboarding';
import { buildOnboardingIngestCurl, onboardingIngestPayloadForApi } from '@/lib/onboarding/sample-event';

const FAST_INTERVAL_MS = 3000;
const SLOW_INTERVAL_MS = 9000;
const FAST_POLL_ATTEMPTS = 10;
const FAILURES_BEFORE_WARNING = 5;

interface SendFirstEventStepProps {
  apiKey: string;
  onActivationComplete: (event: OnboardingFirstEventSummary) => void;
  onDeferOpensSkip: () => void;
  /** Return to API key step and clear stored key so a new key can be created. */
  onBackToApiKey: () => void;
}

export function SendFirstEventStep({
  apiKey,
  onActivationComplete,
  onDeferOpensSkip,
  onBackToApiKey,
}: SendFirstEventStepProps) {
  const [tab, setTab] = useState('curl');
  const [pollError, setPollError] = useState<string | null>(null);
  const [manualPending, setManualPending] = useState(false);
  const [detectedEvent, setDetectedEvent] = useState<OnboardingFirstEventSummary | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const stopPollingRef = useRef(false);
  const completionDoneRef = useRef(false);

  const curl = useMemo(() => buildOnboardingIngestCurl(apiKey), [apiKey]);
  const ingestJson = useMemo(() => JSON.stringify(onboardingIngestPayloadForApi(), null, 2), []);

  async function copyCurl() {
    await navigator.clipboard.writeText(curl);
    toast.success('Copied cURL command.');
  }

  async function copyJson() {
    await navigator.clipboard.writeText(ingestJson);
    toast.success('Copied JSON body.');
  }

  const runSingleCheck = useCallback(async () => {
    const res = await checkOnboardingFirstEventAction({});
    if (!res.ok) {
      return { ok: false as const, error: res.error };
    }
    if (res.hasEvent && res.event) {
      return { ok: true as const, event: res.event };
    }
    return { ok: true as const, event: undefined };
  }, []);

  const handleDetected = useCallback((ev: OnboardingFirstEventSummary) => {
    stopPollingRef.current = true;
    setPollError(null);
    setDetectedEvent(ev);
  }, []);

  useEffect(() => {
    stopPollingRef.current = false;
    let cancelled = false;
    let attempt = 0;
    let consecutiveFailures = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const schedule = (delay: number) => {
      clearTimer();
      timeoutId = setTimeout(tick, delay);
    };

    async function tick() {
      if (cancelled || stopPollingRef.current || completionDoneRef.current) {
        return;
      }
      attempt += 1;

      const res = await runSingleCheck();
      if (cancelled || stopPollingRef.current) {
        return;
      }

      if (!res.ok) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= FAILURES_BEFORE_WARNING) {
          setPollError(res.error);
        }
        const delay = attempt <= FAST_POLL_ATTEMPTS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
        schedule(delay);
        return;
      }

      consecutiveFailures = 0;
      setPollError(null);

      if (res.event) {
        handleDetected(res.event);
        return;
      }

      const delay = attempt <= FAST_POLL_ATTEMPTS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
      schedule(delay);
    }

    schedule(FAST_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [handleDetected, runSingleCheck]);

  const manualCheck = useCallback(async () => {
    setManualPending(true);
    setPollError(null);
    try {
      const res = await runSingleCheck();
      if (!res.ok) {
        setPollError(res.error);
        return;
      }
      if (res.event) {
        handleDetected(res.event);
        return;
      }
      toast.message('No event yet', { description: 'HyreLog has not received an event for this workspace.' });
    } finally {
      setManualPending(false);
    }
  }, [handleDetected, runSingleCheck]);

  useEffect(() => {
    if (!detectedEvent || completionDoneRef.current) {
      return;
    }
    let cancelled = false;

    (async () => {
      setCompleting(true);
      setCompleteError(null);
      const res = await completeOnboardingActivationAction({});
      if (cancelled) {
        setCompleting(false);
        return;
      }
      setCompleting(false);
      if (res.ok) {
        if (!completionDoneRef.current && detectedEvent) {
          completionDoneRef.current = true;
          onActivationComplete(detectedEvent);
        }
      } else {
        setCompleteError(res.error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detectedEvent, onActivationComplete]);

  const retryCompletion = useCallback(async () => {
    setCompleteError(null);
    setCompleting(true);
    const res = await completeOnboardingActivationAction({});
    setCompleting(false);
    if (res.ok) {
      if (!completionDoneRef.current && detectedEvent) {
        completionDoneRef.current = true;
        onActivationComplete(detectedEvent);
      }
    } else {
      setCompleteError(res.error);
    }
  }, [detectedEvent, onActivationComplete]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Send your first audit event</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Run the sample request from your machine. When HyreLog receives the first event for this workspace, you&apos;ll
          move to the next step to confirm success and open the dashboard.
        </p>
      </div>

      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Waiting for first event…</CardTitle>
          <CardDescription>
            Polling every few seconds. Keep this tab open while your service sends traffic — or use “Check again” after
            you run cURL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {completeError ? (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
              <p className="font-medium text-destructive">Could not finish activation</p>
              <p className="text-muted-foreground">{completeError}</p>
              <Button type="button" size="sm" variant="outline" onClick={retryCompletion} disabled={completing}>
                Retry activation
              </Button>
            </div>
          ) : detectedEvent ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
              <span>First event detected — finishing activation…</span>
            </div>
          ) : pollError ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-medium">Checks are having trouble</p>
              <p className="mt-1 text-muted-foreground">{pollError}</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
              <span>Listening for ingestion…</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={manualCheck}
              disabled={manualPending || !!detectedEvent}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${manualPending ? 'animate-spin' : ''}`} />
              Check again
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="w-full justify-start gap-4 border-b pb-px">
          <TabsTrigger value="curl">cURL</TabsTrigger>
          <TabsTrigger value="json">JSON body</TabsTrigger>
        </TabsList>
        <TabsContent value="curl" className="pt-4 space-y-3">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyCurl}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <pre className="max-h-[min(55vh,28rem)] overflow-auto rounded-lg border bg-muted/50 p-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">
            {curl}
          </pre>
        </TabsContent>
        <TabsContent value="json" className="pt-4 space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Request body for{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">POST /v1/events</code> using your
              workspace API key. Field names and types match the public ingest API — see the{' '}
              <a
                href={HYRELOG_DOCS_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 underline-offset-4 hover:underline"
              >
                HyreLog documentation
              </a>{' '}
              for the full reference, authentication, and examples.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyJson}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>
          <pre className="max-h-[min(55vh,28rem)] overflow-auto rounded-lg border bg-muted/50 p-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">
            {ingestJson}
          </pre>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
        <div className="flex flex-col gap-1 items-start">
          {!(detectedEvent && !completeError) ? (
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-foreground"
              onClick={onBackToApiKey}
            >
              Back to API key — create a new key
            </Button>
          ) : null}
          <Button type="button" variant="link" className="text-muted-foreground h-auto px-0" onClick={onDeferOpensSkip}>
            I&apos;ll send this later…
          </Button>
        </div>
      </div>
    </div>
  );
}
