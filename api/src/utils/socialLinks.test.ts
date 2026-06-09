import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSocialLinks,
  normalizeSocialUsername,
  socialProfileUrl,
} from './socialLinks.js';

describe('normalizeSocialUsername', () => {
  it('strips leading @ and accepts plain usernames', () => {
    assert.equal(normalizeSocialUsername('@julian_r', 'instagram'), 'julian_r');
    assert.equal(normalizeSocialUsername('alex.dev', 'bluesky'), 'alex.dev');
    assert.equal(normalizeSocialUsername('@gamer.tag_42', 'discord'), 'gamer.tag_42');
  });

  it('extracts usernames from profile URLs', () => {
    assert.equal(normalizeSocialUsername('https://instagram.com/julian_r', 'instagram'), 'julian_r');
    assert.equal(normalizeSocialUsername('https://x.com/alex', 'twitter'), 'alex');
    assert.equal(normalizeSocialUsername('https://bsky.app/profile/user.bsky.social', 'bluesky'), 'user.bsky.social');
  });

  it('rejects invalid characters', () => {
    assert.throws(() => normalizeSocialUsername('bad user!', 'twitter'), /Invalid Twitter/);
  });
});

describe('normalizeSocialLinks', () => {
  it('keeps only supported platforms with normalized values', () => {
    assert.deepEqual(
      normalizeSocialLinks({
        instagram: '@photo',
        twitter: '',
        facebook: 'https://facebook.com/my.page',
        bluesky: null,
        tiktok: 'ignored',
      }),
      {
        instagram: 'photo',
        facebook: 'my.page',
      },
    );
  });
});

describe('socialProfileUrl', () => {
  it('builds canonical profile URLs', () => {
    assert.equal(socialProfileUrl('twitter', 'alex'), 'https://x.com/alex');
    assert.equal(socialProfileUrl('bluesky', 'user.bsky.social'), 'https://bsky.app/profile/user.bsky.social');
    assert.equal(socialProfileUrl('discord', 'gamer.tag_42'), '');
  });
});
