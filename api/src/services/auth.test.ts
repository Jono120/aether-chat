import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { loginLocalAccount, refreshSession, registerLocalAccount } from './auth.js';
import { AuthError } from '../utils/authError.js';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../utils/password.js';

type Call = { sql: string; params: unknown[] };

const poolCalls: Call[] = [];
const clientCalls: Call[] = [];
let released = false;
let clientQueryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
let poolQueryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function defaultClientQuery(sql: string): Promise<{ rows: unknown[]; rowCount: number }> {
  if (/INSERT INTO users/.test(sql)) {
    return Promise.resolve({
      rows: [{ id: 'user-1', entra_oid: 'local:abc', is_admin: false, status: 'active' }],
      rowCount: 1,
    });
  }
  if (/RETURNING id/.test(sql)) {
    return Promise.resolve({ rows: [{ id: randomUUID() }], rowCount: 1 });
  }
  return Promise.resolve({ rows: [], rowCount: 0 });
}

function defaultPoolQuery(): Promise<{ rows: unknown[]; rowCount: number }> {
  return Promise.resolve({ rows: [{ id: randomUUID(), is_admin: false }], rowCount: 1 });
}

function setupMocks() {
  poolCalls.length = 0;
  clientCalls.length = 0;
  released = false;
  clientQueryImpl = defaultClientQuery;
  poolQueryImpl = defaultPoolQuery;

  mock.method(pool, 'query', async (sql: string, params?: unknown[]) => {
    poolCalls.push({ sql: normalize(sql), params: params ?? [] });
    return poolQueryImpl(sql, params);
  });

  const client = {
    query: async (sql: string, params?: unknown[]) => {
      clientCalls.push({ sql: normalize(sql), params: params ?? [] });
      return clientQueryImpl(sql, params);
    },
    release: () => {
      released = true;
    },
  };
  mock.method(pool, 'connect', (async () => client) as never);
}

describe('registerLocalAccount', () => {
  beforeEach(setupMocks);

  it('runs every sign-up write inside one transaction on the same client', async () => {
    const session = await registerLocalAccount('new@example.com', 'password-123', 'New User');

    assert.equal(clientCalls[0]?.sql, 'BEGIN');
    const firstCommit = clientCalls.findIndex((c) => c.sql === 'COMMIT');
    assert.ok(firstCommit > 0, 'expected a COMMIT');
    for (const pattern of [
      /INSERT INTO users/,
      /INSERT INTO local_accounts/,
      /INSERT INTO user_preferences/,
      /INSERT INTO profiles/,
    ]) {
      const idx = clientCalls.findIndex((c) => pattern.test(c.sql));
      assert.ok(idx > 0 && idx < firstCommit, `expected ${pattern} inside the transaction`);
    }
    const usersInsert = clientCalls.find((c) => /INSERT INTO users/.test(c.sql));
    assert.match(
      usersInsert!.sql,
      /ON CONFLICT \(entra_oid\)/,
      'user bootstrap must be concurrency-safe',
    );
    const profileInsert = clientCalls.find((c) => /INSERT INTO profiles/.test(c.sql));
    assert.equal(profileInsert?.params[1], 'New User', 'profile insert carries the display name');
    assert.ok(released, 'client must be released');
    assert.equal(session.user.email, 'new@example.com');
    assert.equal(session.user.emailVerified, false);
  });

  it('rolls back and releases the client when a mid-flow write fails', async () => {
    clientQueryImpl = (sql) => {
      if (/INSERT INTO local_accounts/.test(sql)) {
        return Promise.reject(new Error('connection reset'));
      }
      return defaultClientQuery(sql);
    };

    await assert.rejects(
      registerLocalAccount('new@example.com', 'password-123', 'New User'),
      /connection reset/,
    );
    assert.ok(clientCalls.some((c) => c.sql === 'ROLLBACK'), 'expected ROLLBACK');
    assert.ok(!clientCalls.some((c) => c.sql === 'COMMIT'), 'must not COMMIT after failure');
    assert.ok(released, 'client must be released after failure');
  });

  it('maps a concurrent duplicate-email 23505 to a friendly 409 AuthError', async () => {
    clientQueryImpl = (sql) => {
      if (/INSERT INTO local_accounts/.test(sql)) {
        const err = new Error(
          'duplicate key value violates unique constraint "idx_local_accounts_email"',
        ) as Error & { code: string };
        err.code = '23505';
        return Promise.reject(err);
      }
      return defaultClientQuery(sql);
    };

    await assert.rejects(
      registerLocalAccount('raced@example.com', 'password-123', ''),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.status, 409);
        assert.equal(err.message, 'An account with this email already exists');
        return true;
      },
    );
    assert.ok(clientCalls.some((c) => c.sql === 'ROLLBACK'));
  });

  it('rejects passwords longer than 256 characters before doing any work', async () => {
    await assert.rejects(
      registerLocalAccount('big@example.com', 'x'.repeat(257), ''),
      (err: unknown) => err instanceof AuthError && /at most 256/.test(err.message),
    );
    assert.equal(clientCalls.length, 0);
    assert.equal(poolCalls.length, 0);
  });

  it('issues the verification token after the sign-up transaction commits', async () => {
    await registerLocalAccount('new@example.com', 'password-123', '');
    const firstCommit = clientCalls.findIndex((c) => c.sql === 'COMMIT');
    const tokenInsert = clientCalls.findIndex((c) =>
      /INSERT INTO email_verification_tokens/.test(c.sql),
    );
    assert.ok(tokenInsert >= 0, 'expected a verification token to be issued');
    assert.ok(tokenInsert > firstCommit, 'token issue must run after the sign-up commit');
  });
});

describe('loginLocalAccount', () => {
  beforeEach(setupMocks);

  const passwordHash = hashPassword('correct horse battery');

  function loginRow(status: string, emailVerifiedAt: string | null = null) {
    return {
      id: 'user-1',
      entra_oid: 'local:abc',
      status,
      email: 'user@example.com',
      password_hash: passwordHash,
      email_verified_at: emailVerifiedAt,
      display_name: 'User',
    };
  }

  it('no longer filters on active status in SQL and allows deletion_pending sign-in', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM local_accounts la/.test(sql)) {
        return Promise.resolve({ rows: [loginRow('deletion_pending')], rowCount: 1 });
      }
      return defaultPoolQuery();
    };

    const session = await loginLocalAccount('user@example.com', 'correct horse battery');
    assert.equal(session.user.id, 'local:abc');

    const select = poolCalls.find((c) => /FROM local_accounts la/.test(c.sql));
    assert.ok(select);
    assert.ok(!/status = 'active'/.test(select.sql), 'login query must not filter to active only');
  });

  it('rejects locked accounts with a 403 AuthError', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM local_accounts la/.test(sql)) {
        return Promise.resolve({ rows: [loginRow('locked')], rowCount: 1 });
      }
      return defaultPoolQuery();
    };

    await assert.rejects(
      loginLocalAccount('user@example.com', 'correct horse battery'),
      (err: unknown) => err instanceof AuthError && err.status === 403,
    );
  });

  it('fails with the generic message for unknown emails (dummy-hash timing path)', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM local_accounts la/.test(sql)) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return defaultPoolQuery();
    };

    await assert.rejects(
      loginLocalAccount('nobody@example.com', 'whatever-password'),
      /Email or password is incorrect/,
    );
    // The dummy hash is a real scrypt record so the verify path always runs
    const [salt, hash] = DUMMY_PASSWORD_HASH.split(':');
    assert.equal(salt?.length, 32);
    assert.equal(hash?.length, 128);
    assert.equal(verifyPassword('whatever-password', DUMMY_PASSWORD_HASH), false);
  });

  it('rejects oversized passwords without touching the database', async () => {
    await assert.rejects(
      loginLocalAccount('user@example.com', 'x'.repeat(100_000)),
      /Email or password is incorrect/,
    );
    assert.equal(poolCalls.length, 0);
  });

  it('reports emailVerified from local_accounts.email_verified_at', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM local_accounts la/.test(sql)) {
        return Promise.resolve({
          rows: [loginRow('active', '2026-06-01T00:00:00Z')],
          rowCount: 1,
        });
      }
      return defaultPoolQuery();
    };
    const session = await loginLocalAccount('user@example.com', 'correct horse battery');
    assert.equal(session.user.emailVerified, true);
  });
});

describe('refreshSession reuse detection', () => {
  beforeEach(setupMocks);

  const tokenId = randomUUID();
  const secret = randomBytes(32).toString('hex');

  function refreshRow(overrides: Record<string, unknown> = {}) {
    return {
      id: tokenId,
      user_id: 'user-1',
      token_hash: hashPassword(secret),
      revoked_at: null,
      not_expired: true,
      entra_oid: 'local:abc',
      status: 'active',
      ...overrides,
    };
  }

  it('revokes the whole token family when a revoked token is replayed', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM session_refresh_tokens rt/.test(sql)) {
        return Promise.resolve({
          rows: [refreshRow({ revoked_at: '2026-06-01T00:00:00Z' })],
          rowCount: 1,
        });
      }
      return defaultPoolQuery();
    };

    await assert.rejects(refreshSession(`${tokenId}.${secret}`), /Invalid refresh token/);

    const familyRevoke = poolCalls.find((c) =>
      /UPDATE session_refresh_tokens SET revoked_at = now\(\) WHERE user_id = \$1 AND revoked_at IS NULL/.test(
        c.sql,
      ),
    );
    assert.ok(familyRevoke, 'expected all active refresh tokens for the user to be revoked');
    assert.deepEqual(familyRevoke.params, ['user-1']);
  });

  it('does not revoke the family when the replayed secret is wrong', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM session_refresh_tokens rt/.test(sql)) {
        return Promise.resolve({
          rows: [refreshRow({ revoked_at: '2026-06-01T00:00:00Z' })],
          rowCount: 1,
        });
      }
      return defaultPoolQuery();
    };

    const wrongSecret = randomBytes(32).toString('hex');
    await assert.rejects(refreshSession(`${tokenId}.${wrongSecret}`), /Invalid refresh token/);
    assert.ok(
      !poolCalls.some((c) => /WHERE user_id = \$1 AND revoked_at IS NULL/.test(c.sql)),
      'a wrong secret is not proof of theft',
    );
  });

  it('rejects expired tokens', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM session_refresh_tokens rt/.test(sql)) {
        return Promise.resolve({ rows: [refreshRow({ not_expired: false })], rowCount: 1 });
      }
      return defaultPoolQuery();
    };
    await assert.rejects(refreshSession(`${tokenId}.${secret}`), /Invalid refresh token/);
  });

  it('rotates atomically: new-token insert and old-token revoke share one transaction', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM session_refresh_tokens rt/.test(sql)) {
        return Promise.resolve({ rows: [refreshRow()], rowCount: 1 });
      }
      if (/FROM users u\s+JOIN profiles p/.test(sql)) {
        return Promise.resolve({
          rows: [
            {
              id: 'user-1',
              entra_oid: 'local:abc',
              display_name: 'User',
              email: 'user@example.com',
              email_verified: true,
            },
          ],
          rowCount: 1,
        });
      }
      return defaultPoolQuery();
    };

    const session = await refreshSession(`${tokenId}.${secret}`);
    assert.ok(session.refreshToken);

    assert.equal(clientCalls[0]?.sql, 'BEGIN');
    assert.equal(clientCalls.at(-1)?.sql, 'COMMIT');
    const insertIdx = clientCalls.findIndex((c) =>
      /INSERT INTO session_refresh_tokens/.test(c.sql),
    );
    const revokeIdx = clientCalls.findIndex((c) =>
      /UPDATE session_refresh_tokens SET revoked_at = now\(\), replaced_by = \$2/.test(c.sql),
    );
    assert.ok(insertIdx > 0, 'expected the new token insert on the transaction client');
    assert.ok(revokeIdx > insertIdx, 'expected the revoke after the insert, same transaction');
    assert.deepEqual(clientCalls[revokeIdx].params[0], tokenId);
    assert.ok(released, 'client must be released');
  });

  it('does not revoke the old token when the new-token insert fails', async () => {
    poolQueryImpl = (sql) => {
      if (/FROM session_refresh_tokens rt/.test(sql)) {
        return Promise.resolve({ rows: [refreshRow()], rowCount: 1 });
      }
      if (/FROM users u\s+JOIN profiles p/.test(sql)) {
        return Promise.resolve({
          rows: [
            {
              id: 'user-1',
              entra_oid: 'local:abc',
              display_name: 'User',
              email: 'user@example.com',
              email_verified: true,
            },
          ],
          rowCount: 1,
        });
      }
      return defaultPoolQuery();
    };
    clientQueryImpl = (sql) => {
      if (/INSERT INTO session_refresh_tokens/.test(sql)) {
        return Promise.reject(new Error('connection reset'));
      }
      return defaultClientQuery(sql);
    };

    await assert.rejects(refreshSession(`${tokenId}.${secret}`), /connection reset/);
    assert.ok(clientCalls.some((c) => c.sql === 'ROLLBACK'), 'expected ROLLBACK');
    assert.ok(!clientCalls.some((c) => c.sql === 'COMMIT'), 'must not COMMIT after failure');
    assert.ok(released, 'client must be released after failure');
  });
});
