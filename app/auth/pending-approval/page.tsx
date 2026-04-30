import Link from 'next/link';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Your account is pending approval</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Thanks for signing up. A HyreLog admin needs to approve your account before you can access
          the dashboard.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You will receive an email as soon as your account is approved.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Back to login
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
