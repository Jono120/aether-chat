import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { localeForCountry, normalizeLocale } from './countryLocaleMap.js';

describe('countryLocaleMap', () => {
  it('maps NZ to en-NZ', () => {
    assert.equal(localeForCountry('NZ'), 'en-NZ');
  });

  it('maps FR to fr', () => {
    assert.equal(localeForCountry('FR'), 'fr');
  });

  it('maps MX to es', () => {
    assert.equal(localeForCountry('MX'), 'es');
  });

  it('falls back unknown countries to en-NZ', () => {
    assert.equal(localeForCountry('JP'), 'en-NZ');
    assert.equal(localeForCountry(null), 'en-NZ');
  });

  it('maps Quebec signal to fr when timezone and language match', () => {
    assert.equal(
      localeForCountry('CA', {
        timeZone: 'America/Montreal',
        navigatorLanguage: 'fr-CA',
      }),
      'fr',
    );
    assert.equal(localeForCountry('CA', { timeZone: 'America/Vancouver' }), 'en-NZ');
  });

  it('normalises locale codes', () => {
    assert.equal(normalizeLocale('es'), 'es');
    assert.equal(normalizeLocale('fr-FR'), 'fr');
    assert.equal(normalizeLocale('en-US'), 'en-NZ');
    assert.equal(normalizeLocale('invalid'), 'en-NZ');
  });
});
