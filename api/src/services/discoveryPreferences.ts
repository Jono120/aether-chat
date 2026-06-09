import { pool } from '../db/pool.js';
import { VALID_GENDERS } from './profiles.js';

export type DiscoveryFilters = {
  ageMin?: number | null;
  ageMax?: number | null;
  genders?: string[];
  interests?: string[];
  interestMatch?: 'any' | 'all';
};

export type ProfileViewPrefs = {
  showAge?: boolean;
  showGender?: boolean;
  showInterests?: boolean;
  showLookingFor?: boolean;
};

export type DiscoveryPreferencesDto = {
  discoveryFilters: DiscoveryFilters;
  profileViewPrefs: ProfileViewPrefs;
};

const DEFAULT_FILTERS: DiscoveryFilters = {};
const DEFAULT_VIEW_PREFS: ProfileViewPrefs = {
  showAge: true,
  showGender: true,
  showInterests: true,
  showLookingFor: true,
};

export function normalizeDiscoveryFilters(raw: unknown): DiscoveryFilters {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FILTERS };
  const obj = raw as Record<string, unknown>;
  const ageMinRaw = obj.ageMin != null ? Number(obj.ageMin) : null;
  const ageMaxRaw = obj.ageMax != null ? Number(obj.ageMax) : null;
  const genders = Array.isArray(obj.genders)
    ? obj.genders.filter((g): g is string => typeof g === 'string')
    : [];
  const interests = Array.isArray(obj.interests)
    ? obj.interests.filter((i): i is string => typeof i === 'string')
    : [];
  const interestMatch = obj.interestMatch === 'all' ? 'all' : 'any';
  const ageMin = Number.isFinite(ageMinRaw) ? ageMinRaw : null;
  let ageMax = Number.isFinite(ageMaxRaw) ? ageMaxRaw : null;
  if (ageMin != null && ageMax != null && ageMax < ageMin) {
    ageMax = ageMin;
  }
  return {
    ageMin,
    ageMax,
    genders,
    interests,
    interestMatch,
  };
}

function normalizeViewPrefs(raw: unknown): ProfileViewPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_VIEW_PREFS };
  const obj = raw as Record<string, unknown>;
  return {
    showAge: obj.showAge !== false,
    showGender: obj.showGender !== false,
    showInterests: obj.showInterests !== false,
    showLookingFor: obj.showLookingFor !== false,
  };
}

function validateDiscoveryFilters(filters: DiscoveryFilters): void {
  if (filters.ageMin != null) {
    if (!Number.isInteger(filters.ageMin) || filters.ageMin < 18) {
      throw new Error('ageMin must be 18 or older');
    }
  }
  if (filters.ageMax != null) {
    if (!Number.isInteger(filters.ageMax) || filters.ageMax < 18) {
      throw new Error('ageMax must be 18 or older');
    }
  }
  if (
    filters.ageMin != null &&
    filters.ageMax != null &&
    filters.ageMin > filters.ageMax
  ) {
    throw new Error('ageMin must be less than or equal to ageMax');
  }
  if (filters.genders?.some((g) => !VALID_GENDERS.has(g))) {
    throw new Error('Invalid gender in discovery filters');
  }
  if (filters.interests?.some((i) => typeof i !== 'string')) {
    throw new Error('Invalid interests in discovery filters');
  }
  if (filters.interestMatch && !['any', 'all'].includes(filters.interestMatch)) {
    throw new Error('interestMatch must be any or all');
  }
}

function validateViewPrefs(prefs: ProfileViewPrefs): void {
  for (const key of ['showAge', 'showGender', 'showInterests', 'showLookingFor'] as const) {
    if (prefs[key] !== undefined && typeof prefs[key] !== 'boolean') {
      throw new Error(`Invalid profile view preference: ${key}`);
    }
  }
}

export async function getDiscoveryPreferences(userId: string): Promise<DiscoveryPreferencesDto> {
  const result = await pool.query(
    'SELECT discovery_filters, profile_view_prefs FROM user_preferences WHERE user_id = $1',
    [userId],
  );
  const row = result.rows[0];
  return {
    discoveryFilters: normalizeDiscoveryFilters(row?.discovery_filters),
    profileViewPrefs: normalizeViewPrefs(row?.profile_view_prefs),
  };
}

export async function patchDiscoveryPreferences(
  userId: string,
  input: {
    discoveryFilters?: DiscoveryFilters;
    profileViewPrefs?: ProfileViewPrefs;
  },
): Promise<DiscoveryPreferencesDto> {
  const current = await getDiscoveryPreferences(userId);

  const nextFilters = normalizeDiscoveryFilters(
    input.discoveryFilters
      ? { ...current.discoveryFilters, ...input.discoveryFilters }
      : current.discoveryFilters,
  );
  const nextViewPrefs = input.profileViewPrefs
    ? { ...current.profileViewPrefs, ...input.profileViewPrefs }
    : current.profileViewPrefs;

  validateDiscoveryFilters(nextFilters);
  validateViewPrefs(nextViewPrefs);

  await pool.query(
    `INSERT INTO user_preferences (user_id, discovery_filters, profile_view_prefs)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       discovery_filters = EXCLUDED.discovery_filters,
       profile_view_prefs = EXCLUDED.profile_view_prefs`,
    [userId, JSON.stringify(nextFilters), JSON.stringify(nextViewPrefs)],
  );

  return getDiscoveryPreferences(userId);
}
