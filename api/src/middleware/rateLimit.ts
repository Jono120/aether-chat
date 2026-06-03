import type { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.socket.remoteAddress ?? 'unknown';
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  keyFn?: (req: Request) => string;
}) {
  const { windowMs, max, keyPrefix = '', keyFn } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}${keyFn ? keyFn(req) : clientKey(req)}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    return next();
  };
}
