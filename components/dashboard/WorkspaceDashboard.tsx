'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from './EmptyState';
import { Plus, FolderKanban, Users, Globe, Activity, CreditCard } from 'lucide-react';
import type { Workspace, Project, Member, BillingInfo } from '@/types/dashboard';
import Link from 'next/link';

interface WorkspaceDashboardProps {
  workspace: Workspace;
  projects: Project[];
  members: Member[];
  billingInfo?: BillingInfo;
}

export function WorkspaceDashboard({ workspace, projects, members, billingInfo }: WorkspaceDashboardProps) {
  const formatLimit = (value: number | null | undefined) =>
    value == null ? 'Unlimited' : value.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Workspace dashboard</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create project
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/10 rounded-lg">
                <Users className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold text-foreground">{workspace.memberCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/10 rounded-lg">
                <Globe className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="text-lg font-semibold text-foreground">{workspace.region}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={workspace.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {workspace.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {billingInfo && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing snapshot
            </CardTitle>
            <CardDescription>High-level plan and usage for the current period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Plan: <strong>{billingInfo.planName}</strong>
              {billingInfo.nextInvoiceDate ? ` · Next billing: ${billingInfo.nextInvoiceDate}` : ''}
            </p>
            {billingInfo.usage && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="text-xs">Usage this month</p>
                <p>
                  Events:{' '}
                  <strong className="text-foreground">
                    {billingInfo.usage.eventsIngested.toLocaleString()} / {formatLimit(billingInfo.limits?.eventsIngested)}
                  </strong>
                </p>
                <p>
                  Exports:{' '}
                  <strong className="text-foreground">
                    {billingInfo.usage.exportsCreated.toLocaleString()} / {formatLimit(billingInfo.limits?.exportsCreated)}
                  </strong>
                </p>
                <p>
                  Webhooks:{' '}
                  <strong className="text-foreground">
                    {billingInfo.usage.webhooksActive.toLocaleString()} / {formatLimit(billingInfo.limits?.webhooksActive)}
                  </strong>
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full bg-transparent"
              asChild
            >
              <Link href="/billing/subscription">Manage subscription</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects Card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Projects</CardTitle>
              <CardDescription>Projects help organize your environments</CardDescription>
            </div>
            {projects.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
              >
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Projects are optional — they help organize your apps or environments. You can start logging events without creating projects."
              actionLabel="Create project"
              onAction={() => console.log('Create project')}
            />
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-500/10 rounded">
                      <FolderKanban className="h-4 w-4 text-brand-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {project.environment}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                    >
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>People with access to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''} in this
              workspace
            </p>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
            >
              View all members
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
