import countryMapData from '../../shared/locale/countryLocaleMap.json' with { type: 'json' };

export const SUPPORTED_LOCALES = ['en-NZ', 'es', 'fr'];
export const DEFAULT_LOCALE = 'en-NZ';

const COUNTRY_TO_LOCALE = new Map();

for (const [locale, countries] of Object.entries(countryMapData)) {
  for (const country of countries) {
    COUNTRY_TO_LOCALE.set(country.toUpperCase(), locale);
  }
}

const QUEBEC_TIMEZONES = new Set(['America/Toronto', 'America/Montreal']);

const TIMEZONE_COUNTRY_HINTS = {
  'Pacific/Auckland': 'NZ',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'America/Vancouver': 'CA',
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Luxembourg': 'LU',
  'Europe/Monaco': 'MC',
  'America/Mexico_City': 'MX',
  'America/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Caracas': 'VE',
  'America/Guayaquil': 'EC',
  'America/Guatemala': 'GT',
  'America/Havana': 'CU',
  'America/La_Paz': 'BO',
  'America/Santo_Domingo': 'DO',
  'America/Tegucigalpa': 'HN',
  'America/Asuncion': 'PY',
  'America/El_Salvador': 'SV',
  'America/Managua': 'NI',
  'America/Costa_Rica': 'CR',
  'America/Panama': 'PA',
  'America/Montevideo': 'UY',
  'America/Puerto_Rico': 'PR',
  'Europe/Madrid': 'ES',
};

export function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;
  const trimmed = locale.trim();
  if (SUPPORTED_LOCALES.includes(trimmed)) return trimmed;
  const prefix = trimmed.split('-')[0].toLowerCase();
  if (prefix === 'es') return 'es';
  if (prefix === 'fr') return 'fr';
  return DEFAULT_LOCALE;
}

export function localeForCountry(country, { timeZone, navigatorLanguage } = {}) {
  const code = country?.trim().toUpperCase();
  if (!code) return DEFAULT_LOCALE;

  if (code === 'CA' && timeZone && QUEBEC_TIMEZONES.has(timeZone)) {
    const lang = (navigatorLanguage ?? '').toLowerCase();
    if (lang.startsWith('fr')) return 'fr';
  }

  return COUNTRY_TO_LOCALE.get(code) ?? DEFAULT_LOCALE;
}

export function countryHintFromTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return null;
  return TIMEZONE_COUNTRY_HINTS[timeZone] ?? null;
}

export function localeFromNavigatorLanguage() {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : '') ?? '';
  const prefix = lang.split('-')[0].toLowerCase();
  if (prefix === 'es') return 'es';
  if (prefix === 'fr') return 'fr';
  return DEFAULT_LOCALE;
}
