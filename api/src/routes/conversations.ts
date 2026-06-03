import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  ensureDirectConversation,
  insertMessage,
  listConversations,
  listMessages,
} from '../services/messages.js';
import { markMessagesRead } from '../services/readReceipts.js';
import { broadcastEnvelope } from '../signalr/broadcast.js';

export const conversationsRouter = Router();

conversationsRouter.get('/', requireAuth, async (req, res) => {
  const conversations = await listConversations(req.authUser!.id);
  res.json({ conversations });
});

conversationsRouter.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    const messages = await listMessages(req.params.id, req.authUser!.id);
    res.json({ messages });
  } catch {
    res.status(403).json({ error: 'Forbidden' });
  }
});

conversationsRouter.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const envelope = req.body;
    const saved = await insertMessage(req.params.id, req.authUser!.id, envelope);
    await broadcastEnvelope(req.params.id, {
      messageId: saved.id,
      conversationId: req.params.id,
      senderEntraOid: req.authUser!.entraOid,
      ...envelope,
      sentAt: saved.sent_at,
    });
    res.status(201).json({ message: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    const status = message === 'Forbidden' ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

conversationsRouter.post('/direct/:peerId', requireAuth, async (req, res) => {
  try {
    const conversationId = await ensureDirectConversation(req.authUser!.id, req.params.peerId);
    res.json({ conversationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Peer not found';
    const status = message.includes('Cannot message') ? 403 : 404;
    res.status(status).json({ error: message });
  }
});

conversationsRouter.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const messageIds = Array.isArray(req.body?.messageIds) ? req.body.messageIds : [];
    const result = await markMessagesRead(req.params.id, req.authUser!.id, messageIds);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    const status = message === 'Forbidden' ? 403 : 400;
    res.status(status).json({ error: message });
  }
});
