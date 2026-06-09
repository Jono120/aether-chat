import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  blockUser,
  listBlockedEntraOids,
  reportUser,
  unblockUser,
} from '../services/moderation.js';
import {
  getDiscoveryPreferences,
  patchDiscoveryPreferences,
} from '../services/discoveryPreferences.js';
import {
  getPrivacyPreferences,
  patchPrivacyPreferences,
} from '../services/privacyPreferences.js';
import {
  getReadReceiptsPreference,
  setReadReceiptsPreference,
} from '../services/readReceipts.js';

export const usersRouter = Router();

usersRouter.get('/blocked', requireAuth, async (req, res) => {
  const blocked = await listBlockedEntraOids(req.authUser!.id);
  res.json({ blocked });
});

usersRouter.post('/:peerId/block', requireAuth, async (req, res) => {
  try {
    await blockUser(req.authUser!.id, req.params.peerId);
    res.status(201).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Block failed';
    res.status(400).json({ error: message });
  }
});

usersRouter.delete('/:peerId/block', requireAuth, async (req, res) => {
  await unblockUser(req.authUser!.id, req.params.peerId);
  res.json({ ok: true });
});

usersRouter.post('/:peerId/report', requireAuth, async (req, res) => {
  try {
    const { reason, details, conversationId } = req.body ?? {};
    await reportUser(
      req.authUser!.id,
      req.params.peerId,
      reason ?? '',
      details ?? '',
      conversationId ?? null,
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Report failed';
    res.status(400).json({ error: message });
  }
});

usersRouter.get('/me/messaging-preferences', requireAuth, async (req, res) => {
  const readReceiptsEnabled = await getReadReceiptsPreference(req.authUser!.id);
  res.json({ readReceiptsEnabled });
});

usersRouter.patch('/me/messaging-preferences', requireAuth, async (req, res) => {
  if (typeof req.body?.readReceiptsEnabled === 'boolean') {
    await setReadReceiptsPreference(req.authUser!.id, req.body.readReceiptsEnabled);
  }
  const readReceiptsEnabled = await getReadReceiptsPreference(req.authUser!.id);
  res.json({ readReceiptsEnabled });
});

usersRouter.get('/me/discovery-preferences', requireAuth, async (req, res) => {
  const prefs = await getDiscoveryPreferences(req.authUser!.id);
  res.json(prefs);
});

usersRouter.patch('/me/discovery-preferences', requireAuth, async (req, res) => {
  try {
    const prefs = await patchDiscoveryPreferences(req.authUser!.id, {
      discoveryFilters: req.body?.discoveryFilters,
      profileViewPrefs: req.body?.profileViewPrefs,
    });
    res.json(prefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid discovery preferences';
    res.status(400).json({ error: message });
  }
});

usersRouter.get('/me/privacy-preferences', requireAuth, async (req, res) => {
  const prefs = await getPrivacyPreferences(req.authUser!.id);
  res.json(prefs);
});

usersRouter.patch('/me/privacy-preferences', requireAuth, async (req, res) => {
  try {
    const prefs = await patchPrivacyPreferences(req.authUser!.id, {
      fuzzingStrategy: req.body?.fuzzingStrategy,
      albumShieldEnabled: req.body?.albumShieldEnabled,
    });
    res.json(prefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid privacy preferences';
    res.status(400).json({ error: message });
  }
});
