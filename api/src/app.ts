import cors from 'cors';
import express from 'express';
import { accountRouter } from './routes/account.js';
import { conversationsRouter } from './routes/conversations.js';
import { keysRouter } from './routes/keys.js';
import { mediaRouter } from './routes/media.js';
import { profilesRouter } from './routes/profiles.js';
import { config } from './config.js';
import { purgeExpiredMessages } from './services/messages.js';
import { purgeExpiredMedia } from './services/media.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const v1 = express.Router();
  v1.use('/profiles', profilesRouter);
  v1.use('/keys', keysRouter);
  v1.use('/conversations', conversationsRouter);
  v1.use('/media', mediaRouter);
  v1.use('/account', accountRouter);
  app.use('/api/v1', v1);

  setInterval(() => {
    purgeExpiredMessages().catch(console.error);
    purgeExpiredMedia().catch(console.error);
  }, 60_000);

  return app;
}
