import { config } from '../config.js';

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

  const endpoint = parseSignalREndpoint(config.signalrConnectionString);
  const hub = 'chat';
  const url = `${endpoint}/api/v1/hubs/${hub}/:send?api-version=2022-11-01`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.signalrConnectionString}`,
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
    console.warn('SignalR broadcast failed', await response.text());
    return { delivered: false, mode: 'signalr-error' as const };
  }

  return { delivered: true, mode: 'signalr' as const };
}

function parseSignalREndpoint(connectionString: string): string {
  const endpointMatch = connectionString.match(/Endpoint=([^;]+)/);
  if (!endpointMatch) throw new Error('Invalid SignalR connection string');
  return endpointMatch[1].replace(/\/$/, '');
}
