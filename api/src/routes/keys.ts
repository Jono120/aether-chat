import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getActivePublicKeysForUser, registerPublicKey, revokeDeviceKeys } from '../services/keys.js';

export const keysRouter = Router();

keysRouter.post('/public', requireAuth, async (req, res) => {
  const { deviceId, publicKeyJwk, fingerprint } = req.body ?? {};
  if (!deviceId || !publicKeyJwk || !fingerprint) {
    return res.status(400).json({ error: 'deviceId, publicKeyJwk, and fingerprint required' });
  }
  await registerPublicKey(req.authUser!.id, deviceId, publicKeyJwk, fingerprint);
  res.status(201).json({ ok: true });
});

keysRouter.get('/public/:userId', requireAuth, async (req, res) => {
  const keys = await getActivePublicKeysForUser(req.params.userId);
  res.json({ keys });
});

keysRouter.post('/revoke', requireAuth, async (req, res) => {
  const { deviceId } = req.body ?? {};
  await revokeDeviceKeys(req.authUser!.id, deviceId);
  res.json({ ok: true });
});
