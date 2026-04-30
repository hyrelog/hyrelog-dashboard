import { PlanStatus, PlanType } from '../../generated/prisma/client';

export const HYRELOG_PLANS = [
  // Dashboard Plan has no isDefault; API Plan keeps isDefault on FREE for catalog only — signup/provision default is BUSINESS in app + API env.
  {
    code: 'FREE',
    name: 'Free',
    planType: PlanType.STANDARD,
    status: PlanStatus.ACTIVE,
    description: 'For evaluation and hobby projects.',
    baseEntitlements: {
      limits: {
        eventsPerMonth: 50_000,
        retentionDays: 7,
        projects: 1,
        workspaces: 1,
        apiKeys: 1,
        seats: 2,
        maxRequestPerSecond: 10
      },
      features: {
        apiAccess: true,
        hashedChainProof: true,
        tamperEvidence: true,
        search: true,
        exports: false,
        webhooks: false,
        alerting: false,
        ssoSaml: false,
        rbacAdvanced: false,
        auditDashboard: true,
        dataResidency: false,
        bringYourOwnKey: false,
        soc2Reports: false,
        uptimeSla: false,
        prioritySupport: false
      },
      data: {
        allowedRegions: ['US'],
        defaultRegion: 'US'
      }
    }
  },
  {
    code: 'STARTER',
    name: 'Starter',
    planType: PlanType.STANDARD,
    status: PlanStatus.ACTIVE,
    description: 'For small teams shipping their first production workloads.',
    baseEntitlements: {
      limits: {
        eventsPerMonth: 500_000,
        retentionDays: 30,
        projects: 3,
        workspaces: 2,
        apiKeys: 3,
        seats: 5,
        maxRequestPerSecond: 25
      },
      features: {
        apiAccess: true,
        hashedChainProof: true,
        tamperEvidence: true,
        search: true,
        exports: true,
        webhooks: true,
        alerting: false,
        ssoSaml: false,
        rbacAdvanced: false,
        auditDashboard: true,
        dataResidency: false,
        bringYourOwnKey: false,
        soc2Reports: false,
        uptimeSla: false,
        prioritySupport: false
      },
      data: {
        allowedRegions: ['US'],
        defaultRegion: 'US'
      }
    }
  },
  {
    code: 'PRO',
    name: 'Pro',
    planType: PlanType.STANDARD,
    status: PlanStatus.ACTIVE,
    description:
      'For scaling SaaS teams needing alerting, higher throughput, and longer retention.',
    baseEntitlements: {
      limits: {
        eventsPerMonth: 5_000_000,
        retentionDays: 90,
        projects: 10,
        workspaces: 5,
        apiKeys: 10,
        seats: 15,
        maxRequestPerSecond: 75
      },
      features: {
        apiAccess: true,
        hashedChainProof: true,
        tamperEvidence: true,
        search: true,
        exports: true,
        webhooks: true,
        alerting: true,
        ssoSaml: false,
        rbacAdvanced: true,
        auditDashboard: true,
        dataResidency: false,
        bringYourOwnKey: false,
        soc2Reports: false,
        uptimeSla: false,
        prioritySupport: true
      },
      data: {
        allowedRegions: ['US'],
        defaultRegion: 'US'
      }
    }
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    planType: PlanType.STANDARD,
    status: PlanStatus.ACTIVE,
    description:
      'For organisations needing SSO, stronger access control, and data residency options.',
    baseEntitlements: {
      limits: {
        eventsPerMonth: 25_000_000,
        retentionDays: 365,
        projects: 50,
        workspaces: 20,
        apiKeys: 50,
        seats: 50,
        maxRequestPerSecond: 200
      },
      features: {
        apiAccess: true,
        hashedChainProof: true,
        tamperEvidence: true,
        search: true,
        exports: true,
        webhooks: true,
        alerting: true,
        ssoSaml: true,
        rbacAdvanced: true,
        auditDashboard: true,
        dataResidency: true,
        bringYourOwnKey: false,
        soc2Reports: true,
        uptimeSla: false,
        prioritySupport: true
      },
      data: {
        allowedRegions: ['AU', 'US', 'EU', 'UK'],
        defaultRegion: 'AU'
      }
    }
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    planType: PlanType.STANDARD,
    status: PlanStatus.ACTIVE,
    description:
      'For regulated and high-scale customers needing BYOK, SLAs, and tailored controls.',
    baseEntitlements: {
      limits: {
        eventsPerMonth: null, // unlimited by default, enforced by contract/override
        retentionDays: null,
        projects: null,
        workspaces: null,
        apiKeys: null,
        seats: null,
        maxRequestPerSecond: null
      },
      features: {
        apiAccess: true,
        hashedChainProof: true,
        tamperEvidence: true,
        search: true,
        exports: true,
        webhooks: true,
        alerting: true,
        ssoSaml: true,
        rbacAdvanced: true,
        auditDashboard: true,
        dataResidency: true,
        bringYourOwnKey: true,
        soc2Reports: true,
        uptimeSla: true,
        prioritySupport: true
      },
      data: {
        allowedRegions: ['AU', 'US', 'EU', 'UK'],
        defaultRegion: 'AU'
      }
    }
  }
] as const;
