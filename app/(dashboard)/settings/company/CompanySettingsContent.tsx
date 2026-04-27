'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { updateCompanyAction } from '@/actions/company';
import {
  createCompanyApiKeyAction,
  revokeCompanyApiKeyAction,
  updateCompanyApiKeyAllowlistAction
} from '@/actions/companyApiKeys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CompanySettingsSection =
  | 'overview'
  | 'members'
  | 'workspaces'
  | 'api-access'
  | 'webhooks'
  | 'billing'
  | 'usage'
  | 'security'
  | 'data-retention'
  | 'integrations'
  | 'notifications'
  | 'compliance'
  | 'danger-zone';

type Company = {
  id: string;
  name: string;
  slug: string;
  preferredRegion: string;
  status: string;
  apiCompanyId: string | null;
  createdVia: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    members: number;
    workspaces: number;
  };
};

type Member = {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'BILLING' | 'MEMBER';
  user: {
    id: string;
    name: string | null;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    sessions: Array<{ updatedAt: Date }>;
  };
};

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  preferredRegion: string | null;
  apiWorkspaceId: string | null;
  createdAt: Date;
  _count: {
    members: number;
  };
};

type SubscriptionSummary = {
  status: string;
  interval: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  plan: {
    code: string;
    name: string;
  };
} | null;

type UsageSummary = {
  periodStart: Date;
  periodEnd: Date;
  eventsIngested: number;
  exportsCreated: number;
  webhooksActive: number;
};

type CompanyApiKeySummary = {
  id: string;
  prefix: string;
  name: string;
  labels: string[];
  status: string;
  ipAllowlist: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC'
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC'
});

const SECTION_LABELS: Record<CompanySettingsSection, string> = {
  overview: 'Overview',
  members: 'Members & Teams',
  workspaces: 'Workspaces',
  'api-access': 'API & Keys',
  webhooks: 'Webhooks',
  billing: 'Billing & Plan',
  usage: 'Usage & Limits',
  security: 'Security',
  'data-retention': 'Data & Retention',
  integrations: 'Integrations',
  notifications: 'Notifications',
  compliance: 'Compliance & Legal',
  'danger-zone': 'Danger Zone'
};

const SECTION_TABS: Array<{ key: CompanySettingsSection; href: string }> = [
  { key: 'overview', href: '/company-settings/overview' },
  { key: 'members', href: '/company-settings/members' },
  { key: 'workspaces', href: '/company-settings/workspaces' },
  { key: 'api-access', href: '/company-settings/api-access' },
  { key: 'webhooks', href: '/company-settings/webhooks' },
  { key: 'billing', href: '/company-settings/billing' },
  { key: 'usage', href: '/company-settings/usage' },
  { key: 'security', href: '/company-settings/security' },
  { key: 'data-retention', href: '/company-settings/data-retention' },
  { key: 'integrations', href: '/company-settings/integrations' },
  { key: 'notifications', href: '/company-settings/notifications' },
  { key: 'compliance', href: '/company-settings/compliance' },
  { key: 'danger-zone', href: '/company-settings/danger-zone' }
];

export function CompanySettingsContent({
  section,
  company,
  members,
  workspaces,
  companyApiKeys,
  subscription,
  currentUsage,
  fallbackPrimaryEmail,
  canEdit
}: {
  section: CompanySettingsSection;
  company: Company;
  members: Member[];
  workspaces: WorkspaceSummary[];
  companyApiKeys: CompanyApiKeySummary[];
  subscription: SubscriptionSummary;
  currentUsage: UsageSummary | null;
  fallbackPrimaryEmail: string | null;
  canEdit: boolean;
}) {
  const [name, setName] = useState(company.name);
  const [slug, setSlug] = useState(company.slug);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('');
  const [newlyCreatedFullKey, setNewlyCreatedFullKey] = useState<string | null>(null);
  const [allowlistInputs, setAllowlistInputs] = useState<Record<string, string>>(
    Object.fromEntries(companyApiKeys.map((key) => [key.id, (key.ipAllowlist ?? []).join(', ')]))
  );
  const [loading, setLoading] = useState(false);
  const [apiKeyLoading, startApiKeyTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [apiKeyMessage, setApiKeyMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'dashboard' | 'api' | null>(null);
  const router = useRouter();

  const primaryOwner =
    members.find((m) => m.role === 'OWNER') ??
    members.find((m) => m.role === 'ADMIN') ??
    members[0];
  const primaryContactEmail = primaryOwner?.user.email ?? fallbackPrimaryEmail ?? 'Not set';

  const memberRoleCounts = members.reduce(
    (acc, m) => {
      acc[m.role] += 1;
      return acc;
    },
    { OWNER: 0, ADMIN: 0, BILLING: 0, MEMBER: 0 }
  );

  const fmtDate = (d: Date | string | null | undefined) =>
    d ? `${DATE_TIME_FORMATTER.format(new Date(d))} UTC` : 'N/A';
  const fmtDateShort = (d: Date | string | null | undefined) =>
    d ? DATE_FORMATTER.format(new Date(d)) : 'N/A';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setMessage(null);
    const result = await updateCompanyAction({ name, slug });
    setLoading(false);
    if (result.ok) setMessage({ type: 'success', text: 'Company settings saved.' });
    else setMessage({ type: 'error', text: result.error });
  };

  const handleCopy = async (field: 'dashboard' | 'api', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 2000);
  };

  const handleCreateCompanyKey = () => {
    if (!canEdit) return;
    startApiKeyTransition(async () => {
      setApiKeyMessage(null);
      setNewlyCreatedFullKey(null);
      const expiresAt = newKeyExpiresAt ? new Date(newKeyExpiresAt).toISOString() : undefined;
      const res = await createCompanyApiKeyAction({
        name: newKeyName,
        ...(expiresAt ? { expiresAt } : {})
      });
      if (!res.ok) {
        setApiKeyMessage({ type: 'error', text: res.error });
        return;
      }
      setNewlyCreatedFullKey(res.key.fullKey);
      setApiKeyMessage({
        type: 'success',
        text: `Created company API key "${res.key.prefix}". Copy it now.`
      });
      setNewKeyName('');
      setNewKeyExpiresAt('');
      router.refresh();
    });
  };

  const handleRevokeCompanyKey = (apiKeyId: string) => {
    if (!canEdit) return;
    startApiKeyTransition(async () => {
      setApiKeyMessage(null);
      const res = await revokeCompanyApiKeyAction(apiKeyId);
      if (!res.ok) {
        setApiKeyMessage({ type: 'error', text: res.error });
        return;
      }
      setApiKeyMessage({ type: 'success', text: 'Company API key revoked.' });
      router.refresh();
    });
  };

  const handleSaveAllowlist = (apiKeyId: string) => {
    if (!canEdit) return;
    startApiKeyTransition(async () => {
      setApiKeyMessage(null);
      const raw = allowlistInputs[apiKeyId] ?? '';
      const ipAllowlist = raw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      const res = await updateCompanyApiKeyAllowlistAction({ apiKeyId, ipAllowlist });
      if (!res.ok) {
        setApiKeyMessage({ type: 'error', text: res.error });
        return;
      }
      setApiKeyMessage({ type: 'success', text: 'Company key IP allowlist updated.' });
      router.refresh();
    });
  };

  const usageWarnings: string[] = [];
  if (currentUsage?.eventsIngested != null) {
    if (currentUsage.eventsIngested >= 900000)
      usageWarnings.push('Event ingestion is above 90% threshold.');
    else if (currentUsage.eventsIngested >= 800000)
      usageWarnings.push('Event ingestion is above 80% threshold.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Company settings</h1>
        <p className="text-muted-foreground">{SECTION_LABELS[section]}</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
          }`}
        >
          {message.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {section === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Overview / general</CardTitle>
            <CardDescription>Core identity and high-level organization defaults.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-slug">Slug</Label>
                <Input
                  id="company-slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                  }
                  disabled={!canEdit}
                  maxLength={60}
                />
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Company ID</p>
                  <p className="font-mono">{company.id}</p>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Primary contact email</p>
                  <p>{primaryContactEmail}</p>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Default region</p>
                  <p className="font-medium">{company.preferredRegion}</p>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Timezone</p>
                  <p>{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
              </div>
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">API company ID</p>
                <p className="font-mono text-sm">{company.apiCompanyId ?? 'Not provisioned yet'}</p>
              </div>
              {canEdit && (
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Saving…' : 'Save changes'}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {section === 'members' && (
        <Card>
          <CardHeader>
            <CardTitle>Members & teams</CardTitle>
            <CardDescription>Company-level users and roles across all workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Members: {company._count.members}</Badge>
              <Badge variant="outline">OWNER {memberRoleCounts.OWNER}</Badge>
              <Badge variant="outline">ADMIN {memberRoleCounts.ADMIN}</Badge>
              <Badge variant="outline">BILLING {memberRoleCounts.BILLING}</Badge>
              <Badge variant="outline">MEMBER {memberRoleCounts.MEMBER}</Badge>
            </div>
            <div className="space-y-2">
              {members.slice(0, 10).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {member.user.name ??
                        `${member.user.firstName} ${member.user.lastName}`.trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="text-right">
                    <p>{member.role}</p>
                    <p className="text-xs text-muted-foreground">
                      Last activity: {fmtDate(member.user.sessions[0]?.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'workspaces' && (
        <Card>
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>Portfolio view for all workspaces in this company.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Workspaces: {company._count.workspaces}</Badge>
              <span className="text-muted-foreground">
                Default region: {company.preferredRegion}
              </span>
            </div>
            <div className="space-y-2">
              {workspaces.slice(0, 10).map((workspace) => (
                <div
                  key={workspace.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{workspace.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {workspace.slug} · Created {fmtDateShort(workspace.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{workspace.preferredRegion ?? company.preferredRegion}</p>
                    <p className="text-xs text-muted-foreground">
                      {workspace.status} · Members {workspace._count.members}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              asChild
              variant="outline"
            >
              <Link href="/workspaces">Manage workspaces</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {section === 'billing' && (
        <Card>
          <CardHeader>
            <CardTitle>Billing & plan</CardTitle>
            <CardDescription>Current subscription and billing lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Current plan</p>
                <p>{subscription?.plan.name ?? 'Free'}</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Status</p>
                <p>{subscription?.status ?? 'TRIALING'}</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Billing cycle</p>
                <p>{subscription?.interval ?? 'N/A'}</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Current period end</p>
                <p>{fmtDate(subscription?.currentPeriodEnd)}</p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
            >
              <Link href="/billing/subscription">Open billing</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {section === 'usage' && (
        <Card>
          <CardHeader>
            <CardTitle>Usage & limits</CardTitle>
            <CardDescription>Usage transparency and threshold warnings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Events</p>
                <p>{currentUsage?.eventsIngested ?? 0}</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Exports</p>
                <p>{currentUsage?.exportsCreated ?? 0}</p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Active webhooks</p>
                <p>{currentUsage?.webhooksActive ?? 0}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Period: {fmtDateShort(currentUsage?.periodStart)} -{' '}
              {fmtDateShort(currentUsage?.periodEnd)}
            </p>
            {usageWarnings.map((warning) => (
              <p
                key={warning}
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700"
              >
                {warning}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {section === 'api-access' && (
        <Card>
          <CardHeader>
            <CardTitle>Company API keys</CardTitle>
            <CardDescription>
              Manage company-scoped keys here. These are not workspace keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiKeyMessage && (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  apiKeyMessage.type === 'error'
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                }`}
              >
                {apiKeyMessage.text}
              </div>
            )}
            {newlyCreatedFullKey && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-sm font-medium text-amber-800">Copy this key now (shown once)</p>
                <p className="mt-1 break-all font-mono text-xs text-amber-900">
                  {newlyCreatedFullKey}
                </p>
              </div>
            )}
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="company-key-name">Key label</Label>
                <Input
                  id="company-key-name"
                  placeholder="e.g. BI Tool"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={!canEdit || apiKeyLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="company-key-expires-at">Expiry (optional)</Label>
                <Input
                  id="company-key-expires-at"
                  type="datetime-local"
                  value={newKeyExpiresAt}
                  onChange={(e) => setNewKeyExpiresAt(e.target.value)}
                  disabled={!canEdit || apiKeyLoading}
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  type="button"
                  onClick={handleCreateCompanyKey}
                  disabled={!canEdit || apiKeyLoading || newKeyName.trim().length < 2}
                >
                  {apiKeyLoading ? 'Creating…' : 'Create company API key'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {companyApiKeys.length === 0 && (
                <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  No company API keys found.
                </p>
              )}
              {companyApiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{key.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{key.prefix}</p>
                    <p className="text-xs text-muted-foreground">
                      Last used: {fmtDate(key.lastUsedAt)} · Expires: {fmtDate(key.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                      {key.status}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || apiKeyLoading || key.status !== 'ACTIVE'}
                      onClick={() => handleRevokeCompanyKey(key.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {['security', 'data-retention', 'integrations', 'notifications', 'compliance'].includes(
        section
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>{SECTION_LABELS[section]}</CardTitle>
            <CardDescription>
              Structured section is ready; detailed controls can be layered in next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              This section now has its own route and menu item, matching the personal settings
              layout pattern.
            </p>
            <p>
              Current controls are available through workspaces, billing, and security pages while
              company-level actions are rolled out.
            </p>
          </CardContent>
        </Card>
      )}

      {section === 'webhooks' && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook key management allowlist</CardTitle>
            <CardDescription>
              Company keys must have an IP allowlist to create/manage webhook endpoints. Enter
              IPv4/IPv6/CIDR values, comma-separated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {companyApiKeys.length === 0 ? (
              <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                No company API keys found. Create one in API & Keys first.
              </p>
            ) : (
              companyApiKeys.map((key) => (
                <div
                  key={key.id}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{key.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {key.prefix}
                      </p>
                    </div>
                    <Badge variant={key.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                      {key.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`allowlist-${key.id}`}>IP allowlist</Label>
                    <Input
                      id={`allowlist-${key.id}`}
                      placeholder="203.0.113.10, 198.51.100.0/24"
                      value={allowlistInputs[key.id] ?? ''}
                      onChange={(e) =>
                        setAllowlistInputs((prev) => ({ ...prev, [key.id]: e.target.value }))
                      }
                      disabled={!canEdit || apiKeyLoading || key.status !== 'ACTIVE'}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveAllowlist(key.id)}
                      disabled={!canEdit || apiKeyLoading || key.status !== 'ACTIVE'}
                    >
                      {apiKeyLoading ? 'Saving…' : 'Save allowlist'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {section === 'danger-zone' && canEdit && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-600">Danger zone</CardTitle>
            <CardDescription>
              High-impact operations with irreversible consequences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              disabled
              className="w-full justify-start text-muted-foreground"
            >
              Transfer ownership (support-gated)
            </Button>
            <Button
              variant="outline"
              disabled
              className="w-full justify-start text-muted-foreground"
            >
              Suspend account (support-gated)
            </Button>
            <Button
              variant="outline"
              disabled
              className="w-full justify-start text-muted-foreground"
            >
              Emergency revoke all API keys (planned)
            </Button>
            <Button
              variant="destructive"
              disabled
              className="w-full justify-start"
            >
              Delete company (contact support)
            </Button>
          </CardContent>
        </Card>
      )}

      {section === 'danger-zone' && !canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Only owners/admins can access high-impact operations.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
