import { pool } from '../db/pool.js';

export type ProfileDto = {
  id: string;
  username: string;
  age: number | null;
  role: string;
  bio: string;
  fuzzedDistance: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: number;
  hasSecureAlbum: boolean;
  tags: string[];
  publicKey?: string;
};

function rowToProfile(row: Record<string, unknown>, index: number): ProfileDto {
  const colors = (row.avatar_colors as { primary?: string; secondary?: string }) ?? {};
  return {
    id: row.entra_oid as string,
    username: row.display_name as string,
    age: row.age as number | null,
    role: row.role_label as string,
    bio: row.bio as string,
    fuzzedDistance: row.fuzzed_distance_label as string,
    primaryColor: colors.primary ?? '#7c3aed',
    secondaryColor: colors.secondary ?? '#db2777',
    pattern: (index % 4) + 1,
    hasSecureAlbum: row.has_secure_album as boolean,
    tags: (row.tags as string[]) ?? [],
    publicKey: row.fingerprint as string | undefined,
  };
}

export async function listNearbyProfiles(excludeUserId: string): Promise<ProfileDto[]> {
  const result = await pool.query(
    `SELECT u.entra_oid, p.*, k.fingerprint
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN LATERAL (
       SELECT fingerprint FROM device_public_keys
       WHERE user_id = p.user_id AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 1
     ) k ON true
     WHERE p.discoverable = true AND p.user_id != $1 AND u.status = 'active'
     ORDER BY p.display_name`,
    [excludeUserId],
  );
  return result.rows.map((row, i) => rowToProfile(row, i));
}

export async function getProfileByEntraOid(entraOid: string): Promise<ProfileDto | null> {
  const result = await pool.query(
    `SELECT u.entra_oid, p.*, k.fingerprint
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN LATERAL (
       SELECT fingerprint FROM device_public_keys
       WHERE user_id = p.user_id AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 1
     ) k ON true
     WHERE u.entra_oid = $1`,
    [entraOid],
  );
  if (!result.rows[0]) return null;
  return rowToProfile(result.rows[0], 0);
}
