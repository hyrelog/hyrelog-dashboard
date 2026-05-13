import Image from 'next/image';

import type { OnboardingLayoutProps } from '@/types/onboarding';

export function OnboardingLayout({ sidebar, children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background-subtle px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex justify-center md:justify-start">
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

        <div className="grid gap-8 lg:grid-cols-[minmax(220px,260px)_1fr] lg:gap-12 lg:items-start">
          <aside className="rounded-xl border border-border bg-card/80 p-4 shadow-sm lg:sticky lg:top-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
            {sidebar}
          </aside>

          <main className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
