'use client';

import { z } from 'zod';
import { useTransition } from 'react';
import Link from 'next/link';
import { useForm, SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { requestPasswordReset } from '@/lib/auth-client';
import { ForgotPasswordSchema } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = (values: z.infer<typeof ForgotPasswordSchema>) => {
    startTransition(async () => {
      try {
        await requestPasswordReset({
          email: values.email,
          redirectTo: '/auth/reset-password'
        } as never);
      } catch {
        // Return generic success even when account isn't found.
      }

      toast.success('If this email exists, a reset link has been sent.', {
        position: 'top-center'
      });
      form.reset();
    });
  };

  const onError: SubmitErrorHandler<z.infer<typeof ForgotPasswordSchema>> = (errors) => {
    const messages = Object.values(errors)
      .map((e) => e?.message)
      .filter(Boolean)
      .join('\n');
    toast.error(messages || 'Please enter a valid email.');
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-semibold text-foreground">Forgot password?</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your email and we will send you a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="email" placeholder="name@company.com" className="pl-10" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/auth/login" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
}
