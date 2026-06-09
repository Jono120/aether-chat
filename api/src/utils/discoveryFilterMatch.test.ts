import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { profileMatchesDiscoveryFilters } from '../utils/discoveryFilterMatch.js';
import { isDiscoveryFilterActive } from '../services/discoveryFilterSql.js';

const julian = { age: 25, gender: 'male', tags: ['Coffee', 'Cycling', 'Tech'] };
const alex = { age: 28, gender: 'non-binary', tags: ['Cybersec', 'Foodie'] };
const marcus = { age: 31, gender: 'male', tags: ['Fitness', 'Hiking'] };
const noAge = { age: null, gender: 'female', tags: ['Art'] };

describe('profileMatchesDiscoveryFilters', () => {
  it('includes all profiles when filters are empty', () => {
    assert.equal(profileMatchesDiscoveryFilters(julian, {}), true);
    assert.equal(profileMatchesDiscoveryFilters(alex, {}), true);
  });

  it('filters by age range', () => {
    const filters = { ageMin: 26, ageMax: 30 };
    assert.equal(profileMatchesDiscoveryFilters(julian, filters), false);
    assert.equal(profileMatchesDiscoveryFilters(alex, filters), true);
    assert.equal(profileMatchesDiscoveryFilters(marcus, filters), false);
  });

  it('includes profiles with missing age when age filter is active', () => {
    assert.equal(profileMatchesDiscoveryFilters(noAge, { ageMin: 30 }), true);
  });

  it('filters by gender list', () => {
    const filters = { genders: ['male'] };
    assert.equal(profileMatchesDiscoveryFilters(julian, filters), true);
    assert.equal(profileMatchesDiscoveryFilters(alex, filters), false);
  });

  it('includes profiles with missing gender when gender filter is active', () => {
    assert.equal(profileMatchesDiscoveryFilters({ age: 22, gender: null, tags: [] }, { genders: ['male'] }), true);
  });

  it('matches any interest', () => {
    const filters = { interests: ['Coffee', 'Fitness'], interestMatch: 'any' as const };
    assert.equal(profileMatchesDiscoveryFilters(julian, filters), true);
    assert.equal(profileMatchesDiscoveryFilters(marcus, filters), true);
    assert.equal(profileMatchesDiscoveryFilters(alex, filters), false);
  });

  it('matches all interests', () => {
    const filters = { interests: ['Coffee', 'Cycling'], interestMatch: 'all' as const };
    assert.equal(profileMatchesDiscoveryFilters(julian, filters), true);
    assert.equal(profileMatchesDiscoveryFilters(marcus, filters), false);
  });
});

describe('isDiscoveryFilterActive', () => {
  it('returns false for empty filters', () => {
    assert.equal(isDiscoveryFilterActive({}), false);
  });

  it('returns true when any criterion is set', () => {
    assert.equal(isDiscoveryFilterActive({ ageMin: 25 }), true);
    assert.equal(isDiscoveryFilterActive({ genders: ['male'] }), true);
    assert.equal(isDiscoveryFilterActive({ interests: ['Coffee'] }), true);
  });
});
