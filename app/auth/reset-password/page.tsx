import { AuthLayout } from '@/components/auth/AuthLayout';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenValue = params.token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;

  return (
    <AuthLayout
      title="Set your new password"
      description="Create a new secure password to continue using HyreLog."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          Missing or invalid reset token. Please request a new reset link.
        </div>
      )}
    </AuthLayout>
  );
}
