import type { Request } from 'express';
import { config } from '../config.js';
import { DEFAULT_LOCALE, localeForCountry, normalizeLocale } from '../utils/countryLocaleMap.js';

export type LocaleDetectionResult = {
  locale: ReturnType<typeof normalizeLocale>;
  country: string | null;
  source: 'ip' | 'default';
};

function readCountryHeader(req: Request): string | null {
  for (const headerName of config.geoCountryHeaders) {
    const raw = req.headers[headerName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value || typeof value !== 'string') continue;
    const code = value.trim().toUpperCase();
    if (code.length === 2 && code !== 'XX' && code !== 'T1') return code;
  }
  return null;
}

export function detectLocaleFromRequest(req: Request): LocaleDetectionResult {
  const country = readCountryHeader(req);
  if (!country) {
    return { locale: DEFAULT_LOCALE, country: null, source: 'default' };
  }
  return {
    locale: localeForCountry(country),
    country,
    source: 'ip',
  };
}

export function coerceLocale(locale: unknown): LocaleDetectionResult['locale'] {
  return normalizeLocale(typeof locale === 'string' ? locale : undefined);
}
