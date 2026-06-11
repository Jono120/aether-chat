import type { Queryable } from '../db/pool.js';
import { ensureProfileForUser } from './profiles.js';

export type ProvisionUserInput = {
  entraOid: string;
  displayName?: string;
  isAdmin?: boolean;
};

export type ProvisionedUser = {
  id: string;
  entraOid: string;
  isAdmin: boolean;
  status: string;
};

/**
 * Idempotent user bootstrap shared by local registration, OAuth first
 * sign-in, middleware auto-provision, the admin bootstrap, and the seed
 * script: upsert the users row, default preferences, and a profile.
 *
 * The users insert uses ON CONFLICT (entra_oid) so two concurrent first
 * requests for the same identity both succeed (no TOCTOU 500). `isAdmin`
 * can only grant admin, never revoke it.
 *
 * Callers with additional writes should pass a transaction client.
 */
export async function provisionUser(
  db: Queryable,
  { entraOid, displayName, isAdmin = false }: ProvisionUserInput,
): Promise<ProvisionedUser> {
  const user = await db.query(
    `INSERT INTO users (entra_oid, is_admin) VALUES ($1, $2)
     ON CONFLICT (entra_oid) DO UPDATE SET is_admin = users.is_admin OR EXCLUDED.is_admin
     RETURNING id, entra_oid, is_admin, status`,
    [entraOid, isAdmin],
  );
  const row = user.rows[0];

  await db.query('INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    row.id,
  ]);
  await ensureProfileForUser(row.id, entraOid, db, displayName);

  return {
    id: row.id,
    entraOid: row.entra_oid,
    isAdmin: Boolean(row.is_admin),
    status: row.status,
  };
}
