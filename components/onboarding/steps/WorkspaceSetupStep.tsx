'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

interface WorkspaceSetupStepProps {
  initialCompanyName: string;
  initialWorkspaceName: string;
  companyIsAutoNamed: boolean;
  onContinue: (data: { companyName: string; workspaceName: string }) => void;
  pending: boolean;
  error?: string | null;
}

export function WorkspaceSetupStep({
  initialCompanyName,
  initialWorkspaceName,
  companyIsAutoNamed,
  onContinue,
  pending,
  error
}: WorkspaceSetupStepProps) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Name your workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These labels show up across the dashboard, exports, and member invites.
        </p>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            A <span className="font-medium text-foreground">workspace</span> is where HyreLog groups your audit
            activity: it has its own members, API keys for ingestion, and settings. Your{' '}
            <span className="font-medium text-foreground">company</span> can hold one or more workspaces so you can
            separate environments or teams (for example production vs internal tools).
          </p>
          <p>
            After you finish onboarding, you can add <span className="font-medium text-foreground">projects</span>{' '}
            inside this workspace to scope events further (for example by app, product line, or environment). Projects
            are optional but useful when you want clearer boundaries without spinning up another workspace.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="onb-company">Company / organisation</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="onb-company"
              className="pl-10"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={pending}
            />
          </div>
          {companyIsAutoNamed ? (
            <p className="text-xs text-muted-foreground">We defaulted this from signup — tweak if needed.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="onb-workspace">Workspace name</Label>
          <p className="text-xs text-muted-foreground leading-snug">
            Pick something your team will recognise; you can rename it later from workspace settings.
          </p>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="onb-workspace"
              className="pl-10"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={pending}
              minLength={2}
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-brand-500 hover:bg-brand-600"
          disabled={workspaceName.trim().length < 2 || pending}
          onClick={() =>
            onContinue({
              companyName: companyName.trim(),
              workspaceName: workspaceName.trim()
            })
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
