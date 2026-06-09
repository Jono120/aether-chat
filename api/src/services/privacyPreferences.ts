import { pool } from '../db/pool.js';

export const VALID_FUZZING_STRATEGIES = new Set(['grid_snap', 'jitter', 'distance_only']);

export type PrivacyPreferencesDto = {
  fuzzingStrategy: string;
  albumShieldEnabled: boolean;
};

const DEFAULT_PRIVACY_PREFS: PrivacyPreferencesDto = {
  fuzzingStrategy: 'grid_snap',
  albumShieldEnabled: true,
};

function normalizePrivacyPrefs(row: Record<string, unknown> | undefined): PrivacyPreferencesDto {
  const strategy = row?.fuzzing_strategy as string | undefined;
  return {
    fuzzingStrategy:
      strategy && VALID_FUZZING_STRATEGIES.has(strategy) ? strategy : DEFAULT_PRIVACY_PREFS.fuzzingStrategy,
    albumShieldEnabled: row?.album_shield_enabled !== false,
  };
}

export async function getPrivacyPreferences(userId: string): Promise<PrivacyPreferencesDto> {
  const result = await pool.query(
    'SELECT fuzzing_strategy, album_shield_enabled FROM user_preferences WHERE user_id = $1',
    [userId],
  );
  return normalizePrivacyPrefs(result.rows[0]);
}

export async function patchPrivacyPreferences(
  userId: string,
  input: Partial<PrivacyPreferencesDto>,
): Promise<PrivacyPreferencesDto> {
  const current = await getPrivacyPreferences(userId);

  if (input.fuzzingStrategy === undefined && input.albumShieldEnabled === undefined) {
    return current;
  }

  const next: PrivacyPreferencesDto = {
    fuzzingStrategy:
      input.fuzzingStrategy !== undefined ? input.fuzzingStrategy : current.fuzzingStrategy,
    albumShieldEnabled:
      input.albumShieldEnabled !== undefined ? input.albumShieldEnabled : current.albumShieldEnabled,
  };

  if (!VALID_FUZZING_STRATEGIES.has(next.fuzzingStrategy)) {
    throw new Error('Invalid fuzzing strategy');
  }
  if (typeof next.albumShieldEnabled !== 'boolean') {
    throw new Error('Invalid album shield preference');
  }

  await pool.query(
    `INSERT INTO user_preferences (user_id, fuzzing_strategy, album_shield_enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       fuzzing_strategy = EXCLUDED.fuzzing_strategy,
       album_shield_enabled = EXCLUDED.album_shield_enabled`,
    [userId, next.fuzzingStrategy, next.albumShieldEnabled],
  );

  return getPrivacyPreferences(userId);
}
