import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // If response headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err);
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      message: err.message,
      errors: err.details,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Zod validation errors directly
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(422).json({
      success: false,
      statusCode: 422,
      errorCode: 'VALIDATION_ERROR',
      message: formattedErrors[0]?.message ?? 'Validation failed.',
      errors: formattedErrors,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Prisma Known Request Errors
  const prismaError = err as { code?: string; meta?: { target?: string[] } };
  if (prismaError.code === 'P2002') {
    const target = prismaError.meta?.target?.join(', ') ?? 'field';
    return res.status(409).json({
      success: false,
      statusCode: 409,
      errorCode: 'CONFLICT',
      message: `A record with this ${target} already exists.`,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (prismaError.code === 'P2025') {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      errorCode: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Log unexpected errors internally
  if (req.log) {
    req.log.error(err, 'Unhandled error');
  } else {
    console.error('Unhandled server error:', err);
  }

  // Generic 500 response (never leak internal trace to client)
  return res.status(500).json({
    success: false,
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal error occurred. Please try again later.',
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
}
