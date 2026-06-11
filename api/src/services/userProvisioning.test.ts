import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool.js';
import { provisionUser } from './userProvisioning.js';

type Call = { sql: string; params: unknown[] };

const calls: Call[] = [];
let profileExists = false;

describe('provisionUser', () => {
  beforeEach(() => {
    calls.length = 0;
    profileExists = false;
    mock.method(pool, 'query', async (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params: params ?? [] });
      if (/INSERT INTO users/.test(sql)) {
        return {
          rows: [{ id: 'user-1', entra_oid: params?.[0], is_admin: params?.[1], status: 'active' }],
          rowCount: 1,
        };
      }
      if (/SELECT 1 FROM profiles/.test(sql)) {
        return { rows: profileExists ? [{ '?column?': 1 }] : [], rowCount: profileExists ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('upserts the users row so concurrent first requests cannot 500 (TOCTOU)', async () => {
    const user = await provisionUser(pool, { entraOid: 'oidc-user' });

    const insert = calls.find((c) => /INSERT INTO users/.test(c.sql));
    assert.ok(insert, 'expected an INSERT INTO users');
    assert.match(insert.sql, /ON CONFLICT \(entra_oid\) DO UPDATE/);
    assert.match(insert.sql, /RETURNING id, entra_oid, is_admin, status/);
    assert.equal(user.id, 'user-1');
    assert.equal(user.entraOid, 'oidc-user');
    assert.equal(user.status, 'active');
  });

  it('never demotes an existing admin when provisioning without isAdmin', async () => {
    await provisionUser(pool, { entraOid: 'oidc-user' });
    const insert = calls.find((c) => /INSERT INTO users/.test(c.sql));
    assert.ok(insert);
    assert.match(insert.sql, /is_admin = users\.is_admin OR EXCLUDED\.is_admin/);
    assert.deepEqual(insert.params, ['oidc-user', false]);
  });

  it('creates default preferences and a profile carrying the display name', async () => {
    await provisionUser(pool, { entraOid: 'local:1', displayName: 'New User' });

    assert.ok(
      calls.some((c) => /INSERT INTO user_preferences/.test(c.sql)),
      'expected default preferences',
    );
    const profile = calls.find((c) => /INSERT INTO profiles/.test(c.sql));
    assert.ok(profile, 'expected a profile insert');
    assert.equal(profile.params[1], 'New User');
  });

  it('updates the display name when the profile already exists', async () => {
    profileExists = true;
    await provisionUser(pool, { entraOid: 'local:1', displayName: 'Renamed' });

    assert.ok(!calls.some((c) => /INSERT INTO profiles/.test(c.sql)));
    const update = calls.find((c) => /UPDATE profiles SET display_name/.test(c.sql));
    assert.ok(update, 'expected a display-name update');
    assert.deepEqual(update.params, ['user-1', 'Renamed']);
  });
});
