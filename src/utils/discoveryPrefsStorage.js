import {
  DEFAULT_DISCOVERY_FILTERS,
  DEFAULT_VIEW_PREFS,
  coerceDiscoveryAgeRange,
} from './profileFilters.js';

const STORAGE_KEY = 'aether_discovery_prefs';

export const DEFAULT_DISCOVERY_PREFS = {
  discoveryFilters: { ...DEFAULT_DISCOVERY_FILTERS },
  profileViewPrefs: { ...DEFAULT_VIEW_PREFS },
};

function normalizeFilters(raw = {}) {
  const ageMin = raw.ageMin != null ? Number(raw.ageMin) : null;
  const ageMax = raw.ageMax != null ? Number(raw.ageMax) : null;
  return coerceDiscoveryAgeRange({
    ageMin: Number.isFinite(ageMin) ? ageMin : null,
    ageMax: Number.isFinite(ageMax) ? ageMax : null,
    genders: Array.isArray(raw.genders) ? raw.genders.filter((g) => typeof g === 'string') : [],
    interests: Array.isArray(raw.interests) ? raw.interests.filter((i) => typeof i === 'string') : [],
    interestMatch: raw.interestMatch === 'all' ? 'all' : 'any',
  });
}

function normalizeViewPrefs(raw = {}) {
  return {
    showAge: raw.showAge !== false,
    showGender: raw.showGender !== false,
    showInterests: raw.showInterests !== false,
    showLookingFor: raw.showLookingFor !== false,
  };
}

export function loadDiscoveryPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DISCOVERY_PREFS };
    const parsed = JSON.parse(raw);
    return {
      discoveryFilters: normalizeFilters(parsed.discoveryFilters),
      profileViewPrefs: normalizeViewPrefs(parsed.profileViewPrefs),
    };
  } catch {
    return { ...DEFAULT_DISCOVERY_PREFS };
  }
}

export function saveDiscoveryPrefs(prefs) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      discoveryFilters: normalizeFilters(prefs.discoveryFilters),
      profileViewPrefs: normalizeViewPrefs(prefs.profileViewPrefs),
    }),
  );
}
