'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Mail,
  CreditCard,
  Settings,
  User,
  HelpCircle,
  Globe,
  BookOpen,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { CompanyRole, Company } from '@/types/dashboard';

interface AppSidebarProps {
  companyRole: CompanyRole;
  company: Company;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: CompanyRole[];
  /** Custom active state; when not set, pathname === href */
  isActive?: (pathname: string) => boolean;
}

const navSections: {
  title: string;
  items: NavItem[];
}[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard
      },
      {
        title: 'Events',
        href: '/events',
        icon: Activity
      }
    ]
  },
  {
    title: 'Workspaces',
    items: [
      {
        title: 'Workspaces',
        href: '/workspaces',
        icon: FolderKanban
      },
      {
        title: 'Exports',
        href: '/exports',
        icon: BookOpen
      },
      {
        title: 'Webhooks',
        href: '/webhooks',
        icon: Activity
      }
    ]
  },
  {
    title: 'Company',
    items: [
      {
        title: 'Members',
        href: '/company/members',
        icon: Users
      },
      {
        title: 'Invites',
        href: '/company/invites',
        icon: Mail,
        roles: ['OWNER', 'ADMIN', 'BILLING']
      }
    ]
  },
  {
    title: 'Billing',
    items: [
      {
        title: 'Subscription',
        href: '/billing/subscription',
        icon: CreditCard,
        roles: ['OWNER', 'ADMIN', 'BILLING']
      }
    ]
  },
  {
    title: 'Settings',
    items: [
      {
        title: 'Personal settings',
        href: '/settings',
        icon: User,
        isActive: (path) =>
          path.startsWith('/settings') && !path.startsWith('/settings/company')
      },
      {
        title: 'Company Settings',
        href: '/settings/company',
        icon: Settings,
        roles: ['OWNER', 'ADMIN']
      }
    ]
  },
  {
    title: 'Developer',
    items: [
      {
        title: 'API Reference',
        href: '/reference',
        icon: BookOpen
      }
    ]
  }
];

export function AppSidebar({ companyRole, company }: AppSidebarProps) {
  const pathname = usePathname();

  const hasAccess = (roles?: CompanyRole[]) => {
    if (!roles) return true;
    return roles.includes(companyRole);
  };

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen">
      <div className="px-6 py-5 ">
        <Link
          href="/"
          className="block"
        >
          <Image
            src="/images/logoLight.png"
            alt="HyreLog"
            width={180}
            height={40}
            className="dark:hidden"
            priority
          />
          <Image
            src="/images/logoDark.png"
            alt="HyreLog"
            width={180}
            height={40}
            className="hidden dark:block"
            priority
          />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => hasAccess(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div
              key={section.title}
              className="mb-6"
            >
              <div className="px-4 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </h3>
              </div>
              <nav className="space-y-1 px-2">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.isActive
                    ? item.isActive(pathname)
                    : pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                        isActive
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={company.planType === 'TRIAL' ? 'secondary' : 'default'}
            className="text-xs"
          >
            {company.planType === 'TRIAL'
              ? `Trial (${company.trialDaysRemaining}d)`
              : company.planType}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span>{company.preferredRegion}</span>
        </div>

        <Link
          href="/help"
          className="flex items-center gap-2 text-xs text-brand-500 hover:text-brand-600 transition-colors cursor-pointer"
        >
          <HelpCircle className="h-3 w-3" />
          <span>Need help?</span>
        </Link>
      </div>
    </aside>
  );
}
