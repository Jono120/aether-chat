import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authRouter } from './auth.js';

type RouteLayer = {
  route?: { path: string; stack: unknown[]; methods: Record<string, boolean> };
};

function findRoute(path: string, method: string) {
  const layer = (authRouter.stack as RouteLayer[]).find(
    (l) => l.route?.path === path && l.route.methods[method],
  );
  assert.ok(layer?.route, `expected ${method.toUpperCase()} ${path} to be registered`);
  return layer.route;
}

describe('auth route hardening', () => {
  it('rate limits POST /verify-password in addition to requireAuth', () => {
    const route = findRoute('/verify-password', 'post');
    // requireAuth + rate limit + handler
    assert.ok(
      route.stack.length >= 3,
      `expected at least 3 handlers on /verify-password, got ${route.stack.length}`,
    );
  });

  it('registers POST /verify-email with a rate limit', () => {
    const route = findRoute('/verify-email', 'post');
    assert.ok(route.stack.length >= 2, 'expected rate limit + handler');
  });

  it('registers POST /resend-verification behind auth and a rate limit', () => {
    const route = findRoute('/resend-verification', 'post');
    assert.ok(
      route.stack.length >= 3,
      `expected requireAuth + rate limit + handler, got ${route.stack.length}`,
    );
  });
});
