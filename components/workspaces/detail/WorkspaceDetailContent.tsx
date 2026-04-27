'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, FolderKanban, Users, Key, Settings, Plus, Lock, HelpCircle, CloudUpload, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getDataRegionLabel } from '@/lib/constants/regions';
import { getWorkspaceStatusLabel } from '@/lib/constants/regions';
import type {
  WorkspaceDetailPayload,
  WorkspaceDetailMember
} from '@/lib/workspaces/workspace-detail-queries';
import { toast } from 'sonner';
import { CreateProjectDialog } from './CreateProjectDialog';
import { EditProjectDialog } from './EditProjectDialog';
import { CreateKeyDialog } from './CreateKeyDialog';
import {
  renameWorkspaceAction,
  archiveWorkspaceAction,
  restoreWorkspaceAction,
  deleteWorkspaceAction,
  renameKeyAction,
  revokeKeyAction,
  deleteProjectAction,
  provisionWorkspaceAction
} from '@/app/(dashboard)/workspaces/[id]/actions';
import { updateWorkspaceRole, removeWorkspaceMember } from '@/actions/members';
import { revokeInvite } from '@/actions/invites';
import { InviteToWorkspaceSheet } from './InviteToWorkspaceSheet';
import { AddWorkspaceMembersSheet } from './AddWorkspaceMembersSheet';

/** Serializable payload (dates as ISO strings) for client. */
export type WorkspaceDetailKeySerialized = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type WorkspaceInviteRowSerialized = {
  id: string;
  email: string;
  status: string;
  workspaceRole: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  invitedBy: { firstName: string; lastName: string };
};

export type WorkspaceDetailContentPayload = {
  workspace: Omit<WorkspaceDetailPayload['workspace'], 'createdAt'> & { createdAt: string };
  companyId: string;
  effectiveRegion: string;
  projects: Array<
    Omit<WorkspaceDetailPayload['projects'][number], 'createdAt'> & { createdAt: string }
  >;
  members: WorkspaceDetailPayload['members'];
  keys: WorkspaceDetailKeySerialized[];
  isCompanyOwnerAdmin: boolean;
  isCompanyBilling: boolean;
  effectiveRole: string;
  canWrite: boolean;
  canAdmin: boolean;
  regionLocked: boolean;
  isArchived: boolean;
  currentUserId: string;
  workspaceInvites?: WorkspaceInviteRowSerialized[];
};

const TABS = ['overview', 'projects', 'members', 'keys', 'settings'] as const;
type TabValue = (typeof TABS)[number];

function isValidTab(t: string): t is TabValue {
  return TABS.includes(t as TabValue);
}

function RestoreWorkspaceButton({
  workspaceId,
  workspaceIdOrSlug
}: {
  workspaceId: string;
  workspaceIdOrSlug: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function handleRestore() {
    setPending(true);
    const result = await restoreWorkspaceAction({ workspaceId });
    setPending(false);
    if (result.ok) {
      toast.success('Workspace restored');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={pending}
      className="border-amber-500/50 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 shrink-0"
    >
      {pending ? 'Restoring…' : 'Restore workspace'}
    </Button>
  );
}

function ProvisionWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function handleProvision() {
    setPending(true);
    const result = await provisionWorkspaceAction(workspaceId);
    setPending(false);
    if (result.ok) {
      toast.success('Workspace provisioned');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleProvision}
      disabled={pending}
      className="mt-2 w-full sm:w-auto"
    >
      <CloudUpload className="size-4 mr-1.5" />
      {pending ? 'Provisioning…' : 'Provision workspace'}
    </Button>
  );
}

interface WorkspaceDetailContentProps {
  /** URL segment (uuid or companySlug-workspaceSlug) for building links. */
  workspaceIdOrSlug: string;
  payload: WorkspaceDetailContentPayload;
}

export function WorkspaceDetailContent({
  workspaceIdOrSlug,
  payload
}: WorkspaceDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = isValidTab(searchParams.get('tab') ?? '') ? searchParams.get('tab')! : 'overview';

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/workspaces/${workspaceIdOrSlug}?${params.toString()}`);
  };

  const baseHref = `/workspaces/${workspaceIdOrSlug}`;
  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const {
    workspace,
    effectiveRegion,
    projects,
    members,
    keys,
    canWrite,
    canAdmin,
    regionLocked,
    isArchived,
    workspaceInvites = []
  } = payload;

  const writeDisabled = isArchived;

  const projectsSummary = projects.slice(0, 5);
  const membersSummary = members.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Archived banner */}
      {isArchived && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            This workspace is archived. Changes are disabled.
          </p>
          {canAdmin && (
            <RestoreWorkspaceButton
              workspaceId={workspace.id}
              workspaceIdOrSlug={workspaceIdOrSlug}
            />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{workspace.slug}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-xs">
              <span className="text-muted-foreground">Company ID</span>
              <span className="font-mono text-foreground">{payload.companyId}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="ml-1"
                onClick={() => void copyValue('Company ID', payload.companyId)}
                aria-label="Copy company ID"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-xs">
              <span className="text-muted-foreground">Workspace ID</span>
              <span className="font-mono text-foreground">{workspace.id}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="ml-1"
                onClick={() => void copyValue('Workspace ID', workspace.id)}
                aria-label="Copy workspace ID"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {workspace.company.apiCompanyId && (
              <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-xs">
                <span className="text-muted-foreground">API Company ID</span>
                <span className="font-mono text-foreground">{workspace.company.apiCompanyId}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="ml-1"
                  onClick={() => void copyValue('API Company ID', workspace.company.apiCompanyId)}
                  aria-label="Copy API company ID"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            {workspace.apiWorkspaceId && (
              <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-xs">
                <span className="text-muted-foreground">API Workspace ID</span>
                <span className="font-mono text-foreground">{workspace.apiWorkspaceId}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="ml-1"
                  onClick={() => void copyValue('API Workspace ID', workspace.apiWorkspaceId)}
                  aria-label="Copy API workspace ID"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">{getDataRegionLabel(effectiveRegion)}</Badge>
            <Badge variant={workspace.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {getWorkspaceStatusLabel(workspace.status)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canWrite && !writeDisabled && (
            <CreateProjectDialog
              workspaceId={payload.workspace.id}
              workspaceIdOrSlug={workspaceIdOrSlug}
              className="shrink-0"
            />
          )}
          {canWrite && writeDisabled && (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Restore workspace to create projects"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create project
            </Button>
          )}
          {canAdmin && (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link href={`${baseHref}?tab=members`}>
                  <Users className="h-4 w-4 mr-1.5" />
                  Manage members
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link href={`${baseHref}?tab=settings`}>
                  <Settings className="h-4 w-4 mr-1.5" />
                  Settings
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Health strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground font-medium">Last event received</p>
            <p className="text-lg font-semibold mt-1">—</p>
            <p className="text-xs text-muted-foreground mt-0.5">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground font-medium">Events last 24h</p>
            <p className="text-lg font-semibold mt-1">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground font-medium">Rejected events</p>
            <p className="text-lg font-semibold mt-1">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground font-medium">Provisioning status</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="What do provisioning statuses mean?"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 text-sm" align="start">
                  <p className="font-medium text-foreground mb-2">Provisioning statuses</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Not provisioned</strong> — This workspace has not yet been synced to the HyreLog API. It is provisioned automatically when the workspace is created (if the API is configured). Until then, you cannot create API keys or send events.
                    </li>
                    <li>
                      <strong className="text-foreground">Active</strong> — This workspace is provisioned in the HyreLog API and can receive events and use API keys.
                    </li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-lg font-semibold mt-1">
              {workspace.apiWorkspaceId ? 'Active' : 'Not provisioned'}
            </p>
            {!workspace.apiWorkspaceId && canAdmin && (
              <ProvisionWorkspaceButton workspaceId={workspace.id} />
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Connect your first source to see activity.
      </p>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="space-y-4"
      >
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger
            value="overview"
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="gap-1.5"
          >
            <FolderKanban className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger
            value="keys"
            className="gap-1.5"
          >
            <Key className="h-4 w-4" />
            Keys
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-1.5"
          >
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="space-y-6 mt-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Workspace details</CardTitle>
                {canAdmin && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link href={`${baseHref}?tab=settings`}>Edit</Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span> {workspace.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Slug:</span> {workspace.slug}
                </p>
                <p>
                  <span className="text-muted-foreground">Region:</span>{' '}
                  {getDataRegionLabel(effectiveRegion)}
                </p>
                <p>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  {new Date(workspace.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Projects</CardTitle>
                {canWrite && !writeDisabled && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                  >
                    <Link href={`${baseHref}?tab=projects`}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create
                    </Link>
                  </Button>
                )}
                {canWrite && writeDisabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Restore workspace to create projects"
                  >
                    Create
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Projects are optional. Create one when you need to group sources.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-2 text-sm">
                      {projectsSummary.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                    {projects.length > 5 && (
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="mt-2 px-0"
                      >
                        <Link href={`${baseHref}?tab=projects`}>View all</Link>
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Members</CardTitle>
                {canAdmin && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                  >
                    <Link href={`${baseHref}?tab=members`}>Manage members</Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {workspace._count.members} member{workspace._count.members !== 1 ? 's' : ''}
                </p>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members listed.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {membersSummary.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <span>
                          {m.user.firstName} {m.user.lastName}
                        </span>
                        <span className="text-muted-foreground">{m.user.email}</span>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {m.role}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="projects"
          className="mt-4"
        >
          <WorkspaceProjectsTab
            baseHref={baseHref}
            workspaceId={payload.workspace.id}
            workspaceIdOrSlug={workspaceIdOrSlug}
            projects={projects}
            canWrite={canWrite}
            canAdmin={canAdmin}
            writeDisabled={writeDisabled}
          />
        </TabsContent>

        <TabsContent
          value="members"
          className="mt-4"
        >
          <WorkspaceMembersTab
            workspaceId={payload.workspace.id}
            companyId={payload.companyId}
            members={members}
            invites={workspaceInvites}
            canAdmin={canAdmin}
            writeDisabled={writeDisabled}
            currentUserId={payload.currentUserId}
          />
        </TabsContent>

        <TabsContent
          value="keys"
          className="mt-4"
        >
          <WorkspaceKeysTab
            workspaceId={payload.workspace.id}
            workspaceIdOrSlug={workspaceIdOrSlug}
            keys={keys}
            canWrite={canWrite}
            isArchived={isArchived}
          />
        </TabsContent>

        <TabsContent
          value="settings"
          className="mt-4"
        >
          <WorkspaceSettingsTab
            workspaceIdOrSlug={workspaceIdOrSlug}
            workspace={workspace}
            effectiveRegion={effectiveRegion}
            canAdmin={canAdmin}
            regionLocked={regionLocked}
            isArchived={isArchived}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkspaceProjectsTab({
  baseHref,
  workspaceId,
  workspaceIdOrSlug,
  projects,
  canWrite,
  canAdmin,
  writeDisabled
}: {
  baseHref: string;
  workspaceId: string;
  workspaceIdOrSlug: string;
  projects: WorkspaceDetailContentPayload['projects'];
  canWrite: boolean;
  canAdmin: boolean;
  writeDisabled: boolean;
}) {
  const router = useRouter();
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const editProject = editProjectId ? projects.find((p) => p.id === editProjectId) : null;

  async function handleDeleteProject(projectId: string) {
    setDeletePending(true);
    const result = await deleteProjectAction({ projectId });
    setDeletePending(false);
    if (result.ok) {
      toast.success('Project archived');
      setDeleteProjectId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && !writeDisabled && (
        <div>
          <CreateProjectDialog
            workspaceId={workspaceId}
            workspaceIdOrSlug={workspaceIdOrSlug}
          />
        </div>
      )}
      {writeDisabled && canWrite && (
        <p className="text-sm text-muted-foreground">
          This workspace is archived. Restore it to create or edit projects.
        </p>
      )}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No projects yet.</p>
            <p className="text-sm mt-1">Projects are optional. Create one to get started.</p>
            {canWrite && !writeDisabled && (
              <CreateProjectDialog
                workspaceId={workspaceId}
                workspaceIdOrSlug={workspaceIdOrSlug}
                className="mt-4"
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.slug} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canWrite && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditProjectId(p.id)}
                        disabled={writeDisabled}
                        title={writeDisabled ? 'Restore workspace to edit projects' : undefined}
                      >
                        Edit
                      </Button>
                    )}
                    {canAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteProjectId(p.id)}
                        disabled={writeDisabled}
                        title={writeDisabled ? 'Restore workspace to archive projects' : undefined}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {editProject && (
        <EditProjectDialog
          projectId={editProject.id}
          workspaceId={workspaceId}
          currentName={editProject.name}
          open={!!editProjectId}
          onOpenChange={(open) => !open && setEditProjectId(null)}
        />
      )}
      {deleteProjectId &&
        (() => {
          const p = projects.find((x) => x.id === deleteProjectId);
          if (!p) return null;
          return (
            <Dialog
              open
              onOpenChange={(open) => !open && setDeleteProjectId(null)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive project?</DialogTitle>
                  <DialogDescription>
                    This will archive &quot;{p.name}&quot;. You can restore it later from the
                    database if needed.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteProjectId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteProject(p.id)}
                    disabled={deletePending}
                  >
                    Archive
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}
    </div>
  );
}

function WorkspaceMembersTab({
  workspaceId,
  companyId,
  members,
  invites,
  canAdmin,
  writeDisabled,
  currentUserId
}: {
  workspaceId: string;
  companyId: string;
  members: WorkspaceDetailMember[];
  invites: WorkspaceInviteRowSerialized[];
  canAdmin: boolean;
  writeDisabled: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isPendingRevoke, startTransition] = useTransition();

  const editMember = editMemberId ? members.find((m) => m.id === editMemberId) : null;
  const removeMember = removeMemberId ? members.find((m) => m.id === removeMemberId) : null;
  const revokeInv = revokeId ? invites.find((i) => i.id === revokeId) : null;

  function handleRevoke(inviteId: string) {
    startTransition(async () => {
      const result = await revokeInvite({ inviteId });
      if (result.ok) {
        toast.success('Invite revoked');
        setRevokeId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const pendingInvites = invites.filter((i) => i.status === 'PENDING' && !i.revokedAt);

  async function handleRoleChange(memberId: string, role: 'READER' | 'WRITER' | 'ADMIN') {
    setPending(true);
    const result = await updateWorkspaceRole({ workspaceMemberId: memberId, role });
    setPending(false);
    if (result.ok) {
      toast.success('Role updated');
      setEditMemberId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemove(memberId: string) {
    setPending(true);
    const result = await removeWorkspaceMember({ workspaceMemberId: memberId });
    setPending(false);
    if (result.ok) {
      toast.success('Member removed');
      setRemoveMemberId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''}
          {invites.length > 0 && (
            <> · {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}</>
          )}
        </p>
        {canAdmin && !writeDisabled && (
          <div className="flex flex-wrap gap-2">
            <AddWorkspaceMembersSheet
              workspaceId={workspaceId}
              companyId={companyId}
            />
            <InviteToWorkspaceSheet workspaceId={workspaceId} />
          </div>
        )}
        {canAdmin && writeDisabled && (
          <Button variant="outline" size="sm" disabled title="Restore workspace to invite">
            Invite to workspace
          </Button>
        )}
      </div>
      {writeDisabled && canAdmin && (
        <p className="text-sm text-muted-foreground">
          This workspace is archived. Restore it to invite or change roles.
        </p>
      )}
      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No members in this workspace.</p>
              {canAdmin && !writeDisabled && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <AddWorkspaceMembersSheet
                    workspaceId={workspaceId}
                    companyId={companyId}
                    className="mt-0"
                  />
                  <InviteToWorkspaceSheet workspaceId={workspaceId} className="mt-0" />
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {m.user.firstName} {m.user.lastName}
                      {m.user.id === currentUserId && (
                        <span className="text-muted-foreground text-sm ml-2">(you)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {m.companyRole && m.companyRole !== 'MEMBER' && (
                      <Badge variant="outline" className="text-xs">
                        Company: {m.companyRole}
                      </Badge>
                    )}
                    <Badge variant="secondary">{m.role}</Badge>
                    {canAdmin && !writeDisabled && m.user.id !== currentUserId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMemberId(m.id)}
                        >
                          Edit role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setRemoveMemberId(m.id)}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium">Pending invites</h3>
              <p className="text-sm text-muted-foreground">
                Invites to this workspace (expire after 7 days)
              </p>
            </div>
            <ul className="divide-y divide-border">
              {invites.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{i.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: {i.workspaceRole} · Invited by {i.invitedBy.firstName}{' '}
                      {i.invitedBy.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(i.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={i.status === 'PENDING' && !i.revokedAt ? 'default' : 'secondary'}>
                      {i.revokedAt ? 'Revoked' : i.status}
                    </Badge>
                    {canAdmin && !writeDisabled && i.status === 'PENDING' && !i.revokedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setRevokeId(i.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {editMember && (
        <Dialog open onOpenChange={(open) => !open && setEditMemberId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit workspace role</DialogTitle>
              <DialogDescription>
                Change role for {editMember.user.firstName} {editMember.user.lastName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Select
                defaultValue={editMember.role}
                onValueChange={(value: 'READER' | 'WRITER' | 'ADMIN') =>
                  handleRoleChange(editMember.id, value)
                }
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READER">READER</SelectItem>
                  <SelectItem value="WRITER">WRITER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {removeMember && (
        <Dialog open onOpenChange={(open) => !open && setRemoveMemberId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove from workspace?</DialogTitle>
              <DialogDescription>
                {removeMember.user.firstName} {removeMember.user.lastName} will lose access to this
                workspace. They will still have company access if they are a company member.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setRemoveMemberId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRemove(removeMember.id)}
                disabled={pending}
              >
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {revokeInv && (
        <Dialog open onOpenChange={(open) => !open && setRevokeId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke invite?</DialogTitle>
              <DialogDescription>
                The invite sent to {revokeInv.email} will be cancelled. They won&apos;t be able to
                use the link.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setRevokeId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRevoke(revokeInv.id)}
                disabled={isPendingRevoke}
              >
                Revoke
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function WorkspaceKeysTab({
  workspaceId,
  workspaceIdOrSlug,
  keys,
  canWrite,
  isArchived
}: {
  workspaceId: string;
  workspaceIdOrSlug: string;
  keys: WorkspaceDetailContentPayload['keys'];
  canWrite: boolean;
  isArchived: boolean;
}) {
  return (
    <div className="space-y-4">
      {canWrite && !isArchived && (
        <div>
          <CreateKeyDialog
            workspaceId={workspaceId}
            workspaceIdOrSlug={workspaceIdOrSlug}
          />
        </div>
      )}
      {isArchived && canWrite && (
        <p className="text-sm text-muted-foreground">
          This workspace is archived. Restore it to create or rename keys. You can still revoke
          keys.
        </p>
      )}
      <Card>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No API keys yet.</p>
              <p className="text-sm mt-1">Create a key to authenticate with the API.</p>
              {canWrite && !isArchived && (
                <CreateKeyDialog
                  workspaceId={workspaceId}
                  workspaceIdOrSlug={workspaceIdOrSlug}
                  className="mt-4"
                />
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">hlk_{k.prefix}…</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt
                        ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={k.revokedAt ? 'secondary' : 'default'}>
                      {k.revokedAt ? 'Revoked' : 'Active'}
                    </Badge>
                    {canWrite && !k.revokedAt && (
                      <KeyRowActions
                        keyId={k.id}
                        name={k.name}
                        workspaceId={workspaceId}
                        renameDisabled={isArchived}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KeyRowActions({
  keyId,
  name,
  workspaceId,
  renameDisabled
}: {
  keyId: string;
  name: string;
  workspaceId: string;
  renameDisabled?: boolean;
}) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [isPending, startTransition] = useTransition();

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await renameKeyAction({ keyId, name: renameValue.trim() });
      if (result.ok) {
        setRenameOpen(false);
        router.refresh();
      }
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeKeyAction({ keyId });
      if (result.ok) {
        setRevokeOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRenameOpen(true)}
        disabled={renameDisabled}
        title={renameDisabled ? 'Restore workspace to rename keys' : undefined}
      >
        Rename
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive"
        onClick={() => setRevokeOpen(true)}
      >
        Revoke
      </Button>
      <Dialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename key</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleRename}
            className="space-y-4 mt-4"
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke key?</DialogTitle>
            <DialogDescription>
              This key will stop working immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setRevokeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isPending}
            >
              Revoke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WorkspaceSettingsTab({
  workspaceIdOrSlug,
  workspace,
  effectiveRegion,
  canAdmin,
  regionLocked,
  isArchived
}: {
  workspaceIdOrSlug: string;
  workspace: WorkspaceDetailContentPayload['workspace'];
  effectiveRegion: string;
  canAdmin: boolean;
  regionLocked: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [renameValue, setRenameValue] = useState(workspace.name);
  const [renamePending, setRenamePending] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const canArchive = canAdmin && workspace.status === 'ACTIVE' && !isArchived;

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (trimmed.length < 2 || trimmed.length > 80) return;
    setRenamePending(true);
    const result = await renameWorkspaceAction({ workspaceId: workspace.id, name: trimmed });
    setRenamePending(false);
    if (result.ok) {
      toast.success('Workspace renamed');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleArchive() {
    setArchivePending(true);
    const result = await archiveWorkspaceAction({ workspaceId: workspace.id });
    setArchivePending(false);
    if (result.ok) {
      toast.success('Workspace archived');
      setArchiveOpen(false);
      router.push('/workspaces');
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    if (deleteConfirmSlug !== workspace.slug) {
      toast.error('Slug does not match');
      return;
    }
    setDeletePending(true);
    const result = await deleteWorkspaceAction({
      workspaceId: workspace.id,
      confirmSlug: deleteConfirmSlug
    });
    setDeletePending(false);
    if (result.ok) {
      toast.success('Workspace deleted');
      setDeleteOpen(false);
      router.push('/workspaces');
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleRename}
            className="space-y-2"
          >
            <label className="text-sm font-medium">Workspace name</label>
            <div className="flex gap-2 flex-wrap items-center">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                disabled={!canAdmin || isArchived || renamePending}
                className="max-w-xs"
                minLength={2}
                maxLength={80}
                title={isArchived ? 'Restore workspace to rename' : undefined}
              />
              {canAdmin && !isArchived && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={renamePending || renameValue.trim() === workspace.name}
                >
                  Save
                </Button>
              )}
            </div>
            {isArchived && (
              <p className="text-xs text-muted-foreground">Restore the workspace to rename it.</p>
            )}
          </form>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-1">Preferred region</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              {getDataRegionLabel(effectiveRegion)}
              {regionLocked && <Lock className="h-4 w-4" />}
            </p>
            {regionLocked && (
              <p className="text-xs text-muted-foreground mt-1">
                Region cannot be changed after provisioning.
              </p>
            )}
            {!regionLocked && canAdmin && !isArchived && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled
              >
                Change region (coming soon)
              </Button>
            )}
            {isArchived && canAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Restore the workspace to change region.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canArchive}
              onClick={() => setArchiveOpen(true)}
              title={!canArchive && isArchived ? 'Workspace is already archived' : undefined}
            >
              Archive workspace
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              {isArchived
                ? 'This workspace is archived. Use the Restore button at the top to make it active again.'
                : 'Archiving prevents new activity and hides the workspace from default lists. You can restore it later.'}
            </p>
            <Dialog
              open={archiveOpen}
              onOpenChange={setArchiveOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive workspace?</DialogTitle>
                  <DialogDescription>
                    Archiving prevents new activity and hides it from most lists. You can restore it
                    later.
                    {workspace.apiWorkspaceId && (
                      <span className="block mt-2 text-amber-600 dark:text-amber-500">
                        This workspace is provisioned. Archiving will still hide it from default
                        lists.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setArchiveOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={archivePending}
                  >
                    Archive
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Separator />
          <div>
            <Button
              variant="destructive"
              size="sm"
              disabled={!canAdmin || regionLocked}
              onClick={() => setDeleteOpen(true)}
            >
              Delete workspace
            </Button>
            {regionLocked ? (
              <p className="text-xs text-muted-foreground mt-1">
                Provisioned workspaces can&apos;t be deleted. Contact support.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Permanently remove this workspace. Type the workspace slug to confirm.
              </p>
            )}
            <Dialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete workspace?</DialogTitle>
                  <DialogDescription>
                    This cannot be undone. Type the workspace slug <strong>{workspace.slug}</strong>{' '}
                    to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder={workspace.slug}
                    value={deleteConfirmSlug}
                    onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                    disabled={deletePending}
                    className="font-mono"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deletePending || deleteConfirmSlug !== workspace.slug}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
