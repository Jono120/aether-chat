import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function parseSignalREndpoint(connectionString: string): string {
  const endpointMatch = connectionString.match(/Endpoint=(https:\/\/[^;]+)/i);
  if (!endpointMatch) throw new Error('Invalid SignalR connection string');
  return endpointMatch[1]!;
}

export function createSignalRAccessToken(userId: string, hub = 'messages'): string | null {
  if (!config.signalrConnectionString) return null;
  const endpoint = parseSignalREndpoint(config.signalrConnectionString);
  const audience = `${endpoint}/client/?hub=${hub}`;
  const accessKeyMatch = config.signalrConnectionString.match(/AccessKey=([^;]+)/i);
  if (!accessKeyMatch) throw new Error('SignalR connection string missing AccessKey');
  const accessKey = accessKeyMatch[1]!;

  return jwt.sign(
    {
      aud: audience,
      sub: userId,
    },
    accessKey,
    { expiresIn: '1h', algorithm: 'HS256' },
  );
}

export function getSignalRClientUrl(hub = 'messages'): string | null {
  if (!config.signalrConnectionString) return null;
  const endpoint = parseSignalREndpoint(config.signalrConnectionString);
  return `${endpoint}/client/?hub=${hub}`;
}
