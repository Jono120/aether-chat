const STORAGE_KEY = 'aether_locale_cache';

export function loadCachedLocale() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.locale) return null;
    return {
      locale: parsed.locale,
      country: parsed.country ?? null,
      source: parsed.source ?? 'cache',
    };
  } catch {
    return null;
  }
}

export function saveCachedLocale({ locale, country, source }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ locale, country: country ?? null, source: source ?? 'unknown' }),
  );
}
