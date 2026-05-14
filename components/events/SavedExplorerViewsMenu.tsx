'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bookmark, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SavedExplorerViewSummary } from '@/lib/hyrelog-api';
import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import { explorerPathWithQuery, type EventsExplorerUrlState } from '@/lib/events/explorer-url';
import { deleteSavedExplorerViewAction, runSavedExplorerViewAction } from '@/actions/saved-explorer-views';

type WorkspaceRow = { id: string; name: string; apiWorkspaceId: string | null };

export type SavedExplorerViewsMenuProps = {
  companyRole: CompanyRole;
  currentUserId: string;
  elevatedMutations: boolean;
  views: SavedExplorerViewSummary[];
  workspaces: WorkspaceRow[];
  explorerState: EventsExplorerUrlState;
  disabled?: boolean;
  onOpenSaveDialog: () => void;
  onOpenEditDialog: (view: SavedExplorerViewSummary) => void;
};

function workspaceLabel(view: SavedExplorerViewSummary, workspaces: WorkspaceRow[]): string {
  if (!view.workspaceId) return 'Company-wide';
  const w = workspaces.find((x) => x.apiWorkspaceId === view.workspaceId);
  return w?.name ?? 'Workspace';
}

function canMutateView(
  view: SavedExplorerViewSummary,
  args: { elevatedMutations: boolean; currentUserId: string }
): boolean {
  return args.elevatedMutations || view.createdByUserId === args.currentUserId;
}

export function SavedExplorerViewsMenu({
  companyRole,
  currentUserId,
  elevatedMutations,
  views,
  workspaces,
  explorerState,
  disabled,
  onOpenSaveDialog,
  onOpenEditDialog,
}: SavedExplorerViewsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active = views.find((v) => v.id === explorerState.savedExplorerViewId);

  const runView = (id: string) => {
    startTransition(async () => {
      const res = await runSavedExplorerViewAction(id);
      if (res.ok) {
        router.replace(explorerPathWithQuery(res.explorerState));
        setOpen(false);
        toast.success('View applied');
      } else {
        toast.error(res.error);
      }
    });
  };

  const deleteView = (id: string) => {
    if (!window.confirm('Delete this saved explorer view? This cannot be undone.')) return;
    startTransition(async () => {
      const res = await deleteSavedExplorerViewAction(id);
      if (res.ok) {
        toast.success('View deleted');
        if (explorerState.savedExplorerViewId === id) {
          router.replace(explorerPathWithQuery({ ...explorerState, savedExplorerViewId: '' }));
        } else {
          router.refresh();
        }
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPending}
          className="gap-1"
          aria-label="Saved explorer views menu"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Bookmark className="h-4 w-4" />}
          Saved views
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[min(24rem,70vh)] overflow-y-auto">
        <DropdownMenuLabel>Run a saved view</DropdownMenuLabel>
        {views.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No saved views yet.</div>
        ) : (
          views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              className="cursor-pointer flex flex-col items-start gap-0.5"
              onSelect={(e) => {
                e.preventDefault();
                runView(v.id);
              }}
            >
              <span className="font-medium leading-tight">{v.name}</span>
              <span className="text-xs text-muted-foreground">{workspaceLabel(v, workspaces)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onSelect={() => setTimeout(() => onOpenSaveDialog(), 0)}>
          Save current as new…
        </DropdownMenuItem>
        {active && canMutateView(active, { elevatedMutations, currentUserId }) ? (
          <>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setTimeout(() => onOpenEditDialog(active), 0)}>
              Update "{active.name}"
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                deleteView(active.id);
              }}
            >
              Delete "{active.name}"
            </DropdownMenuItem>
          </>
        ) : null}
        {!isCompanyLevelRole(companyRole) && views.length > 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground border-t mt-1">
            Views follow workspace access. Run loads canonical filters from the server.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
