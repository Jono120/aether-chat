// all gender options are added here:
// TODO: add more gender options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'trans-man', label: 'Trans-man' },
  { value: 'trans-woman', label: 'Trans-woman' },
  { value: 'agender', label: 'Agender' },
  { value: 'genderqueer', label: 'Genderqueer' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
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
  'Chats',
  'Friends',
  'Coffee',
  'Dating',
  'Networking',
  'Workout buddy',
  'Events',
];

const PRESET_LOWER = new Set(PRESET_INTERESTS.map((i) => i.toLowerCase()));

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

export function genderLabel(value) {
  return GENDER_OPTIONS.find((g) => g.value === value)?.label ?? null;
}

export function isPresetInterest(tag) {
  return PRESET_LOWER.has(String(tag).trim().toLowerCase());
}
