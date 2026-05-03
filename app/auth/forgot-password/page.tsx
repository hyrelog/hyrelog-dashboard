import { AuthLayout } from '@/components/auth/AuthLayout';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Recover account access securely"
      description="Request a password reset link to regain access to your HyreLog account."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
