'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DATA_REGION_OPTIONS } from '@/lib/constants/regions';
import { createWorkspaceAction } from '@/actions/workspaces';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type DataRegion = 'US' | 'EU' | 'UK' | 'AU';

interface CreateWorkspaceSheetProps {
  companyPreferredRegion: DataRegion | null;
}

function CreateWorkspaceForm({
  name,
  setName,
  preferredRegion,
  setPreferredRegion,
  companyPreferredRegion,
  isPending,
  nameError,
  setNameError,
  onSubmit,
  onCancel
}: {
  name: string;
  setName: (v: string) => void;
  preferredRegion: string;
  setPreferredRegion: (v: string) => void;
  companyPreferredRegion: DataRegion | null;
  isPending: boolean;
  nameError: string | null;
  setNameError: (v: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          placeholder="e.g. Production"
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
      <div className="space-y-2">
        <Label htmlFor="workspace-region">Preferred region (optional)</Label>
        <Select
          value={preferredRegion || undefined}
          onValueChange={setPreferredRegion}
          disabled={isPending}
        >
          <SelectTrigger id="workspace-region">
            <SelectValue placeholder="Use company default" />
          </SelectTrigger>
          <SelectContent>
            {DATA_REGION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Defaults to your company region if not set.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create'
          )}
        </Button>
      </div>
    </form>
  );
}

export function CreateWorkspaceSheet({ companyPreferredRegion }: CreateWorkspaceSheetProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [preferredRegion, setPreferredRegion] = useState<string>(companyPreferredRegion ?? '');
  const [nameError, setNameError] = useState<string | null>(null);

  function handleOpenChange(isOpen: boolean) {
    if (!isPending) {
      setOpen(isOpen);
      if (!isOpen) {
        setName('');
        setPreferredRegion(companyPreferredRegion ?? '');
        setNameError(null);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setNameError('Name is too short');
      return;
    }
    if (trimmedName.length > 80) {
      setNameError('Name is too long');
      return;
    }

    startTransition(async () => {
      const result = await createWorkspaceAction({
        name: trimmedName,
        preferredRegion:
          preferredRegion && ['US', 'EU', 'UK', 'AU'].includes(preferredRegion)
            ? (preferredRegion as DataRegion)
            : undefined
      });

      if (result.ok) {
        toast.success('Workspace created');
        setOpen(false);
        router.refresh();
        router.push(`/workspaces/${result.id}`);
      } else {
        setNameError(result.error ?? 'Something went wrong');
        toast.error(result.error);
      }
    });
  }

  const trigger = (
    <Button className="bg-brand-500 hover:bg-brand-600 text-white">
      <Plus className="h-4 w-4 mr-2" />
      Create workspace
    </Button>
  );

  const form = (
    <CreateWorkspaceForm
      name={name}
      setName={setName}
      preferredRegion={preferredRegion}
      setPreferredRegion={setPreferredRegion}
      companyPreferredRegion={companyPreferredRegion}
      isPending={isPending}
      nameError={nameError}
      setNameError={setNameError}
      onSubmit={handleSubmit}
      onCancel={() => handleOpenChange(false)}
    />
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create workspace</SheetTitle>
            <SheetDescription>
              Add a new workspace to your company. You will be added as an admin.
            </SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Add a new workspace to your company. You will be added as an admin.
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
