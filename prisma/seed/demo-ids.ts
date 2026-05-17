/** Must match hyrelog-api/services/api/prisma/demo-ids.ts */

export const DEMO_DASHBOARD_COMPANY_ID = '11111111-1111-4111-8111-111111111101';
export const DEMO_API_COMPANY_ID = '22222222-2222-4222-8222-222222222201';

export const DEMO_WORKSPACES = [
  {
    dashboardId: '11111111-1111-4111-8111-111111111201',
    apiId: '22222222-2222-4222-8222-222222222201',
    slug: 'production',
    name: 'Production',
    preferredRegion: 'US' as const,
  },
  {
    dashboardId: '11111111-1111-4111-8111-111111111202',
    apiId: '22222222-2222-4222-8222-222222222202',
    slug: 'staging',
    name: 'Staging',
    preferredRegion: 'US' as const,
  },
  {
    dashboardId: '11111111-1111-4111-8111-111111111203',
    apiId: '22222222-2222-4222-8222-222222222203',
    slug: 'eu-production',
    name: 'EU Production',
    preferredRegion: 'EU' as const,
  },
  {
    dashboardId: '11111111-1111-4111-8111-111111111204',
    apiId: '22222222-2222-4222-8222-222222222204',
    slug: 'sandbox',
    name: 'Sandbox',
    preferredRegion: 'US' as const,
  },
] as const;

export const DEMO_PROJECTS = [
  {
    dashboardId: '11111111-1111-4111-8111-111111111301',
    workspaceDashboardId: '11111111-1111-4111-8111-111111111201',
    name: 'Core API',
    slug: 'core-api',
    environment: 'PRODUCTION' as const,
  },
  {
    dashboardId: '11111111-1111-4111-8111-111111111302',
    workspaceDashboardId: '11111111-1111-4111-8111-111111111201',
    name: 'Customer Portal',
    slug: 'customer-portal',
    environment: 'PRODUCTION' as const,
  },
  {
    dashboardId: '11111111-1111-4111-8111-111111111303',
    workspaceDashboardId: '11111111-1111-4111-8111-111111111202',
    name: 'Payments Service',
    slug: 'payments',
    environment: 'STAGING' as const,
  },
  {
    dashboardId: '11111111-1111-4111-8111-111111111304',
    workspaceDashboardId: '11111111-1111-4111-8111-111111111203',
    name: 'GDPR Vault',
    slug: 'gdpr-vault',
    environment: 'PRODUCTION' as const,
  },
] as const;

export const DEMO_USERS = {
  admin: {
    id: '33333333-3333-4333-8333-333333333301',
    email: 'demo@northwind.io',
    firstName: 'Alex',
    lastName: 'Morgan',
    role: 'OWNER' as const,
  },
  jordan: {
    id: '33333333-3333-4333-8333-333333333302',
    email: 'jordan.lee@northwind.io',
    firstName: 'Jordan',
    lastName: 'Lee',
    role: 'MEMBER' as const,
  },
  sam: {
    id: '33333333-3333-4333-8333-333333333303',
    email: 'sam.patel@northwind.io',
    firstName: 'Sam',
    lastName: 'Patel',
    role: 'MEMBER' as const,
  },
  riley: {
    id: '33333333-3333-4333-8333-333333333304',
    email: 'riley.chen@northwind.io',
    firstName: 'Riley',
    lastName: 'Chen',
    role: 'BILLING' as const,
  },
  casey: {
    id: '33333333-3333-4333-8333-333333333305',
    email: 'casey.nguyen@northwind.io',
    firstName: 'Casey',
    lastName: 'Nguyen',
    role: 'MEMBER' as const,
  },
} as const;

export const DEMO_LOGIN_EMAIL = DEMO_USERS.admin.email;
export const DEMO_LOGIN_PASSWORD = 'ScreenshotDemo2026!';
