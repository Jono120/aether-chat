import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProfileByEntraOid, listNearbyProfiles } from '../services/profiles.js';

export const profilesRouter = Router();

profilesRouter.get('/nearby', requireAuth, async (req, res) => {
  const profiles = await listNearbyProfiles(req.authUser!.id);
  res.json({ profiles });
});

profilesRouter.get('/:id', requireAuth, async (req, res) => {
  const profile = await getProfileByEntraOid(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json({ profile });
});
