import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMyProfile,
  getProfileByEntraOid,
  listNearbyProfiles,
  updateMyProfile,
} from '../services/profiles.js';

export const profilesRouter = Router();

profilesRouter.get('/nearby', requireAuth, async (req, res) => {
  const profiles = await listNearbyProfiles(req.authUser!.id);
  res.json({ profiles });
});

profilesRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await getMyProfile(req.authUser!.id, req.authUser!.entraOid);
  res.json({ profile });
});

profilesRouter.patch('/me', requireAuth, async (req, res) => {
  try {
    const profile = await updateMyProfile(req.authUser!.id, req.authUser!.entraOid, req.body ?? {});
    res.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    if (
      message === 'Invalid avatar media' ||
      message === 'Age must be 18 or older' ||
      message === 'Invalid gender' ||
      message === 'Invalid lookingFor'
    ) {
      return res.status(400).json({ error: message });
    }
    throw err;
  }
});

profilesRouter.get('/:id', requireAuth, async (req, res) => {
  const profile = await getProfileByEntraOid(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json({ profile });
});
