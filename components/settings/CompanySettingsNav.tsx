'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  FolderKanban,
  KeyRound,
  Webhook,
  CreditCard,
  Gauge,
  Shield,
  Database,
  Plug,
  Bell,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

const companyNavItems = [
  { title: 'Overview', href: '/company-settings/overview', icon: Building2, description: 'Identity and defaults' },
  { title: 'Members & Teams', href: '/company-settings/members', icon: Users, description: 'Roles and access' },
  { title: 'Workspaces', href: '/company-settings/workspaces', icon: FolderKanban, description: 'Portfolio controls' },
  { title: 'API & Keys', href: '/company-settings/api-access', icon: KeyRound, description: 'Access governance' },
  { title: 'Webhooks', href: '/company-settings/webhooks', icon: Webhook, description: 'Delivery endpoints' },
  { title: 'Billing & Plan', href: '/company-settings/billing', icon: CreditCard, description: 'Plan and billing' },
  { title: 'Usage & Limits', href: '/company-settings/usage', icon: Gauge, description: 'Quota visibility' },
  { title: 'Security', href: '/company-settings/security', icon: Shield, description: 'Auth and policies' },
  { title: 'Data & Retention', href: '/company-settings/data-retention', icon: Database, description: 'Residency and lifecycle' },
  { title: 'Integrations', href: '/company-settings/integrations', icon: Plug, description: 'Ecosystem connectivity' },
  { title: 'Notifications', href: '/company-settings/notifications', icon: Bell, description: 'Signal controls' },
  { title: 'Compliance & Legal', href: '/company-settings/compliance', icon: FileCheck2, description: 'Enterprise readiness' },
  { title: 'Danger Zone', href: '/company-settings/danger-zone', icon: AlertTriangle, description: 'High-impact actions' },
];

export function CompanySettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-1">Company Settings</h2>
        <p className="text-xs text-muted-foreground">Manage your organization configuration</p>
      </div>

      {companyNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-start gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer',
              isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

