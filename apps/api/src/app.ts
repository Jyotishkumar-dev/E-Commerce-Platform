import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';

const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });

export const app = express();
app.disable('x-powered-by');
app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID() }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', (request, response) => {
  response.status(200).json({
    success: true,
    statusCode: 200,
    message: 'API is healthy',
    data: { status: 'ok' },
    meta: { requestId: request.id, timestamp: new Date().toISOString() },
  });
});

app.use((_request, response) => response.status(404).json({ success: false, message: 'Not found' }));
