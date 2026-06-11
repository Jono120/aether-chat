import { config } from '../config.js';
import { withTransaction } from '../db/pool.js';
import { hashPassword } from '../utils/password.js';
import { provisionUser } from './userProvisioning.js';

/** Local administrator used for full-access prototype / ops. */
export async function ensureAdministratorAccount(): Promise<void> {
  const entraOid = config.adminEntraOid;
  const email = config.adminEmail.toLowerCase();
  const passwordHash = hashPassword(config.adminPassword);

  // Whole bootstrap commits as one unit so a partial run can't leave an
  // admin user without credentials.
  await withTransaction(async (client) => {
    const user = await provisionUser(client, {
      entraOid,
      displayName: config.adminDisplayName,
      isAdmin: true,
    });

    await client.query(
      `UPDATE profiles SET role_label = 'Administrator', updated_at = now()
       WHERE user_id = $1`,
      [user.id],
    );

    // Operator-provisioned account: treat the configured email as verified
    await client.query(
      `INSERT INTO local_accounts (user_id, email, password_hash, email_verified_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         email_verified_at = COALESCE(local_accounts.email_verified_at, now())`,
      [user.id, email, passwordHash],
    );

    await client.query(`UPDATE users SET is_admin = true WHERE entra_oid = $1`, ['dev-user-1']);
  });
}
