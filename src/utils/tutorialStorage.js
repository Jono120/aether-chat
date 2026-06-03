const STORAGE_KEY = 'aether_discovery_tutorial';

export const TUTORIAL_STEP_IDS = ['profile', 'visibility', 'grid', 'messages', 'settings'];

const DEFAULT_STATE = {
  completed: false,
  collapsed: false,
  checkedSteps: [],
};

export function loadDiscoveryTutorial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE, collapsed: false };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      checkedSteps: Array.isArray(parsed.checkedSteps)
        ? parsed.checkedSteps.filter((id) => TUTORIAL_STEP_IDS.includes(id))
        : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveDiscoveryTutorial(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isDiscoveryTutorialComplete(state) {
  return Boolean(state?.completed);
}
