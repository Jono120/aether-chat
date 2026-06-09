const countryMapData = {
  'en-NZ': ['NZ', 'AU', 'GB', 'IE', 'US', 'CA'],
  es: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR'],
  fr: ['FR', 'BE', 'LU', 'MC'],
} as const;

export const SUPPORTED_LOCALES = ['en-NZ', 'es', 'fr'] as const;
export const DEFAULT_LOCALE = 'en-NZ';

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const COUNTRY_TO_LOCALE = new Map<string, SupportedLocale>();

for (const [locale, countries] of Object.entries(countryMapData)) {
  for (const country of countries) {
    COUNTRY_TO_LOCALE.set(country.toUpperCase(), locale as SupportedLocale);
  }
}

const QUEBEC_TIMEZONES = new Set(['America/Toronto', 'America/Montreal']);

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;
  const trimmed = locale.trim();
  if ((SUPPORTED_LOCALES as readonly string[]).includes(trimmed)) return trimmed as SupportedLocale;
  const prefix = trimmed.split('-')[0].toLowerCase();
  if (prefix === 'es') return 'es';
  if (prefix === 'fr') return 'fr';
  return DEFAULT_LOCALE;
}

export function localeForCountry(
  country: string | null | undefined,
  opts: { timeZone?: string; navigatorLanguage?: string } = {},
): SupportedLocale {
  const code = country?.trim().toUpperCase();
  if (!code) return DEFAULT_LOCALE;

  if (code === 'CA' && opts.timeZone && QUEBEC_TIMEZONES.has(opts.timeZone)) {
    const lang = (opts.navigatorLanguage ?? '').toLowerCase();
    if (lang.startsWith('fr')) return 'fr';
  }

  return COUNTRY_TO_LOCALE.get(code) ?? DEFAULT_LOCALE;
}
