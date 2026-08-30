import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ok } from './response.js';

describe('Response Utility', () => {
  it('formats a successful json response correctly', () => {
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const mockResponse = {
      status: statusMock,
    } as unknown as Response;

    const mockRequest = {
      id: 'req_123',
    } as unknown as Request;

    const data = { status: 'healthy' };
    ok(mockResponse, mockRequest, data, 'API is healthy', 200);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        statusCode: 200,
        message: 'API is healthy',
        data: { status: 'healthy' },
        meta: expect.objectContaining({
          requestId: 'req_123',
        }),
      }),
    );
  });
});
