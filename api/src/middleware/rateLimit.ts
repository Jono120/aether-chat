import type { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

type RedisLike = ReturnType<typeof createClient>;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let redisClient: RedisLike | null = null;
let redisConnectPromise: Promise<RedisLike | null> | null = null;

function clientKey(req: Request): string {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.socket.remoteAddress ?? 'unknown';
}

async function getRedis(): Promise<RedisLike | null> {
  if (!config.redisUrl) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisConnectPromise = (async () => {
    try {
      const client = createClient({ url: config.redisUrl });
      client.on('error', (err) => {
        logger.warn('Redis rate limit client error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      await client.connect();
      redisClient = client;
      return client;
    } catch (err) {
      logger.warn('Redis rate limit unavailable; using in-memory fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
}

function inMemoryRateLimit(
  key: string,
  windowMs: number,
  max: number,
  res: Response,
): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Too many requests. Try again later.' });
    return false;
  }
  return true;
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  keyFn?: (req: Request) => string;
}) {
  const { windowMs, max, keyPrefix = '', keyFn } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}${keyFn ? keyFn(req) : clientKey(req)}`;

    try {
      const redis = await getRedis();
      if (redis) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.pExpire(key, windowMs);
        }
        if (count > max) {
          const ttlMs = await redis.pTTL(key);
          if (ttlMs > 0) {
            res.setHeader('Retry-After', String(Math.ceil(ttlMs / 1000)));
          }
          return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }
        return next();
      }
    } catch (err) {
      logger.warn('Redis rate limit check failed; falling back to in-memory', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!inMemoryRateLimit(key, windowMs, max, res)) return;
    return next();
  };
}

/** Baseline per-IP limit for all API routes when Redis is configured. */
export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  keyPrefix: 'global:',
});
