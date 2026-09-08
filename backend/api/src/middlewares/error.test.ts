import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { errorHandler } from './error.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

describe('Error Handling Middleware', () => {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

  const mockResponse = {
    headersSent: false,
    status: statusMock,
  } as unknown as Response;

  const mockRequest = {
    id: 'req_test_123',
  } as unknown as Request;

  const nextMock = vi.fn();

  it('formats custom AppError correctly with appropriate status code', () => {
    const error = new NotFoundError('Product not found');
    errorHandler(error, mockRequest, mockResponse, nextMock);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: 'Product not found',
      }),
    );
  });

  it('formats ZodError correctly with 422 status', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['email'],
        message: 'Required',
      },
    ]);

    errorHandler(zodError, mockRequest, mockResponse, nextMock);

    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 422,
        errorCode: 'VALIDATION_ERROR',
      }),
    );
  });

  it('handles unknown 500 error gracefully without leaking stack traces', () => {
    const genericError = new Error('Database connection failed internally');
    errorHandler(genericError, mockRequest, mockResponse, nextMock);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'An unexpected internal error occurred. Please try again later.',
      }),
    );
  });
});
