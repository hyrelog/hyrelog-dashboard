import Image from 'next/image';

import { OnboardingLayoutProps } from '@/types/onboarding';

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-subtle">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/logoDark.png"
            alt="HyreLog"
            width={160}
            height={48}
            className="dark:block hidden"
            style={{ width: 'auto', height: 'auto' }}
          />
          <Image
            src="/images/logoLight.png"
            alt="HyreLog"
            width={160}
            height={48}
            className="dark:hidden block"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>

        {children}
      </div>
    </div>
  );
}
