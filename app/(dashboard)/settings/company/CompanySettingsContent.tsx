'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCompanyAction } from '@/actions/company';
import { AlertTriangle } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  slug: string;
  preferredRegion: string;
  status: string;
  apiCompanyId: string | null;
};

export function CompanySettingsContent({
  company,
  canEdit,
}: {
  company: Company;
  canEdit: boolean;
}) {
  const [name, setName] = useState(company.name);
  const [slug, setSlug] = useState(company.slug);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setMessage(null);
    const result = await updateCompanyAction({ name, slug });
    setLoading(false);
    if (result.ok) {
      setMessage({ type: 'success', text: 'Company settings saved.' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Company settings</h1>
        <p className="text-muted-foreground">
          Update your company name and slug. Region is set at signup and cannot be changed here after provisioning.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
          }`}
        >
          {message.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Name and URL slug for your company.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Slug</Label>
              <Input
                id="company-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                disabled={!canEdit}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only. Used in URLs.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Region: <strong>{company.preferredRegion}</strong></p>
              {company.apiCompanyId && (
                <p className="mt-1">Provisioned. Region cannot be changed.</p>
              )}
            </div>
            {canEdit && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {canEdit && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-600">Danger zone</CardTitle>
            <CardDescription>
              Deleting the company will remove all workspaces, members, and data. This action cannot be undone.
              Contact support if you need to close your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled className="text-muted-foreground">
              Request company closure (contact support)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
