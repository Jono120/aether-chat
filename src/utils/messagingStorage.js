const STORAGE_KEY = 'aether_messaging_prefs';

export const SELF_DESTRUCT_OPTIONS = [
  { value: 0 },
  { value: 10 },
  { value: 60 },
  { value: 3600 },
];

export const DEFAULT_MESSAGING_PREFS = {
  defaultSelfDestructSeconds: 0,
  readReceiptsEnabled: false,
};

export function loadMessagingPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MESSAGING_PREFS };
    const parsed = JSON.parse(raw);
    const seconds = Number(parsed.defaultSelfDestructSeconds);
    const allowed = SELF_DESTRUCT_OPTIONS.some((o) => o.value === seconds);
    return {
      ...DEFAULT_MESSAGING_PREFS,
      ...parsed,
      defaultSelfDestructSeconds: allowed ? seconds : 0,
      readReceiptsEnabled: Boolean(parsed.readReceiptsEnabled),
    };
  } catch {
    return { ...DEFAULT_MESSAGING_PREFS };
  }
}

export function saveMessagingPrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
