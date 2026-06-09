const STORAGE_KEY = 'aether_privacy_prefs';

export const DEFAULT_PRIVACY_PREFS = {
  fuzzingStrategy: 'grid_snap',
  albumShieldEnabled: true,
};

const VALID_STRATEGIES = new Set(['grid_snap', 'jitter', 'distance_only']);

export function loadPrivacyPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRIVACY_PREFS };
    const parsed = JSON.parse(raw);
    return {
      fuzzingStrategy: VALID_STRATEGIES.has(parsed.fuzzingStrategy)
        ? parsed.fuzzingStrategy
        : DEFAULT_PRIVACY_PREFS.fuzzingStrategy,
      albumShieldEnabled: parsed.albumShieldEnabled !== false,
    };
  } catch {
    return { ...DEFAULT_PRIVACY_PREFS };
  }
}

export function savePrivacyPrefs(prefs) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      fuzzingStrategy: VALID_STRATEGIES.has(prefs.fuzzingStrategy)
        ? prefs.fuzzingStrategy
        : DEFAULT_PRIVACY_PREFS.fuzzingStrategy,
      albumShieldEnabled: prefs.albumShieldEnabled !== false,
    }),
  );
}
