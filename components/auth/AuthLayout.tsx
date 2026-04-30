import { AuthLayoutProps } from '@/types/auth';
import Image from 'next/image';

export function AuthLayout({
  children,
  title,
  description,
  features = ['Secure', 'Immutable', 'Auditable']
}: AuthLayoutProps) {
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
              {title}
            </h1>
            <p className="text-[#7B8794] text-lg leading-relaxed max-w-md">{description}</p>
            <div className="flex gap-6 pt-4">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-[#7F9DB7]" />
                  <span className="text-[#AAB4BF] text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[#7B8794] text-sm">© 2026 HyreLog. All rights reserved.</div>
        </div>
      </div>

      {/* Right Side - Form */}
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

          {children}
        </div>
      </div>
    </div>
  );
}
