import { redirect } from 'next/navigation';
import { listUsersForPlatformAdmin } from '@/actions/platform-admin';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { AdminUsersContent } from '@/components/admin/AdminUsersContent';

export default async function AdminUsersPage() {
  const session = await requireDashboardAccess('/admin/users');
  const result = await listUsersForPlatformAdmin();

  if (!result.ok) {
    redirect('/');
  }

  return <AdminUsersContent users={result.users} currentUserId={session.user.id} />;
}
