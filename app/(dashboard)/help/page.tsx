import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { BookOpen, Mail, Shield, ExternalLink } from 'lucide-react';

export default async function HelpPage() {
  await requireDashboardAccess('/help');

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'https://api.hyrelog.com';
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.hyrelog.com';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@hyrelog.com';
  const statusUrl = process.env.NEXT_PUBLIC_STATUS_URL ?? 'https://status.hyrelog.com';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Help &amp; support</h1>
        <p className="text-muted-foreground">
          Documentation, API reference, status, and how to get in touch.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              API Reference
            </CardTitle>
            <CardDescription>
              Interactive API docs with try-it-out for all endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/reference"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Open API Reference
              <ExternalLink className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Documentation
            </CardTitle>
            <CardDescription>
              Guides, concepts, and integration examples.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              View docs
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Status
            </CardTitle>
            <CardDescription>
              Service status and incident history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={statusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Status page
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Support
            </CardTitle>
            <CardDescription>
              Email us for billing, technical, or account help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {supportEmail}
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API base URL</CardTitle>
          <CardDescription>
            Use this base URL for all API requests. Authenticate with a workspace API key (Bearer token).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block rounded bg-muted px-2 py-1 text-sm break-all">{apiBaseUrl}</code>
        </CardContent>
      </Card>
    </div>
  );
}
