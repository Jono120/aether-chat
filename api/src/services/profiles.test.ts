import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool.js';
import { getProfileByEntraOid } from './profiles.js';

const calls: { sql: string; params: unknown[] }[] = [];

describe('getProfileByEntraOid visibility', () => {
  beforeEach(() => {
    calls.length = 0;
    mock.method(pool, 'query', async (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params: params ?? [] });
      return { rows: [], rowCount: 0 };
    });
  });

  it('scopes the lookup to the viewer and enforces block + discoverable checks', async () => {
    const result = await getProfileByEntraOid('peer-oid', 'viewer-id');
    assert.equal(result, null);

    assert.equal(calls.length, 1);
    const { sql, params } = calls[0];
    assert.deepEqual(params, ['peer-oid', 'viewer-id']);
    // Own profile always visible
    assert.match(sql, /p\.user_id = \$2/);
    // Blocks in either direction hide the profile
    assert.match(sql, /b\.blocker_user_id = \$2 AND b\.blocked_user_id = p\.user_id/);
    assert.match(sql, /b\.blocker_user_id = p\.user_id AND b\.blocked_user_id = \$2/);
    // Non-discoverable or non-active profiles need a shared conversation
    assert.match(sql, /p\.discoverable = true AND u\.status = 'active'/);
    assert.match(sql, /cm_viewer\.user_id = \$2 AND cm_target\.user_id = p\.user_id/);
  });
});
