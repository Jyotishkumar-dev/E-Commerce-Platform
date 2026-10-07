import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!data.RAZORPAY_KEY_ID?.trim()) missing.push('RAZORPAY_KEY_ID');
    if (!data.RAZORPAY_KEY_SECRET?.trim()) missing.push('RAZORPAY_KEY_SECRET');
    if (!data.RAZORPAY_WEBHOOK_SECRET?.trim()) missing.push('RAZORPAY_WEBHOOK_SECRET');
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required environment variables: ${missing.join(', ')}`,
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
export { envSchema };
