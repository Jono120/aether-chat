import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { MSG } = await import('../src/utils/userMessages.js');

const keys = {};
for (const [key, value] of Object.entries(MSG)) {
  if (typeof value === 'function') {
    if (key === 'tutorialProgress') {
      keys[key] = '{{done}} of {{total}} steps completed';
    } else if (key === 'photoShared') {
      keys[key] = '📷 Shared a photo to the private album.';
    } else {
      keys[key] = value();
    }
  } else {
    keys[key] = value;
  }
}

Object.assign(keys, {
  navTabGrid: 'Discovery Grid',
  navTabChat: 'Messages',
  navTabProfile: 'Profile',
  navTabSettings: 'Settings',
  navStatusOffline: 'Offline',
  navStatusOnline: 'Online',
  navStealthTitleOffline: 'Offline Mode',
  navStealthTitleOnline: 'Online Mode',
  navPanicTitle: 'Panic Mode: Account Deletion',
  navGridPresence: 'Grid Presence:',
  navPanicConfirmTitle: 'Confirm Panic Mode?',
  navPanicConfirmBody:
    'This will instantly clear all local app information from this device. Your account will also be marked for permanent deletion.',
  navPanicConfirmBtn: 'Confirm Panic Mode',
  discoveryFiltersActiveCount: '{{count}} active',
  'profile.gender.male': 'Male',
  'profile.gender.female': 'Female',
  'profile.gender.non-binary': 'Non-binary',
  'profile.gender.trans-man': 'Trans-man',
  'profile.gender.trans-woman': 'Trans-woman',
  'profile.gender.agender': 'Agender',
  'profile.gender.genderqueer': 'Genderqueer',
  'profile.gender.prefer-not-to-say': 'Prefer not to say',
  'profile.interest.Coffee': 'Coffee',
  'profile.interest.Hiking': 'Hiking',
  'profile.interest.Art': 'Art',
  'profile.interest.Music': 'Music',
  'profile.interest.Fitness': 'Fitness',
  'profile.interest.Reading': 'Reading',
  'profile.interest.Gaming': 'Gaming',
  'profile.interest.Travel': 'Travel',
  'profile.interest.Food': 'Food',
  'profile.interest.Tech': 'Tech',
  'profile.interest.Photography': 'Photography',
  'profile.interest.Movies': 'Movies',
  'profile.interest.Cooking': 'Cooking',
  'profile.interest.Yoga': 'Yoga',
  'profile.interest.Cycling': 'Cycling',
  'profile.interest.Nature': 'Nature',
  'profile.interest.Dogs': 'Dogs',
  'profile.interest.Nightlife': 'Nightlife',
  'profile.lookingFor.Chats': 'Chats',
  'profile.lookingFor.Friends': 'Friends',
  'profile.lookingFor.Coffee': 'Coffee',
  'profile.lookingFor.Dating': 'Dating',
  'profile.lookingFor.Networking': 'Networking',
  'profile.lookingFor.Workout buddy': 'Workout buddy',
  'profile.lookingFor.Events': 'Events',
  'apiError.sessionExpired': 'Your session expired. Please sign in again.',
  'apiError.invalidCredentials': 'Email or password is incorrect.',
  'apiError.emailTaken': 'An account with this email already exists.',
  'apiError.notFound': 'We could not find what you asked for.',
  'apiError.unauthorized': 'Please sign in to continue.',
  'apiError.forbidden': 'You do not have permission to do that.',
  'apiError.network': 'Network error. Check your connection and try again.',
});

// NZ spelling normalisation
const nzSpelling = {
  settingsAccessibilityDesc:
    'Adjust theme, motion, contrast, reading font, text size, and focus to suit your needs. Changes apply immediately on this device.',
  settingsDiscoveryFiltersDesc:
    'Narrow nearby profiles by age, gender, or interests. Empty filters show everyone.',
};
for (const [k, v] of Object.entries(nzSpelling)) {
  if (keys[k]) keys[k] = v;
}

const outDir = path.join(__dirname, '../src/i18n/locales');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'en-NZ.json'), `${JSON.stringify(keys, null, 2)}\n`);
console.log(`Wrote ${Object.keys(keys).length} keys to en-NZ.json`);
