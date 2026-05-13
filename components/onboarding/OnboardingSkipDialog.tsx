'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import { skipOnboarding } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface OnboardingSkipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  returnTo?: string;
  onSkipped: (redirectTo: string) => void;
  title?: string;
  description?: string;
}

export function OnboardingSkipDialog({
  open,
  onOpenChange,
  workspaceId,
  returnTo,
  onSkipped,
  title = 'Skip activation for now?',
  description = 'You can send your first audit event later from the dashboard. Please confirm with a short note so we know this was intentional.'
}: OnboardingSkipDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await skipOnboarding({
        workspaceId,
        returnTo,
        skipReason: reason.trim().length >= 3 ? reason.trim() : '__short__'
      });
      if (!res.success) {
        setError(res.message ?? 'Could not skip onboarding.');
        return;
      }
      onOpenChange(false);
      onSkipped(res.redirectTo ?? '/');
    });
  }

  const canSubmit = reason.trim().length >= 3 && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="skip-reason-onboarding">Confirmation note</Label>
          <Textarea
            id="skip-reason-onboarding"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. I will wire up ingestion next sprint."
            disabled={isPending}
            className="resize-none"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={handleConfirm} disabled={!canSubmit}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skipping…
              </>
            ) : (
              'Confirm skip'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
