import { fetchLocaleConfig } from '../api/client.js';
import {
  countryHintFromTimeZone,
  localeForCountry,
  localeFromNavigatorLanguage,
  normalizeLocale,
  DEFAULT_LOCALE,
} from './countryLocaleMap.js';
import { loadCachedLocale, saveCachedLocale } from './localeStorage.js';

function clientGeoFallback() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language : '';
  const country = countryHintFromTimeZone(timeZone);
  if (country) {
    return {
      locale: localeForCountry(country, { timeZone, navigatorLanguage }),
      country,
      source: 'timezone',
    };
  }
  return {
    locale: localeFromNavigatorLanguage(),
    country: null,
    source: 'navigator',
  };
}

export async function detectLocale() {
  const cached = loadCachedLocale();
  let result = null;

  try {
    const server = await fetchLocaleConfig();
    if (server?.locale) {
      result = {
        locale: normalizeLocale(server.locale),
        country: server.country ?? null,
        source: server.source ?? 'ip',
      };
    }
  } catch {
    // fall through to client fallback
  }

  if (!result) {
    result = clientGeoFallback();
    result.locale = normalizeLocale(result.locale);
  }

  if (!result.locale) {
    result = { locale: cached?.locale ?? DEFAULT_LOCALE, country: null, source: 'default' };
  }

  saveCachedLocale(result);
  return result;
}

export function getBootstrapLocale() {
  const cached = loadCachedLocale();
  return normalizeLocale(cached?.locale ?? DEFAULT_LOCALE);
}
