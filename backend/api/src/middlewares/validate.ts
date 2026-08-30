import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formattedErrors = (result.error as ZodError).errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError(formattedErrors[0]?.message ?? 'Invalid request body.', formattedErrors));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const formattedErrors = (result.error as ZodError).errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError(formattedErrors[0]?.message ?? 'Invalid query parameters.', formattedErrors));
    }
    req.query = result.data;
    next();
  };
}

export function validateParams(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const formattedErrors = (result.error as ZodError).errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError(formattedErrors[0]?.message ?? 'Invalid route parameters.', formattedErrors));
    }
    req.params = result.data;
    next();
  };
}
