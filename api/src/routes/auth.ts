import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getAuthPublicConfig,
  loginLocalAccount,
  loginWithApple,
  loginWithGoogle,
  mockOAuthLogin,
  registerLocalAccount,
} from '../services/auth.js';
import {
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyAccountPassword,
} from '../services/passwordReset.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'auth:' });

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
    const message = err instanceof Error ? err.message : 'Registration failed';
    const status = message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: message });
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
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
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
    const message = err instanceof Error ? err.message : 'Google sign-in failed';
    res.status(401).json({ error: message });
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
    const message = err instanceof Error ? err.message : 'Apple sign-in failed';
    res.status(401).json({ error: message });
  }
});

authRouter.post('/forgot-password', authRateLimit, async (req, res) => {
  try {
    const email = req.body?.email;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const result = await requestPasswordReset(email);
    res.json({
      ok: true,
      message: 'If an account exists for that email, reset instructions were sent.',
      ...(config.devAuthBypass && result.devToken ? { devResetToken: result.devToken } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    res.status(400).json({ error: message });
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
    const message = err instanceof Error ? err.message : 'Reset failed';
    res.status(400).json({ error: message });
  }
});

authRouter.post('/verify-password', requireAuth, async (req, res) => {
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
    const message = err instanceof Error ? err.message : 'Password change failed';
    res.status(400).json({ error: message });
  }
});

authRouter.post('/oauth/mock', async (req, res) => {
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
    const message = err instanceof Error ? err.message : 'Demo sign-in failed';
    res.status(400).json({ error: message });
  }
});
