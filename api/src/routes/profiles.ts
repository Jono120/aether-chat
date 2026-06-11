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
  const { profiles, totalNearby, filtersActive } = await listNearbyProfiles(req.authUser!.id);
  res.json({ profiles, totalNearby, filtersActive });
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
      message === 'Invalid lookingFor' ||
      message === 'Invalid social links' ||
      message.startsWith('Invalid Instagram') ||
      message.startsWith('Invalid Twitter') ||
      message.startsWith('Invalid Facebook') ||
      message.startsWith('Invalid Bluesky') ||
      message.startsWith('Invalid Discord')
    ) {
      return res.status(400).json({ error: message });
    }
    throw err;
  }
});

profilesRouter.get('/:id', requireAuth, async (req, res) => {
  const profile = await getProfileByEntraOid(req.params.id, req.authUser!.id);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json({ profile });
});
