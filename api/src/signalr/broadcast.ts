import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  SIGNALR_HUB,
  createSignalRRestToken,
  parseSignalREndpoint,
} from './negotiate.js';

/**
 * Broadcast ciphertext envelope to conversation members via Azure SignalR REST API.
 * Falls back to no-op when connection string is not configured (dev polling mode).
 */
export async function broadcastEnvelope(
  conversationId: string,
  envelope: Record<string, unknown>,
  excludeUserId?: string,
) {
  if (!config.signalrConnectionString) {
    return { delivered: false, mode: 'polling' as const };
  }

  // Same hub the clients negotiate against, and a short-lived JWT signed with
  // the AccessKey (the raw connection string is never sent over the wire).
  const endpoint = parseSignalREndpoint(config.signalrConnectionString).replace(/\/$/, '');
  const url = `${endpoint}/api/v1/hubs/${SIGNALR_HUB}`;
  const token = createSignalRRestToken(url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      target: 'ReceiveEnvelope',
      arguments: [
        {
          conversationId,
          envelope,
          excludeUserId,
        },
      ],
    }),
  });

  if (!response.ok) {
    logger.warn('SignalR broadcast failed', { status: response.status });
    return { delivered: false, mode: 'signalr-error' as const };
  }

  return { delivered: true, mode: 'signalr' as const };
}
