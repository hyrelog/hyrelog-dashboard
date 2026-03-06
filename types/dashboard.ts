export type CompanyRole = 'OWNER' | 'ADMIN' | 'BILLING' | 'MEMBER';
export type PlatformRole = 'PLATFORM_ADMIN' | null;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string | null;
  companyRole: CompanyRole;
  platformRole?: PlatformRole;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  preferredRegion: string;
  planType: 'TRIAL' | 'ACTIVE' | 'INACTIVE';
  trialDaysRemaining?: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  region: string;
  memberCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  companyId: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  environment: 'production' | 'staging' | 'development';
  workspaceId: string;
}

export interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: CompanyRole;
  status: 'ACTIVE' | 'PENDING';
  joinedAt: string;
}

export interface BillingInfo {
  planName: string;
  nextInvoiceDate?: string;
  amount?: number;
  usage?: {
    eventsIngested: number;
    exportsCreated: number;
    webhooksActive: number;
    periodStart: string;
    periodEnd: string;
  };
}
