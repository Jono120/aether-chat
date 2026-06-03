import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSignalRAccessToken, getSignalRClientUrl } from '../signalr/negotiate.js';
import { config } from '../config.js';

export const signalrRouter = Router();

signalrRouter.post('/negotiate', requireAuth, (req, res) => {
  if (!config.signalrConnectionString) {
    return res.status(503).json({ error: 'Realtime messaging is not configured' });
  }
  const url = getSignalRClientUrl('messages');
  const accessToken = createSignalRAccessToken(req.authUser!.id);
  if (!url || !accessToken) {
    return res.status(503).json({ error: 'Could not negotiate SignalR connection' });
  }
  res.json({ url, accessToken });
});
