'use client';

import { useEffect, useState, useTransition } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import type { EventsExplorerUrlState } from '@/lib/events/explorer-url';
import { eventQueryFromExplorerUrlState } from '@/lib/events/event-query';
import { createSavedExplorerViewAction, updateSavedExplorerViewAction } from '@/actions/saved-explorer-views';

type WorkspaceOption = { id: string; name: string };

export type SaveExplorerViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  viewId?: string;
  initialName?: string;
  initialDescription?: string;
  /** Dashboard workspace id, or empty string when company-wide (admins only). */
  initialWorkspaceDashboardId: string;
  workspaces: WorkspaceOption[];
  companyRole: CompanyRole;
  explorerState: EventsExplorerUrlState;
  onSaved?: () => void;
};

export function SaveExplorerViewDialog({
  open,
  onOpenChange,
  mode,
  viewId,
  initialName = '',
  initialDescription = '',
  initialWorkspaceDashboardId,
  workspaces,
  companyRole,
  explorerState,
  onSaved,
}: SaveExplorerViewDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [workspaceScope, setWorkspaceScope] = useState<string>(
    initialWorkspaceDashboardId || (isCompanyLevelRole(companyRole) ? '' : workspaces[0]?.id ?? '')
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription);
    setWorkspaceScope(
      initialWorkspaceDashboardId || (isCompanyLevelRole(companyRole) ? '' : workspaces[0]?.id ?? '')
    );
  }, [open, initialName, initialDescription, initialWorkspaceDashboardId, companyRole, workspaces]);

  const query = eventQueryFromExplorerUrlState(explorerState);

  const onSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }
    if (!isCompanyLevelRole(companyRole) && !workspaceScope) {
      toast.error('Workspace is required');
      return;
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createSavedExplorerViewAction({
          name: trimmed,
          description: description.trim() || undefined,
          workspaceId: isCompanyLevelRole(companyRole) ? workspaceScope || null : workspaceScope,
          query,
        });
        if (res.ok) {
          toast.success('View saved');
          onOpenChange(false);
          onSaved?.();
        } else {
          toast.error(res.error);
        }
      } else {
        if (!viewId) {
          toast.error('Missing view id');
          return;
        }
        const res = await updateSavedExplorerViewAction({
          viewId,
          name: trimmed,
          description: description.trim() || null,
          workspaceId: isCompanyLevelRole(companyRole) ? workspaceScope || null : workspaceScope,
          query,
        });
        if (res.ok) {
          toast.success('View updated');
          onOpenChange(false);
          onSaved?.();
        } else {
          toast.error(res.error);
        }
      }
    });
  };

  const title = mode === 'create' ? 'Save explorer view' : 'Update explorer view';
  const descriptionText =
    mode === 'create'
      ? 'Save the current filters, sort, and pagination as a reusable view. Workspace scope controls who can see it.'
      : 'Update this saved view with the current explorer URL state.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby="save-explorer-view-desc">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="save-explorer-view-desc">{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="saved-view-name">Name</Label>
            <Input
              id="saved-view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoComplete="off"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saved-view-description">Description (optional)</Label>
            <textarea
              id="saved-view-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isPending}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {isCompanyLevelRole(companyRole) ? (
            <div className="space-y-2">
              <Label>Workspace scope</Label>
              <Select
                value={workspaceScope || '__all__'}
                onValueChange={(v) => setWorkspaceScope(v === '__all__' ? '' : v)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full" aria-label="Workspace scope for saved view">
                  <SelectValue placeholder="Company-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All workspaces (company-wide)</SelectItem>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This view is scoped to your workspace:{' '}
              <span className="font-medium text-foreground">
                {workspaces.find((w) => w.id === workspaceScope)?.name ?? workspaceScope}
              </span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {mode === 'create' ? 'Save view' : 'Update view'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
