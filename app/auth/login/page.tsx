import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { redirectIfLoggedIn } from '@/lib/auth/isLoggedInRedirect';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const sp = await searchParams;
  await redirectIfLoggedIn(sp.callbackURL);

  return (
    <AuthLayout
      title="Enterprise-grade audit logging you can trust"
      description="Track every action, maintain compliance, and ensure complete transparency with immutable audit trails."
    >
      <LoginForm />
    </AuthLayout>
  );
}
