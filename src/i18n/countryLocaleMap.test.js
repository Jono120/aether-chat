import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countryHintFromTimeZone,
  localeForCountry,
  normalizeLocale,
} from './countryLocaleMap.js';

describe('countryLocaleMap (client)', () => {
  it('maps NZ to en-NZ', () => {
    assert.equal(localeForCountry('NZ'), 'en-NZ');
  });

  it('maps FR to fr and MX to es', () => {
    assert.equal(localeForCountry('FR'), 'fr');
    assert.equal(localeForCountry('MX'), 'es');
  });

  it('falls back unknown countries to en-NZ', () => {
    assert.equal(localeForCountry('ZZ'), 'en-NZ');
  });

  it('timezone fallback hints', () => {
    assert.equal(countryHintFromTimeZone('Pacific/Auckland'), 'NZ');
    assert.equal(countryHintFromTimeZone('Europe/Paris'), 'FR');
    assert.equal(countryHintFromTimeZone('America/Mexico_City'), 'MX');
  });

  it('normalises locale prefixes', () => {
    assert.equal(normalizeLocale('es-ES'), 'es');
    assert.equal(normalizeLocale('fr-CA'), 'fr');
    assert.equal(normalizeLocale('en-US'), 'en-NZ');
  });
});
