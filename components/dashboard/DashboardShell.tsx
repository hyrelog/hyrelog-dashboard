'use client';

import { useState } from 'react';

import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import type { User, Company, Workspace } from '@/types/dashboard';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

interface DashboardShellProps {
  user: User;
  company: Company;
  workspaces: Workspace[];
  isCompanyAdmin: boolean;
  /** Current pathname (e.g. `/workspaces`, `/company`), set by middleware. */
  pathname?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  company,
  workspaces,
  isCompanyAdmin,
  pathname = '',
  children
}: DashboardShellProps) {
  // For workspace users, default to first workspace alphabetically
  const defaultWorkspace = workspaces.sort((a, b) => a.name.localeCompare(b.name))[0];

  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | undefined>(
    isCompanyAdmin ? undefined : defaultWorkspace?.id
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  // Breadcrumb logic
  const breadcrumb = currentWorkspace
    ? [{ label: 'Workspaces', href: '/workspaces' }, { label: currentWorkspace.name }]
    : [];

  // Show workspace switcher for admins or users with multiple workspaces
  const showWorkspaceSwitcher = isCompanyAdmin || workspaces.length > 1;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar
          companyRole={user.companyRole}
          platformRole={user.platformRole}
          company={company}
        />
      </div>

      {/* Mobile sidebar via sheet */}
      <Sheet
        open={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
      >
        <SheetContent
          side="left"
          className="p-0 w-72"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <AppSidebar
            companyRole={user.companyRole}
            platformRole={user.platformRole}
            company={company}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppTopbar
          user={user}
          company={company}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          breadcrumb={breadcrumb}
          showWorkspaceSwitcher={showWorkspaceSwitcher}
          onWorkspaceChange={setCurrentWorkspaceId}
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
