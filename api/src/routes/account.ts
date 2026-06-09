import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { cancelDeletion, lockAccountPanic, scheduleDeletion } from '../services/account.js';
import { exportUserData } from '../services/dataExport.js';

export const accountRouter = Router();

const exportRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'export:' });

accountRouter.get('/export', requireAuth, exportRateLimit, async (req, res) => {
  try {
    const data = await exportUserData(req.authUser!.id, req.authUser!.entraOid);
    res.setHeader('Content-Disposition', 'attachment; filename="aether-data-export.json"');
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
});

accountRouter.post('/deletion', requireAuth, async (req, res) => {
  const result = await scheduleDeletion(req.authUser!.id);
  res.status(202).json(result);
});

accountRouter.delete('/deletion', requireAuth, async (req, res) => {
  await cancelDeletion(req.authUser!.id);
  res.json({ ok: true });
});

accountRouter.post('/panic', requireAuth, async (req, res) => {
  await lockAccountPanic(req.authUser!.id);
  res.json({ ok: true });
});
