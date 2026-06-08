import { pool } from '../db/pool.js';

export const VALID_GENDERS = new Set([
  'male',
  'female',
  'non-binary',
  'trans-man',
  'trans-woman',
  'agender',
  'genderqueer',
  'prefer-not-to-say',
]);

export type ProfileDto = {
  id: string;
  username: string;
  age: number | null;
  gender: string | null;
  role: string;
  bio: string;
  fuzzedDistance: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: number;
  hasSecureAlbum: boolean;
  tags: string[];
  lookingFor: string[];
  publicKey?: string;
  avatarMediaId?: string | null;
};

export type MyProfileDto = ProfileDto & {
  discoverable: boolean;
  allowProfileMediaUpload: boolean;
  allowAlbumMediaUpload: boolean;
};

export type UpdateMyProfileInput = {
  displayName?: string;
  bio?: string;
  roleLabel?: string;
  age?: number | null;
  gender?: string | null;
  tags?: string[];
  lookingFor?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  hasSecureAlbum?: boolean;
  discoverable?: boolean;
  avatarMediaId?: string | null;
  allowProfileMediaUpload?: boolean;
  allowAlbumMediaUpload?: boolean;
};

function validateProfileInput(input: UpdateMyProfileInput): void {
  if (input.age !== undefined && input.age !== null) {
    if (!Number.isInteger(input.age) || input.age < 18) {
      throw new Error('Age must be 18 or older');
    }
  }
  if (input.gender !== undefined && input.gender !== null && !VALID_GENDERS.has(input.gender)) {
    throw new Error('Invalid gender');
  }
  if (input.lookingFor !== undefined) {
    if (!Array.isArray(input.lookingFor) || input.lookingFor.some((v) => typeof v !== 'string')) {
      throw new Error('Invalid lookingFor');
    }
  }
}

function rowToProfile(row: Record<string, unknown>, index: number): ProfileDto {
  const colors = (row.avatar_colors as { primary?: string; secondary?: string }) ?? {};
  return {
    id: row.entra_oid as string,
    username: row.display_name as string,
    age: row.age as number | null,
    gender: (row.gender as string | null) ?? null,
    role: row.role_label as string,
    bio: row.bio as string,
    fuzzedDistance: row.fuzzed_distance_label as string,
    primaryColor: colors.primary ?? '#7c3aed',
    secondaryColor: colors.secondary ?? '#db2777',
    pattern: (index % 4) + 1,
    hasSecureAlbum: row.has_secure_album as boolean,
    tags: (row.tags as string[]) ?? [],
    lookingFor: (row.looking_for as string[]) ?? [],
    publicKey: row.fingerprint as string | undefined,
    avatarMediaId: (row.avatar_media_id as string | null) ?? null,
  };
}

function rowToMyProfile(row: Record<string, unknown>): MyProfileDto {
  const base = rowToProfile(row, 0);
  return {
    ...base,
    discoverable: row.discoverable as boolean,
    allowProfileMediaUpload: row.allow_profile_media_upload as boolean,
    allowAlbumMediaUpload: row.allow_album_media_upload as boolean,
  };
}

const PROFILE_SELECT = `
  SELECT u.entra_oid, p.*, k.fingerprint,
         pref.allow_profile_media_upload, pref.allow_album_media_upload
  FROM profiles p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN user_preferences pref ON pref.user_id = p.user_id
  LEFT JOIN LATERAL (
    SELECT fingerprint FROM device_public_keys
    WHERE user_id = p.user_id AND revoked_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  ) k ON true
`;

export async function ensureProfileForUser(userId: string, entraOid: string): Promise<void> {
  const existing = await pool.query('SELECT 1 FROM profiles WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return;

  const displayName = entraOid.startsWith('seed-')
    ? entraOid.replace('seed-', '').replace(/^\w/, (c) => c.toUpperCase())
    : 'You';

  await pool.query(
    `INSERT INTO profiles (user_id, display_name, bio, role_label, age, fuzzed_distance_label, avatar_colors, tags, has_secure_album)
     VALUES ($1, $2, '', 'Say hello', NULL, 'Nearby', $3, '[]', false)`,
    [
      userId,
      displayName,
      JSON.stringify({ primary: '#7c3aed', secondary: '#db2777' }),
    ],
  );
}

export async function getMyProfile(userId: string, entraOid: string): Promise<MyProfileDto> {
  await ensureProfileForUser(userId, entraOid);
  const result = await pool.query(`${PROFILE_SELECT} WHERE p.user_id = $1`, [userId]);
  return rowToMyProfile(result.rows[0]);
}

export async function updateMyProfile(
  userId: string,
  entraOid: string,
  input: UpdateMyProfileInput,
): Promise<MyProfileDto> {
  await ensureProfileForUser(userId, entraOid);
  validateProfileInput(input);

  if (input.avatarMediaId) {
    const owned = await pool.query(
      'SELECT 1 FROM media_objects WHERE id = $1 AND owner_id = $2',
      [input.avatarMediaId, userId],
    );
    if (!owned.rows[0]) {
      throw new Error('Invalid avatar media');
    }
  }

  const colors =
    input.primaryColor || input.secondaryColor
      ? {
          primary: input.primaryColor ?? '#7c3aed',
          secondary: input.secondaryColor ?? '#db2777',
        }
      : null;

  await pool.query(
    `UPDATE profiles SET
       display_name = COALESCE($2, display_name),
       bio = COALESCE($3, bio),
       role_label = COALESCE($4, role_label),
       age = CASE WHEN $10 THEN $5 ELSE age END,
       gender = CASE WHEN $11 THEN $6 ELSE gender END,
       tags = COALESCE($7, tags),
       looking_for = COALESCE($8, looking_for),
       has_secure_album = COALESCE($9, has_secure_album),
       discoverable = COALESCE($12, discoverable),
       avatar_colors = COALESCE($13, avatar_colors),
       updated_at = now()
     WHERE user_id = $1`,
    [
      userId,
      input.displayName ?? null,
      input.bio ?? null,
      input.roleLabel ?? null,
      input.age !== undefined ? input.age : null,
      input.gender !== undefined ? input.gender : null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.lookingFor ? JSON.stringify(input.lookingFor) : null,
      input.hasSecureAlbum ?? null,
      input.age !== undefined,
      input.gender !== undefined,
      input.discoverable ?? null,
      colors ? JSON.stringify(colors) : null,
    ],
  );

  if (input.avatarMediaId !== undefined) {
    await pool.query('UPDATE profiles SET avatar_media_id = $2, updated_at = now() WHERE user_id = $1', [
      userId,
      input.avatarMediaId,
    ]);
  }

  if (
    input.allowProfileMediaUpload !== undefined ||
    input.allowAlbumMediaUpload !== undefined
  ) {
    await pool.query(
      `UPDATE user_preferences SET
         allow_profile_media_upload = COALESCE($2, allow_profile_media_upload),
         allow_album_media_upload = COALESCE($3, allow_album_media_upload)
       WHERE user_id = $1`,
      [
        userId,
        input.allowProfileMediaUpload ?? null,
        input.allowAlbumMediaUpload ?? null,
      ],
    );
  }

  return getMyProfile(userId, entraOid);
}

export async function listNearbyProfiles(excludeUserId: string): Promise<ProfileDto[]> {
  const result = await pool.query(
    `${PROFILE_SELECT}
     WHERE p.discoverable = true
       AND p.user_id != $1
       AND u.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks b
         WHERE (b.blocker_user_id = $1 AND b.blocked_user_id = p.user_id)
            OR (b.blocker_user_id = p.user_id AND b.blocked_user_id = $1)
       )
     ORDER BY p.display_name`,
    [excludeUserId],
  );
  return result.rows.map((row, i) => rowToProfile(row, i));
}

export async function getProfileByEntraOid(entraOid: string): Promise<ProfileDto | null> {
  const result = await pool.query(`${PROFILE_SELECT} WHERE u.entra_oid = $1`, [entraOid]);
  if (!result.rows[0]) return null;
  return rowToProfile(result.rows[0], 0);
}
