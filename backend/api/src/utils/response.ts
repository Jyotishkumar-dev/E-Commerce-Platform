import type { Request, Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    requestId?: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export function ok<T = unknown>(
  response: Response,
  request: Request,
  data: T,
  message = 'Success',
  statusCode = 200,
  metaExtra?: Record<string, unknown>,
) {
  return response.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    meta: {
      requestId: request.id,
      timestamp: new Date().toISOString(),
      ...metaExtra,
    },
  });
}

export function created<T = unknown>(
  response: Response,
  request: Request,
  data: T,
  message = 'Resource created successfully',
) {
  return ok(response, request, data, message, 201);
}
