import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight webhook receiver for local testing.
 *
 * POST /api/webhooks/test
 * GET  /api/webhooks/test
 *
 * Optional protection:
 * - Set WEBHOOK_TEST_TOKEN and send x-webhook-test-token header.
 */

function isAuthorized(request: NextRequest) {
  const required = process.env.WEBHOOK_TEST_TOKEN;
  if (!required) return true;
  const provided = request.headers.get('x-webhook-test-token');
  return provided === required;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    endpoint: '/api/webhooks/test',
    method: 'POST',
    note: 'Webhook test endpoint is reachable',
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Keep raw body when payload is not JSON.
  }

  const receipt = {
    receivedAt: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers: {
      'content-type': request.headers.get('content-type'),
      'x-hyrelog-signature': request.headers.get('x-hyrelog-signature'),
      'x-hyrelog-delivery-id': request.headers.get('x-hyrelog-delivery-id'),
      'x-hyrelog-attempt': request.headers.get('x-hyrelog-attempt'),
      'x-trace-id': request.headers.get('x-trace-id'),
    },
    body: parsedBody,
  };

  // Visible in the dashboard dev terminal for quick debugging.
  console.log('[webhook-test] received webhook', JSON.stringify(receipt));

  return NextResponse.json({
    ok: true,
    received: receipt,
  });
}
