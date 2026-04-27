'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from './EmptyState';
import { Plus, FolderKanban, Users, Mail, CreditCard } from 'lucide-react';
import type { Company, Workspace, Member, BillingInfo } from '@/types/dashboard';

interface CompanyDashboardProps {
  company: Company;
  workspaces: Workspace[];
  members: Member[];
  billingInfo?: BillingInfo;
}

export function CompanyDashboard({
  company,
  workspaces,
  members,
  billingInfo
}: CompanyDashboardProps) {
  const pendingInvites = members.filter((m) => m.status === 'PENDING').length;
  const formatLimit = (value: number | null | undefined) =>
    value == null ? 'Unlimited' : value.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Company dashboard</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-transparent"
          >
            <Mail className="mr-2 h-4 w-4" />
            Invite member
          </Button>
          <Button className="bg-brand-500 hover:bg-brand-600 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create workspace
          </Button>
        </div>
      </div>

      {/* Workspaces Card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Workspaces</CardTitle>
              <CardDescription>Manage your team workspaces and projects</CardDescription>
            </div>
            {workspaces.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
              >
                <Plus className="mr-2 h-4 w-4" />
                New workspace
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No workspaces yet"
              description="Workspaces help you organize your projects by environment or team. Create your first workspace to get started."
              actionLabel="Create workspace"
              onAction={() => console.log('Create workspace')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Monthly usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell className="font-medium">{workspace.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        {workspace.region}
                      </Badge>
                    </TableCell>
                    <TableCell>{workspace.memberCount}</TableCell>
                    <TableCell>
                      {workspace.monthlyEvents == null
                        ? '—'
                        : `${workspace.monthlyEvents.toLocaleString()}${workspace.monthlyEventsCapped ? '+' : ''} events`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={workspace.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {workspace.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Team & Billing Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Summary */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team
            </CardTitle>
            <CardDescription>Manage your company members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total members</p>
              </div>
              {pendingInvites > 0 && (
                <div>
                  <p className="text-2xl font-bold text-brand-500">{pendingInvites}</p>
                  <p className="text-sm text-muted-foreground">Pending invites</p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
            >
              <Mail className="mr-2 h-4 w-4" />
              Invite team member
            </Button>
          </CardContent>
        </Card>

        {/* Billing Info */}
        {billingInfo && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing
              </CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current plan</p>
                <p className="text-lg font-semibold text-foreground">{billingInfo.planName}</p>
              </div>
              {company.planType === 'TRIAL' && company.trialDaysRemaining && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Trial ends in</p>
                  <p className="text-lg font-semibold text-foreground">
                    {company.trialDaysRemaining} days
                  </p>
                </div>
              )}
              {billingInfo.nextInvoiceDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Next invoice</p>
                  <p className="text-lg font-semibold text-foreground">
                    {billingInfo.nextInvoiceDate}
                    {billingInfo.amount != null && ` • $${billingInfo.amount}`}
                  </p>
                </div>
              )}
              {billingInfo.usage && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-1">Usage this month</p>
                  <p className="text-sm text-foreground">
                    Events: {billingInfo.usage.eventsIngested.toLocaleString()} / {formatLimit(billingInfo.limits?.eventsIngested)}
                  </p>
                  <p className="text-sm text-foreground">
                    Exports: {billingInfo.usage.exportsCreated.toLocaleString()} / {formatLimit(billingInfo.limits?.exportsCreated)}
                  </p>
                  <p className="text-sm text-foreground">
                    Webhooks: {billingInfo.usage.webhooksActive.toLocaleString()} / {formatLimit(billingInfo.limits?.webhooksActive)}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <a href="/billing/subscription">Manage subscription</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
