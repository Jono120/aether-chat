import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { submitErrorReport, type ErrorReportSource } from '../services/support.js';
import { logger } from '../utils/logger.js';

export const supportRouter = Router();

function clientKey(req: import('express').Request): string {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.socket.remoteAddress ?? 'unknown';
}

const errorReportUserLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'err:user:',
  keyFn: (req) => req.authUser?.id ?? clientKey(req),
});

const errorReportIpLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyPrefix: 'err:ip:',
});

supportRouter.post(
  '/error-reports',
  requireAuth,
  errorReportIpLimit,
  errorReportUserLimit,
  async (req, res) => {
    try {
      const description = typeof req.body?.description === 'string' ? req.body.description : '';
      const context =
        req.body?.context && typeof req.body.context === 'object' && !Array.isArray(req.body.context)
          ? (req.body.context as Record<string, unknown>)
          : {};

      const sourceRaw = req.body?.source;
      const source: ErrorReportSource = sourceRaw === 'auto' ? 'auto' : 'user';
      const errorName =
        typeof req.body?.errorName === 'string' ? req.body.errorName : undefined;
      const stackSnippet =
        typeof req.body?.stackSnippet === 'string' ? req.body.stackSnippet : undefined;

      const report = await submitErrorReport({
        userId: req.authUser!.id,
        description,
        context,
        source,
        errorName,
        stackSnippet,
      });
      res.status(201).json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit error report';
      const isValidation =
        message.includes('at least') ||
        message.includes('too long') ||
        message.includes('too large') ||
        message.includes('requires');
      if (isValidation) {
        logger.warn('Error report validation failed', {
          requestId: req.requestId,
          error: message,
        });
      } else {
        logger.error('Error report submission failed', {
          requestId: req.requestId,
          error: message,
        });
      }
      const status = isValidation ? 400 : 500;
      res.status(status).json({ error: message });
    }
  },
);
