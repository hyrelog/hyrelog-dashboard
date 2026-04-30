import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VerifyCodeClient from '@/components/auth/VerifyCodeClient';
import { requireVerifySession } from '@/lib/auth/requireVerifySession';

export default async function VerifyCodePage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await requireVerifySession();

  const { email } = await searchParams;
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
              Verify your identity
            </h1>
            <p className="text-[#7B8794] text-lg leading-relaxed max-w-md">
              {"We've"} sent a verification code to your email. Enter the code to securely access
              your account.
            </p>
            <div className="bg-[#161D26] rounded-xl p-6 border border-[#25303B]">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-[#7F9DB7]" />
                <h3 className="text-[#E5EAF0] font-medium">Why we verify</h3>
              </div>
              <ul className="space-y-2 text-[#7B8794] text-sm">
                <li>Protects your audit data from unauthorized access</li>
                <li>Ensures compliance with security standards</li>
                <li>Adds an extra layer of account protection</li>
              </ul>
            </div>
          </div>
          <div className="text-[#7B8794] text-sm">© 2026 HyreLog. All rights reserved.</div>
        </div>
      </div>

      {/* Right Side - OTP Form */}
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

          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold text-foreground">
                Enter verification code
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {"We've"} sent a 6-digit code to
                <br />
                <span className="font-medium text-foreground">{email || 'your email'}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifyCodeClient defaultEmail={email ?? ''} />
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-ice-200 rounded-lg border border-ice-300">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">Tip:</span> Check your spam folder if
              you {"don't"} see the email within a few minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
