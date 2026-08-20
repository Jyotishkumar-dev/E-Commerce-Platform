import { z } from 'zod';

export const healthResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.literal(200),
  message: z.string(),
  data: z.object({ status: z.literal('ok') }),
  meta: z.object({ requestId: z.string(), timestamp: z.string() }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
