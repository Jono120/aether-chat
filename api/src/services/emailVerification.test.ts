import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { verifyEmailWithToken } from './emailVerification.js';
import { AuthError } from '../utils/authError.js';
import { hashPassword } from '../utils/password.js';

type Call = { sql: string; params: unknown[] };

const calls: Call[] = [];
let selectRows: unknown[] = [];

describe('verifyEmailWithToken', () => {
  const tokenId = randomUUID();
  const secret = randomBytes(32).toString('hex');

  beforeEach(() => {
    calls.length = 0;
    selectRows = [];
    // verifyEmailWithToken runs in a transaction; pool and client queries
    // record into the same ordered list
    const record = async (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params: params ?? [] });
      if (/SELECT/.test(sql)) return { rows: selectRows, rowCount: selectRows.length };
      return { rows: [], rowCount: 0 };
    };
    mock.method(pool, 'query', record);
    mock.method(pool, 'connect', (async () => ({ query: record, release: () => {} })) as never);
  });

  it('marks the local account verified and consumes outstanding tokens', async () => {
    selectRows = [{ user_id: 'user-1', token_hash: hashPassword(secret) }];

    await verifyEmailWithToken(`${tokenId}.${secret}`);

    const verifyUpdate = calls.find((c) =>
      /UPDATE local_accounts SET email_verified_at = COALESCE\(email_verified_at, now\(\)\)/.test(c.sql),
    );
    assert.ok(verifyUpdate, 'expected local_accounts.email_verified_at to be set');
    assert.deepEqual(verifyUpdate.params, ['user-1']);

    const consume = calls.find((c) =>
      /UPDATE email_verification_tokens SET used_at = now\(\)/.test(c.sql),
    );
    assert.ok(consume, 'expected outstanding verification tokens to be consumed');
    assert.deepEqual(consume.params, ['user-1']);
  });

  it('only accepts unused, unexpired tokens', async () => {
    selectRows = [{ user_id: 'user-1', token_hash: hashPassword(secret) }];
    await verifyEmailWithToken(`${tokenId}.${secret}`);
    const select = calls.find((c) => /FROM email_verification_tokens/.test(c.sql));
    assert.ok(select);
    assert.match(select.sql, /used_at IS NULL/);
    assert.match(select.sql, /expires_at > now\(\)/);
  });

  it('rejects expired or unknown tokens with a generic AuthError', async () => {
    selectRows = [];
    await assert.rejects(
      verifyEmailWithToken(`${tokenId}.${secret}`),
      (err: unknown) =>
        err instanceof AuthError && /invalid or has expired/.test(err.message),
    );
    assert.ok(!calls.some((c) => /UPDATE local_accounts/.test(c.sql)));
  });

  it('rejects tokens whose secret does not match the stored hash', async () => {
    selectRows = [
      { user_id: 'user-1', token_hash: hashPassword(randomBytes(32).toString('hex')) },
    ];
    await assert.rejects(verifyEmailWithToken(`${tokenId}.${secret}`), AuthError);
    assert.ok(!calls.some((c) => /UPDATE local_accounts/.test(c.sql)));
  });

  it('rejects malformed tokens without touching the database', async () => {
    await assert.rejects(verifyEmailWithToken('not-a-token'), AuthError);
    assert.equal(calls.length, 0);
  });

  it('consumes the token and sets verified-at inside the same transaction', async () => {
    selectRows = [{ user_id: 'user-1', token_hash: hashPassword(secret) }];
    await verifyEmailWithToken(`${tokenId}.${secret}`);

    const begin = calls.findIndex((c) => c.sql === 'BEGIN');
    const commit = calls.findIndex((c) => c.sql === 'COMMIT');
    const consume = calls.findIndex((c) =>
      /UPDATE email_verification_tokens SET used_at = now\(\)/.test(c.sql),
    );
    const verify = calls.findIndex((c) => /UPDATE local_accounts/.test(c.sql));
    assert.ok(begin >= 0 && commit > begin, 'expected a BEGIN/COMMIT pair');
    assert.ok(consume > begin && consume < commit, 'token consume must be inside the transaction');
    assert.ok(verify > begin && verify < commit, 'verified-at update must be inside the transaction');
  });
});
