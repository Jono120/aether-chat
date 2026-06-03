import { randomBytes, scryptSync } from 'node:crypto';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { ensureProfileForUser } from './profiles.js';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** Local administrator used for full-access prototype / ops. */
export async function ensureAdministratorAccount(): Promise<void> {
  const entraOid = config.adminEntraOid;
  const email = config.adminEmail.toLowerCase();

  const user = await pool.query(
    `INSERT INTO users (entra_oid, is_admin)
     VALUES ($1, true)
     ON CONFLICT (entra_oid) DO UPDATE SET is_admin = true
     RETURNING id`,
    [entraOid],
  );
  const userId = user.rows[0].id;

  await pool.query(
    `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );
  await ensureProfileForUser(userId, entraOid);
  await pool.query(
    `UPDATE profiles SET display_name = $2, role_label = 'Administrator', updated_at = now()
     WHERE user_id = $1`,
    [userId, config.adminDisplayName],
  );

  await pool.query(
    `INSERT INTO local_accounts (user_id, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash`,
    [userId, email, hashPassword(config.adminPassword)],
  );

  await pool.query(`UPDATE users SET is_admin = true WHERE entra_oid = $1`, ['dev-user-1']);
}
