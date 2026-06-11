import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool.js';
import { lockAccountPanic, purgeUserAccount } from './account.js';

type Call = { sql: string; params: unknown[] };

const calls: Call[] = [];
let released = false;
let queryImpl: (sql: string) => Promise<{ rows: unknown[]; rowCount: number }>;

// Both pool and transaction-client queries record into the same ordered list
function mockQuery() {
  calls.length = 0;
  released = false;
  queryImpl = async () => ({ rows: [], rowCount: 0 });

  const record = async (sql: string, params?: unknown[]) => {
    calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params: params ?? [] });
    return queryImpl(sql);
  };
  mock.method(pool, 'query', record);
  mock.method(
    pool,
    'connect',
    (async () => ({
      query: record,
      release: () => {
        released = true;
      },
    })) as never,
  );
}

function findCall(pattern: RegExp): Call | undefined {
  return calls.find((c) => pattern.test(c.sql));
}

describe('purgeUserAccount', () => {
  beforeEach(() => mockQuery());

  it('deletes credentials and identities (GDPR Art. 17)', async () => {
    await purgeUserAccount('user-1');

    for (const table of [
      'local_accounts',
      'oauth_identities',
      'password_reset_tokens',
      'session_refresh_tokens',
    ]) {
      const call = findCall(new RegExp(`DELETE FROM ${table}`));
      assert.ok(call, `expected DELETE FROM ${table}`);
      assert.deepEqual(call.params, ['user-1']);
    }
  });

  it('deletes error reports instead of leaving them orphaned', async () => {
    await purgeUserAccount('user-1');
    const call = findCall(/DELETE FROM error_reports/);
    assert.ok(call, 'expected DELETE FROM error_reports');
    assert.deepEqual(call.params, ['user-1']);
  });

  it('purges all messages in conversations the user participated in', async () => {
    await purgeUserAccount('user-1');
    const call = findCall(/DELETE FROM messages/);
    assert.ok(call, 'expected DELETE FROM messages');
    assert.match(call.sql, /sender_user_id = \$1/);
    assert.match(call.sql, /conversation_id IN \( SELECT conversation_id FROM conversation_members WHERE user_id = \$1 \)/);
  });

  it('deletes profile, preferences, keys, memberships, media, blocks, receipts', async () => {
    await purgeUserAccount('user-1');
    for (const table of [
      'profiles',
      'user_preferences',
      'device_public_keys',
      'conversation_members',
      'media_objects',
      'user_blocks',
      'message_receipts',
    ]) {
      assert.ok(findCall(new RegExp(`DELETE FROM ${table}`)), `expected DELETE FROM ${table}`);
    }
  });

  it('scrubs the users row in place (anonymized oid, purged status, no admin)', async () => {
    await purgeUserAccount('user-1');
    const call = findCall(/UPDATE users/);
    assert.ok(call, 'expected UPDATE users');
    assert.match(call.sql, /entra_oid = 'purged:' \|\| id::text/);
    assert.match(call.sql, /is_admin = false/);
    assert.match(call.sql, /status = 'purged'/);
    assert.match(call.sql, /purged_at = now\(\)/);
    assert.deepEqual(call.params, ['user-1']);
  });

  it('runs message deletion before membership deletion so the conversation scan still works', async () => {
    await purgeUserAccount('user-1');
    const messagesIdx = calls.findIndex((c) => /DELETE FROM messages/.test(c.sql));
    const membersIdx = calls.findIndex((c) => /DELETE FROM conversation_members/.test(c.sql));
    assert.ok(messagesIdx >= 0 && membersIdx >= 0);
    assert.ok(messagesIdx < membersIdx, 'messages must be purged before memberships');
  });

  it('runs the whole erasure inside one transaction', async () => {
    await purgeUserAccount('user-1');
    assert.equal(calls[0]?.sql, 'BEGIN');
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
    assert.ok(released, 'client must be released');
  });

  it('rolls back everything when a mid-flow delete fails (erasure is all-or-nothing)', async () => {
    queryImpl = async (sql) => {
      if (/DELETE FROM oauth_identities/.test(sql)) {
        throw new Error('connection reset');
      }
      return { rows: [], rowCount: 0 };
    };

    await assert.rejects(purgeUserAccount('user-1'), /connection reset/);
    assert.ok(calls.some((c) => c.sql === 'ROLLBACK'), 'expected ROLLBACK');
    assert.ok(!calls.some((c) => c.sql === 'COMMIT'), 'must not COMMIT after failure');
    assert.ok(
      !calls.some((c) => /UPDATE users/.test(c.sql) && /purged/.test(c.sql)),
      'must not scrub the users row after a failed delete',
    );
    assert.ok(released, 'client must be released after failure');
  });
});

describe('lockAccountPanic', () => {
  beforeEach(() => mockQuery());

  it('revokes refresh tokens and locks the account', async () => {
    await lockAccountPanic('user-1');
    assert.ok(findCall(/DELETE FROM session_refresh_tokens/));
    const lock = findCall(/UPDATE users SET status = 'locked'/);
    assert.ok(lock);
    assert.deepEqual(lock.params, ['user-1']);
  });

  it('applies key revocation, token deletion, and the lock in one transaction', async () => {
    await lockAccountPanic('user-1');
    assert.equal(calls[0]?.sql, 'BEGIN');
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
    assert.ok(released, 'client must be released');
  });
});
