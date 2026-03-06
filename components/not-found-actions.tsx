'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundActions() {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button variant="outline" asChild>
        <Link href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Link>
      </Button>
      <Button asChild>
        <Link href="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
