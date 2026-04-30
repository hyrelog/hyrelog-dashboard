'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  approveUser,
  grantPlatformAdmin,
  revokePlatformAdmin
} from '@/actions/platform-admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  emailVerified: boolean;
  createdAt: Date;
  platformRole: { role: 'HYRELOG_ADMIN' | 'HYRELOG_SUPPORT' } | null;
};

export function AdminUsersContent({
  users,
  currentUserId
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Action failed');
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Platform admin · Users</h1>
      <p className="text-sm text-muted-foreground">
        Approve new accounts and manage platform admins.
      </p>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {users.map((u) => {
              const isPlatformAdmin = u.platformRole?.role === 'HYRELOG_ADMIN';
              return (
                <li
                  key={u.id}
                  className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {u.firstName} {u.lastName}{' '}
                      {u.id === currentUserId ? (
                        <span className="text-xs text-muted-foreground">(you)</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {u.status}
                      </Badge>
                      <Badge variant={u.emailVerified ? 'default' : 'secondary'}>
                        {u.emailVerified ? 'EMAIL_VERIFIED' : 'EMAIL_UNVERIFIED'}
                      </Badge>
                      {isPlatformAdmin ? <Badge>PLATFORM_ADMIN</Badge> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {u.status === 'DEACTIVATED' ? (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => run(() => approveUser(u.id), 'User approved and emailed')}
                      >
                        Approve
                      </Button>
                    ) : null}

                    {!isPlatformAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => run(() => grantPlatformAdmin(u.id), 'Platform admin granted')}
                      >
                        Make platform admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || u.id === currentUserId}
                        onClick={() => run(() => revokePlatformAdmin(u.id), 'Platform admin revoked')}
                      >
                        Remove platform admin
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
