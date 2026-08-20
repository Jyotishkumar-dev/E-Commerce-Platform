import type { Request, Response } from 'express';

export function ok(response: Response, request: Request, data: unknown, message = 'Success', statusCode = 200) {
  return response.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    meta: { requestId: request.id, timestamp: new Date().toISOString() },
  });
}
