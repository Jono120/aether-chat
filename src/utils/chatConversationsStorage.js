const STORAGE_KEY = 'aether_chat_conversations';

/** Seed data for first launch or empty storage. */
export const SEED_CONVERSATIONS = {
  julian: [
    { id: 1, sender: 'julian', text: 'Hey! Are you nearby?', timestamp: '09:05 AM', isE2EE: true },
    {
      id: 2,
      sender: 'me',
      text: 'Yeah, around the lower east side. Your profile says within 1km.',
      timestamp: '09:06 AM',
      isE2EE: true,
    },
    {
      id: 3,
      sender: 'julian',
      text: 'Cool, I snapped my grid fuzzing to 1km too. Keep things private until we meet.',
      timestamp: '09:07 AM',
      isE2EE: true,
    },
  ],
  alex: [
    { id: 1, sender: 'alex', text: 'Did you check out that security panel?', timestamp: 'Yesterday', isE2EE: true },
    { id: 2, sender: 'me', text: 'Yes! The EXIF stripper works perfectly.', timestamp: 'Yesterday', isE2EE: true },
  ],
  group_city: [
    {
      id: 1,
      sender: 'alex',
      text: 'Welcome to the City Safe Haven Chat.',
      timestamp: '08:45 AM',
      isGroup: true,
      keyId: 'GRP-KID-105',
    },
    {
      id: 2,
      sender: 'julian',
      text: 'Encrypting with rotated keys. All clear.',
      timestamp: '08:48 AM',
      isGroup: true,
      keyId: 'GRP-KID-105',
    },
  ],
};

export function loadStoredConversations(fallback = SEED_CONVERSATIONS) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveStoredConversations(conversations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}
