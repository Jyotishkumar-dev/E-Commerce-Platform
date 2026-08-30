import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { v1Router } from './routes/v1.js';
import { NotFoundError } from './utils/errors.js';

const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });

export const app = express();
app.disable('x-powered-by');

// Correlation ID & Structured Logging
app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID() }));

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  }),
);

// Body Parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global Rate Limiter for API
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/api/v1/health', (request, response) => {
  response.status(200).json({
    success: true,
    statusCode: 200,
    message: 'API is healthy',
    data: { status: 'ok', environment: env.NODE_ENV },
    meta: { requestId: request.id, timestamp: new Date().toISOString() },
  });
});

// Mount V1 API Routes
app.use('/api/v1', v1Router);

// 404 Route Handler
app.use((_req, _res, next) => {
  next(new NotFoundError('The requested API route was not found.'));
});

// Centralized Error Handler
app.use(errorHandler);
