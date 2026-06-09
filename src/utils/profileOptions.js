// all gender options are added here:
// TODO: add more gender options
export const GENDER_OPTIONS = [
  { value: 'male', labelKey: 'profile.gender.male' },
  { value: 'female', labelKey: 'profile.gender.female' },
  { value: 'non-binary', labelKey: 'profile.gender.non-binary' },
  { value: 'trans-man', labelKey: 'profile.gender.trans-man' },
  { value: 'trans-woman', labelKey: 'profile.gender.trans-woman' },
  { value: 'agender', labelKey: 'profile.gender.agender' },
  { value: 'genderqueer', labelKey: 'profile.gender.genderqueer' },
  { value: 'prefer-not-to-say', labelKey: 'profile.gender.prefer-not-to-say' },
];

export const AGE_OPTIONS = Array.from({ length: 83 }, (_, i) => i + 18);

// all preset interests are added here:
// TODO: add more preset interests
export const PRESET_INTERESTS = [
  'Coffee',
  'Hiking',
  'Art',
  'Music',
  'Fitness',
  'Reading',
  'Gaming',
  'Travel',
  'Food',
  'Tech',
  'Photography',
  'Movies',
  'Cooking',
  'Yoga',
  'Cycling',
  'Nature',
  'Dogs',
  'Nightlife',
];

// all looking for options are added here:
// TODO: add more looking for options
export const LOOKING_FOR_OPTIONS = [
  { value: 'Chats', labelKey: 'profile.lookingFor.Chats' },
  { value: 'Friends', labelKey: 'profile.lookingFor.Friends' },
  { value: 'Coffee', labelKey: 'profile.lookingFor.Coffee' },
  { value: 'Dating', labelKey: 'profile.lookingFor.Dating' },
  { value: 'Networking', labelKey: 'profile.lookingFor.Networking' },
  { value: 'Workout buddy', labelKey: 'profile.lookingFor.Workout buddy' },
  { value: 'Events', labelKey: 'profile.lookingFor.Events' },
];

const PRESET_LOWER = new Set(PRESET_INTERESTS.map((i) => i.toLowerCase()));

export function interestLabelKey(interest) {
  return `profile.interest.${interest}`;
}

export function splitInterests(tags = []) {
  const selected = [];
  const custom = [];

  for (const tag of tags) {
    const trimmed = String(tag).trim();
    if (!trimmed) continue;
    const preset = PRESET_INTERESTS.find((p) => p.toLowerCase() === trimmed.toLowerCase());
    if (preset) {
      if (!selected.includes(preset)) selected.push(preset);
    } else {
      custom.push(trimmed);
    }
  }

  return { selected, custom: custom.join(', ') };
}

export function mergeInterests(selected = [], customText = '') {
  const custom = customText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const merged = [];
  for (const item of [...selected, ...custom]) {
    const key = item.toLowerCase();
    if (!merged.some((m) => m.toLowerCase() === key)) merged.push(item);
  }
  return merged;
}

export function genderLabelKey(value) {
  return GENDER_OPTIONS.find((g) => g.value === value)?.labelKey ?? null;
}

/** @deprecated Use genderLabelKey + t() */
export function genderLabel(value) {
  return GENDER_OPTIONS.find((g) => g.value === value)?.label ?? null;
}

export function isPresetInterest(tag) {
  return PRESET_LOWER.has(String(tag).trim().toLowerCase());
}

export function presetInterestOptions() {
  return PRESET_INTERESTS.map((value) => ({ value, labelKey: interestLabelKey(value) }));
}
