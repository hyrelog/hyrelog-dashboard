import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import RegisterForm from '@/components/auth/RegisterForm';
import { redirectIfLoggedIn } from '@/lib/auth/isLoggedInRedirect';

export default async function RegisterPage() {
  await redirectIfLoggedIn();

  const features = [
    'Complete audit trail visibility',
    'Real-time compliance monitoring',
    'Enterprise-grade security',
    'Unlimited team members'
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
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
                Create your account
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Try us free and see how we can help your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm />
            </CardContent>
            <CardFooter className="flex justify-center pt-2">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-brand-500 hover:text-brand-600 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right Side - Branding (Light theme only for signup) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F7F9FB] relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#EDF3F8] to-[#F7F9FB]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Image
              src="/images/logoLight.png"
              alt="HyreLog"
              width={200}
              height={60}
              className="mb-8"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-[#1F2933] leading-tight text-balance mb-4">
                Start building trust with your audit trail
              </h2>
              <p className="text-[#4B5563] text-lg leading-relaxed max-w-md">
                Join thousands of companies using HyreLog to maintain compliance and transparency.
              </p>
            </div>
            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#5F7F9E]" />
                  <span className="text-[#2B3640]">{feature}</span>
                </div>
              ))}
            </div>
            {/* <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-[#E5EAF0]">
              <p className="text-[#4B5563] italic mb-4">
                {`"HyreLog transformed how we handle audit compliance. What used to take days now takes minutes."`}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#DDE8F2] flex items-center justify-center">
                  <span className="text-[#5F7F9E] font-semibold">SK</span>
                </div>
                <div>
                  <p className="font-medium text-[#1F2933]">Sarah Kim</p>
                  <p className="text-sm text-[#6B7280]">Head of Compliance, TechCorp</p>
                </div>
              </div>
            </div> */}
          </div>
          <div className="text-[#6B7280] text-sm">© 2026 HyreLog. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
