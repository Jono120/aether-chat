import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { assertAlbumUploadAllowed } from '../middleware/clientPlatform.js';
import { createUploadSas, deleteMedia } from '../services/media.js';

export const mediaRouter = Router();

mediaRouter.post('/upload-sas', requireAuth, async (req, res) => {
  const contentType = req.body?.contentType ?? 'image/jpeg';
  const purpose = req.body?.purpose === 'album' ? 'album' : 'avatar';
  try {
    assertAlbumUploadAllowed(req, purpose);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status =
      err instanceof Error && 'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 403;
    return res.status(status).json({ error: message });
  }
  const sas = await createUploadSas(req.authUser!.id, contentType);
  res.status(201).json(sas);
});

mediaRouter.delete('/:id', requireAuth, async (req, res) => {
  const ok = await deleteMedia(req.params.id, req.authUser!.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
