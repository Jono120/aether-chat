import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rejectIfLocked } from './auth.js';

describe('rejectIfLocked', () => {
  it('returns true for locked accounts', () => {
    assert.equal(rejectIfLocked('locked'), true);
  });

  it('returns false for active accounts', () => {
    assert.equal(rejectIfLocked('active'), false);
  });

  it('returns false for deletion_pending accounts', () => {
    assert.equal(rejectIfLocked('deletion_pending'), false);
  });
});
