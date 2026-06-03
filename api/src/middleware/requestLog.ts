import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sanitizeLogPath } from '../utils/logSanitize.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const meta = {
      requestId: req.requestId,
      method: req.method,
      route: sanitizeLogPath(req.originalUrl ?? req.url),
      status: res.statusCode,
      durationMs,
    };
    if (res.statusCode >= 500) {
      logger.error('Request completed', meta);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed', meta);
    } else {
      logger.info('Request completed', meta);
    }
  });
  next();
}
