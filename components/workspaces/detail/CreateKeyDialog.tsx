'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { createKeyAction } from '@/app/(dashboard)/workspaces/[id]/actions';

interface CreateKeyDialogProps {
  workspaceId: string;
  workspaceIdOrSlug: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function CreateKeyDialog({
  workspaceId,
  workspaceIdOrSlug,
  trigger,
  className
}: CreateKeyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      if (isPending) return;
      setOpen(false);
      setName('');
      setNameError(null);
      setCreatedSecret(null);
      return;
    }

    if (!isPending) {
      setOpen(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Name is too short');
      return;
    }
    if (trimmed.length > 80) {
      setNameError('Name is too long');
      return;
    }

    startTransition(async () => {
      const result = await createKeyAction({ workspaceId, name: trimmed });
      if (result.ok) {
        setCreatedSecret(result.secret);
        router.refresh();
      } else {
        setNameError(result.error ?? 'Something went wrong');
        toast.error(result.error);
      }
    });
  }

  async function handleCopy() {
    if (!createdSecret) return;
    await navigator.clipboard.writeText(createdSecret);
    toast.success('Copied to clipboard');
  }

  const defaultTrigger = (
    <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white">
      <Key className="h-4 w-4 mr-1.5" />
      Create key
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild className={className}>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{createdSecret ? 'Key created' : 'Create API key'}</DialogTitle>
          <DialogDescription>
            {createdSecret
              ? 'Store this secret now. You won\'t be able to see it again.'
              : 'Add a new API key for this workspace. You will see the secret once.'}
          </DialogDescription>
        </DialogHeader>
        {createdSecret ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-muted p-3 font-mono text-sm break-all">
              {createdSecret}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to clipboard
            </Button>
            <p className="text-xs text-muted-foreground">
              Store this now. You won&apos;t be able to see it again.
            </p>
            <Button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production ingest"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                disabled={isPending}
                className={nameError ? 'border-destructive' : ''}
                autoComplete="off"
              />
              {nameError && (
                <p className="text-sm text-destructive" role="alert">
                  {nameError}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 text-white"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
