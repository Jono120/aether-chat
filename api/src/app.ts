import cors from 'cors';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { conversationsRouter } from './routes/conversations.js';
import { keysRouter } from './routes/keys.js';
import { mediaRouter } from './routes/media.js';
import { profilesRouter } from './routes/profiles.js';
import { supportRouter } from './routes/support.js';
import { usersRouter } from './routes/users.js';
import { signalrRouter } from './routes/signalr.js';
import { adminRouter } from './routes/admin.js';
import { configRouter } from './routes/config.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { purgeExpiredMessages } from './services/messages.js';
import { purgeExpiredMedia } from './services/media.js';
import { requestIdMiddleware, requestLogMiddleware } from './middleware/requestLog.js';
import { globalRateLimit } from './middleware/rateLimit.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware);
  if (config.redisUrl) {
    app.use(globalRateLimit);
  }

  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/health/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      logger.error('Readiness check failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(503).json({ status: 'not_ready', error: 'Database unavailable' });
    }
  });

  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/profiles', profilesRouter);
  v1.use('/keys', keysRouter);
  v1.use('/conversations', conversationsRouter);
  v1.use('/media', mediaRouter);
  v1.use('/account', accountRouter);
  v1.use('/support', supportRouter);
  v1.use('/admin', adminRouter);
  v1.use('/users', usersRouter);
  v1.use('/config', configRouter);
  v1.use('/signalr', signalrRouter);
  app.use('/api/v1', v1);

  if (!config.workerPurgeOnly) {
    setInterval(() => {
      purgeExpiredMessages().catch((err) =>
        logger.error('Message purge failed', { error: String(err) }),
      );
      purgeExpiredMedia().catch((err) =>
        logger.error('Media purge failed', { error: String(err) }),
      );
    }, 60_000);
  } else {
    logger.info('In-process purge disabled (WORKER_PURGE_ONLY=true)');
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    void next;
    logger.error('Unhandled error', {
      requestId: req.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
