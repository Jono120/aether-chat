import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/** Single hub shared by client negotiate and server REST broadcast. */
export const SIGNALR_HUB = 'messages';

export function parseSignalREndpoint(connectionString: string): string {
  const endpointMatch = connectionString.match(/Endpoint=(https:\/\/[^;]+)/i);
  if (!endpointMatch) throw new Error('Invalid SignalR connection string');
  return endpointMatch[1]!;
}

export function parseSignalRAccessKey(connectionString: string): string {
  const accessKeyMatch = connectionString.match(/AccessKey=([^;]+)/i);
  if (!accessKeyMatch) throw new Error('SignalR connection string missing AccessKey');
  return accessKeyMatch[1]!;
}

export function createSignalRAccessToken(userId: string, hub = SIGNALR_HUB): string | null {
  if (!config.signalrConnectionString) return null;
  const endpoint = parseSignalREndpoint(config.signalrConnectionString);
  const audience = `${endpoint}/client/?hub=${hub}`;
  const accessKey = parseSignalRAccessKey(config.signalrConnectionString);

  return jwt.sign(
    {
      aud: audience,
      sub: userId,
    },
    accessKey,
    { expiresIn: '1h', algorithm: 'HS256' },
  );
}

/**
 * Token for the Azure SignalR REST API (server-to-service). The audience must
 * be the request URL without the query string.
 */
export function createSignalRRestToken(audience: string): string {
  const accessKey = parseSignalRAccessKey(config.signalrConnectionString);
  return jwt.sign({ aud: audience }, accessKey, { expiresIn: '5m', algorithm: 'HS256' });
}

export function getSignalRClientUrl(hub = SIGNALR_HUB): string | null {
  if (!config.signalrConnectionString) return null;
  const endpoint = parseSignalREndpoint(config.signalrConnectionString);
  return `${endpoint}/client/?hub=${hub}`;
}
