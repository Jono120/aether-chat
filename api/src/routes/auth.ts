import { Router, type Request, type Response } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getAuthPublicConfig,
  loginLocalAccount,
  loginWithApple,
  loginWithGoogle,
  mockOAuthLogin,
  refreshSession,
  registerLocalAccount,
  revokeRefreshToken,
} from '../services/auth.js';
import {
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyAccountPassword,
} from '../services/passwordReset.js';
import {
  resendEmailVerification,
  verifyEmailWithToken,
} from '../services/emailVerification.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { AuthError } from '../utils/authError.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'auth:' });
// Tighter budget for outbound verification email sends
const resendVerificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'auth-resend:',
});

/**
 * AuthError carries an intentional user-facing message and status. Anything
 * else (pg/driver/library errors) is logged server-side and replaced with a
 * generic message so internal details never reach the client.
 */
function respondAuthError(
  req: Request,
  res: Response,
  err: unknown,
  fallbackMessage: string,
  fallbackStatus: number,
): void {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  logger.error('Auth route error', {
    requestId: req.requestId,
    error: err instanceof Error ? err.message : String(err),
  });
  res.status(fallbackStatus).json({ error: fallbackMessage });
}

authRouter.get('/config', (_req, res) => {
  res.json(getAuthPublicConfig());
});

authRouter.post('/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const session = await registerLocalAccount(email, password, displayName ?? '');
    res.status(201).json(session);
  } catch (err) {
    respondAuthError(req, res, err, 'Registration failed', 500);
  }
});

authRouter.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const session = await loginLocalAccount(email, password);
    res.json(session);
  } catch (err) {
    respondAuthError(req, res, err, 'Login failed', 500);
  }
});

authRouter.post('/oauth/google', authRateLimit, async (req, res) => {
  try {
    const { credential } = req.body ?? {};
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }
    const session = await loginWithGoogle(credential);
    res.json(session);
  } catch (err) {
    respondAuthError(req, res, err, 'Google sign-in failed', 401);
  }
});

authRouter.post('/oauth/apple', authRateLimit, async (req, res) => {
  try {
    const { idToken, displayName } = req.body ?? {};
    if (!idToken) {
      return res.status(400).json({ error: 'Apple identity token is required' });
    }
    const session = await loginWithApple(idToken, displayName);
    res.json(session);
  } catch (err) {
    respondAuthError(req, res, err, 'Apple sign-in failed', 401);
  }
});

authRouter.post('/refresh', authRateLimit, async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    const session = await refreshSession(refreshToken);
    res.json(session);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

authRouter.post('/logout', authRateLimit, async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ ok: true });
});

authRouter.post('/forgot-password', authRateLimit, async (req, res) => {
  try {
    const email = req.body?.email;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await requestPasswordReset(email);
    res.json({
      ok: true,
      message: 'If an account exists for that email, reset instructions were sent.',
    });
  } catch (err) {
    respondAuthError(req, res, err, 'Request failed', 500);
  }
});

authRouter.post('/reset-password', authRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    await resetPasswordWithToken(token, newPassword);
    res.json({ ok: true });
  } catch (err) {
    respondAuthError(req, res, err, 'Reset failed', 400);
  }
});

// Token arrives in the request body (from the URL fragment client-side), never
// in a query string where it could land in logs or Referer headers.
authRouter.post('/verify-email', authRateLimit, async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });
    await verifyEmailWithToken(token);
    res.json({ ok: true });
  } catch (err) {
    respondAuthError(req, res, err, 'Verification failed', 400);
  }
});

authRouter.post(
  '/resend-verification',
  requireAuth,
  resendVerificationRateLimit,
  async (req, res) => {
    try {
      const { alreadyVerified } = await resendEmailVerification(req.authUser!.id);
      res.json({ ok: true, alreadyVerified });
    } catch (err) {
      respondAuthError(req, res, err, 'Could not send verification email', 500);
    }
  },
);

// Rate-limited: with requireAuth alone this is a password-guessing oracle for
// an attacker holding a stolen access token.
authRouter.post('/verify-password', requireAuth, authRateLimit, async (req, res) => {
  const password = req.body?.password;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  const valid = await verifyAccountPassword(req.authUser!.id, password);
  res.json({ valid });
});

authRouter.patch('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    await changePassword(req.authUser!.id, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    respondAuthError(req, res, err, 'Password change failed', 500);
  }
});

authRouter.post('/oauth/mock', authRateLimit, async (req, res) => {
  if (!config.devAuthBypass) {
    return res.status(403).json({ error: 'Demo sign-in is disabled' });
  }
  try {
    const provider = req.body?.provider;
    if (provider !== 'google' && provider !== 'apple') {
      return res.status(400).json({ error: 'provider must be google or apple' });
    }
    const session = await mockOAuthLogin(provider);
    res.json(session);
  } catch (err) {
    respondAuthError(req, res, err, 'Demo sign-in failed', 400);
  }
});
