import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { cancelDeletion, lockAccountPanic, scheduleDeletion } from '../services/account.js';

export const accountRouter = Router();

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
