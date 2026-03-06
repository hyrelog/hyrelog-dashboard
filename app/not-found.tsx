import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-subtle px-4">
      <div className="max-w-md w-full text-center space-y-10">
        <div className="flex justify-center">
          <Image
            src="/images/logoLight.png"
            alt="HyreLog"
            width={160}
            height={48}
            className="dark:hidden block"
          />
          <Image
            src="/images/logoDark.png"
            alt="HyreLog"
            width={160}
            height={48}
            className="hidden dark:block"
          />
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center justify-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground gap-2">
            <Compass className="w-4 h-4" />
            <span>Page not found</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            We could not find that page
          </h1>
          <p className="text-sm text-muted-foreground">
            The link you followed may be broken or the page may have been moved.
            You can go back or head to your dashboard to continue.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            asChild
          >
            <Link href="#" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              Go to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

