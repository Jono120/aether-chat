import type { Request } from 'express';

export const CLIENT_PLATFORM_HEADER = 'X-Aether-Client';

export type ClientPlatform = 'web' | 'native';

export function getClientPlatform(req: Request): ClientPlatform | null {
  const raw = req.headers[CLIENT_PLATFORM_HEADER.toLowerCase()];
  if (raw === 'web' || raw === 'native') return raw;
  return null;
}

export function assertAlbumUploadAllowed(req: Request, purpose: string): void {
  if (purpose === 'album' && getClientPlatform(req) === 'web') {
    const err = new Error('Album uploads require the mobile app');
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
}
