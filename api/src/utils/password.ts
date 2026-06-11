import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthError } from './authError.js';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

/** Hard cap applied before any scrypt work — scrypt cost scales with input length. */
export const MAX_PASSWORD_LENGTH = 256;

export function assertValidNewPassword(password: string): void {
  if (typeof password !== 'string' || password.length < 8) {
    throw new AuthError('Password must be at least 8 characters');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new AuthError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

/** Async scrypt variant for request paths so hashing does not block the event loop. */
export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPasswordAsync(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = await scrypt(password, salt, 64);
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
  } catch {
    return false;
  }
}

/**
 * Hash of a random throwaway secret, used to equalize login timing when the
 * email has no account: scrypt always runs, so an unknown email is
 * indistinguishable from a wrong password.
 */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(32).toString('hex'));
