'use client';

import { z } from 'zod';
import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { LoginSchema } from '@/schemas/auth';
import { login } from '@/actions/login';
import { de } from 'zod/v4/locales';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get('callbackURL') || '/';
  const verified = searchParams.get('verified') === '1';

  useEffect(() => {
    if (verified) {
      toast.success('Your email is verified. Sign in to continue.', { position: 'top-center' });
    }
  }, [verified]);

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true
    }
  });

  const onSubmit = (values: z.infer<typeof LoginSchema>) => {
    startTransition(async () => {
      const data = await login(values, callbackURL);
      const { error } = data;
      if (error) {
        toast.error(error, { position: 'top-center' });
      } else {
        toast.success('Log in successful', { position: 'top-center' });
        router.push(`/auth/post-login?returnTo=${encodeURIComponent(callbackURL || '/')}`);
      }
    });
  };

  const onError: SubmitErrorHandler<z.infer<typeof LoginSchema>> = (errors) => {
    const errorMessages = Object.entries(errors).map(([field, error]) => (
      <li key={field}>{error.message || `Invalid ${field}`}</li>
    ));

    toast.dismiss();

    toast.error('There were errors in your login', {
      position: 'top-center',
      description: <ul className="list-disc ml-4 space-y-1">{errorMessages}</ul>,
      closeButton: true,
      duration: Infinity
    });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-semibold text-foreground">Welcome back</CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="space-y-4"
          >
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@company.com.au"
                        className="pl-10"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-brand-500 hover:text-brand-600 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Remember me
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <p className="text-sm text-muted-foreground">
          {"Don't have an account?"}{' '}
          <Link
            href="/auth/register"
            className="text-brand-500 hover:text-brand-600 font-medium transition-colors"
          >
            Create account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
