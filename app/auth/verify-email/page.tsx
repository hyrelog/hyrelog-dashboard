import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { CheckCircle2, ArrowRight, X, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyMagicLink } from '@/actions/emails';
import { requireVerifySession } from '@/lib/auth/requireVerifySession';
import { safeReturnTo } from '@/lib/auth/redirects';

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; cid?: string; email?: string; returnTo?: string }>;
}) {
  const { token, cid, email, returnTo } = await searchParams;

  // When token+cid are present, allow access without session so the magic link works
  // when opened in a different browser/device or when the user has no session.
  const hasMagicLinkParams = Boolean(token && cid);
  if (!hasMagicLinkParams) {
    await requireVerifySession(returnTo);
  }

  const isValid = { valid: false, message: '' };

  if (token && cid) {
    const res = await verifyMagicLink({ cid, token });
    if (res.ok) {
      isValid.valid = true;
      const rt = safeReturnTo(returnTo);
      // User is already logged in from signup; post-login uses DB for emailVerified so they go to / or /onboarding
      redirect(`/auth/post-login?returnTo=${encodeURIComponent(rt)}`);
    } else {
      isValid.valid = false;
      isValid.message = res.message;
    }
  } else {
    isValid.valid = false;
    isValid.message =
      'This verification link is missing required information. Some email clients strip links—try "Use a code instead" below, or request a new link from the check-email page.';
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B0F14] relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#121821] to-[#0B0F14]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Image
              src="/images/logoDark.png"
              alt="HyreLog"
              width={200}
              height={60}
              className="mb-8"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-[#E5EAF0] leading-tight text-balance">
              {!token || !cid || !isValid.valid ? 'Invalid link' : "You're all set!"}
            </h1>
            <p className="text-[#7B8794] text-lg leading-relaxed max-w-md">
              {!token || !cid || !isValid.valid
                ? isValid.message
                : ' Your email has been successfully verified. You can now continue in to your account.'}
            </p>
          </div>
          <div className="text-[#7B8794] text-sm">© 2026 HyreLog. All rights reserved.</div>
        </div>
      </div>

      {/* Right Side - Success */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Image
              src="/images/logoLight.png"
              alt="HyreLog"
              width={180}
              height={54}
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          {!token || !cid || !isValid.valid ? (
            <Card className="border-border shadow-sm">
              <CardHeader className="space-y-1 pb-4 text-center">
                <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  Invalid link
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {isValid.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  asChild
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                >
                  <Link
                    href={
                      email
                        ? `/auth/check-email?email=${encodeURIComponent(email)}`
                        : '/auth/register'
                    }
                  >
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    Go Back
                  </Link>
                </Button>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <a
                      href={
                        email
                          ? `/auth/verify-code?email=${encodeURIComponent(email)}`
                          : '/auth/verify-code'
                      }
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      Use a code instead
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm">
              <CardHeader className="space-y-1 pb-4 text-center">
                <div className="mx-auto w-16 h-16 bg-success-subtle rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  Email verified successfully
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your email has been successfully verified.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  asChild
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                >
                  <Link href="/">
                    Continue to the dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-ice-200 rounded-lg border border-ice-300">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">Security tip:</span> For added security,
              we recommend enabling two-factor authentication in your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
