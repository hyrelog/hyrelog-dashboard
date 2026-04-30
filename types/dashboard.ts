export type CompanyRole = 'OWNER' | 'ADMIN' | 'BILLING' | 'MEMBER';
export type PlatformRole = 'HYRELOG_ADMIN' | 'HYRELOG_SUPPORT' | null;

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
  apiCompanyId?: string | null;
  planType: 'TRIAL' | 'ACTIVE' | 'INACTIVE';
  trialDaysRemaining?: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  region: string;
  memberCount: number;
  monthlyEvents?: number | null;
  monthlyEventsCapped?: boolean;
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
  limits?: {
    eventsIngested: number | null;
    exportsCreated: number | null;
    webhooksActive: number | null;
  };
  usage?: {
    eventsIngested: number;
    exportsCreated: number;
    webhooksActive: number;
    periodStart: string;
    periodEnd: string;
  };
}
