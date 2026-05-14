'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveExportTemplateFromJobAction } from '@/actions/exports';

type SaveExportTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceJobId: string;
  defaultName: string;
  onSaved?: () => void;
};

export function SaveExportTemplateDialog({
  open,
  onOpenChange,
  sourceJobId,
  defaultName,
  onSaved,
}: SaveExportTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [pending, startTransition] = useTransition();

  const handleOpen = (next: boolean) => {
    onOpenChange(next);
    if (next) setName(defaultName);
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveExportTemplateFromJobAction({
        sourceJobId,
        name: name.trim() || defaultName,
      });
      if (res.ok) {
        toast.success('Template saved');
        onSaved?.();
        handleOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Stores filter scope, format, and source for this company. No event payloads or secrets are saved — start a new
            streaming job whenever you run the template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="export-template-name">Name</Label>
          <Input
            id="export-template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={128}
            autoComplete="off"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !name.trim()}>
            {pending ? 'Saving…' : 'Save template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
