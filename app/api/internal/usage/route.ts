/**
 * Internal usage API for HyreLog API service.
 * GET: return current period usage for a company (by apiCompanyId).
 * POST: increment usage counters (event, export, webhook).
 * Secured by x-dashboard-token (same as DASHBOARD_SERVICE_TOKEN).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TOKEN_HEADER = 'x-dashboard-token';

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

function getToken(): string | null {
  return process.env.DASHBOARD_SERVICE_TOKEN ?? null;
}

export async function GET(request: NextRequest) {
  const token = request.headers.get(TOKEN_HEADER);
  if (!token || token !== getToken()) {
    return unauthorized();
  }

  const apiCompanyId = request.nextUrl.searchParams.get('apiCompanyId');
  if (!apiCompanyId) {
    return NextResponse.json(
      { error: 'Missing apiCompanyId', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const company = await prisma.company.findFirst({
    where: { apiCompanyId },
    include: {
      subscription: { include: { plan: true } },
    },
  });

  if (!company) {
    return NextResponse.json(
      { error: 'Company not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const sub = company.subscription;
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = sub?.currentPeriodEnd ?? new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const period = await prisma.usagePeriod.findUnique({
    where: {
      companyId_periodStart: {
        companyId: company.id,
        periodStart,
      },
    },
  });

  const eventsIngested = period?.eventsIngested ?? 0;
  const exportsCreated = period?.exportsCreated ?? 0;
  const webhooksActive = period?.webhooksActive ?? 0;

  return NextResponse.json({
    companyId: company.id,
    apiCompanyId: company.apiCompanyId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    eventsIngested,
    exportsCreated,
    webhooksActive,
    planCode: sub?.plan?.code ?? 'FREE',
  });
}

const PostBodySchema = {
  apiCompanyId: (v: unknown) => typeof v === 'string' && v.length > 0,
  type: (v: unknown) => ['event', 'export', 'webhook'].includes(v as string),
  amount: (v: unknown) => v === undefined || (typeof v === 'number'),
};

export async function POST(request: NextRequest) {
  const token = request.headers.get(TOKEN_HEADER);
  if (!token || token !== getToken()) {
    return unauthorized();
  }

  let body: { apiCompanyId?: string; type?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (!PostBodySchema.apiCompanyId(body.apiCompanyId) || !PostBodySchema.type(body.type)) {
    return NextResponse.json(
      { error: 'Missing or invalid apiCompanyId or type', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const company = await prisma.company.findFirst({
    where: { apiCompanyId: body.apiCompanyId },
    include: { subscription: true },
  });

  if (!company) {
    return NextResponse.json(
      { error: 'Company not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const sub = company.subscription;
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = sub?.currentPeriodEnd ?? new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const amount = body.type === 'webhook' ? (body.amount ?? 1) : 1;

  if (body.type === 'event') {
    await prisma.usagePeriod.upsert({
      where: {
        companyId_periodStart: { companyId: company.id, periodStart },
      },
      create: {
        companyId: company.id,
        periodStart,
        periodEnd,
        eventsIngested: 1,
      },
      update: { eventsIngested: { increment: 1 } },
    });
  } else if (body.type === 'export') {
    await prisma.usagePeriod.upsert({
      where: {
        companyId_periodStart: { companyId: company.id, periodStart },
      },
      create: {
        companyId: company.id,
        periodStart,
        periodEnd,
        exportsCreated: 1,
      },
      update: { exportsCreated: { increment: 1 } },
    });
  } else if (body.type === 'webhook') {
    const delta = typeof body.amount === 'number' ? body.amount : 1;
    await prisma.usagePeriod.upsert({
      where: {
        companyId_periodStart: { companyId: company.id, periodStart },
      },
      create: {
        companyId: company.id,
        periodStart,
        periodEnd,
        webhooksActive: Math.max(0, delta),
      },
      update: { webhooksActive: { increment: delta } },
    });
    const row = await prisma.usagePeriod.findUnique({
      where: { companyId_periodStart: { companyId: company.id, periodStart } },
      select: { webhooksActive: true },
    });
    if (row && row.webhooksActive < 0) {
      await prisma.usagePeriod.update({
        where: { companyId_periodStart: { companyId: company.id, periodStart } },
        data: { webhooksActive: 0 },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
