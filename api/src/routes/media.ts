import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createUploadSas, deleteMedia } from '../services/media.js';

export const mediaRouter = Router();

mediaRouter.post('/upload-sas', requireAuth, async (req, res) => {
  const contentType = req.body?.contentType ?? 'image/jpeg';
  const sas = await createUploadSas(req.authUser!.id, contentType);
  res.status(201).json(sas);
});

mediaRouter.delete('/:id', requireAuth, async (req, res) => {
  const ok = await deleteMedia(req.params.id, req.authUser!.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
