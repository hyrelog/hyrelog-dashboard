import { z } from 'zod';

// Password requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const LoginSchema = z.object({
  email: z.email({
    message: 'Email is required'
  }),
  password: z.string().min(1, {
    message: 'Password is required'
  }),
  token: z.optional(z.string()),
  rememberMe: z.optional(z.boolean()),
  backupCode: z.optional(z.string())
});

export const ForgotPasswordSchema = z.object({
  email: z.email({
    message: 'Email is required'
  })
});

export const ResetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });
