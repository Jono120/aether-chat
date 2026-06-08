const STORAGE_KEY = 'aether_accessibility';

export const TEXT_SIZE_OPTIONS = ['default', 'large', 'extra'];

export const DEFAULT_ACCESSIBILITY = {
  lightMode: false,
  reduceMotion: false,
  highContrast: false,
  textSize: 'default',
  reduceTransparency: false,
  strongFocus: false,
  underlineLinks: false,
  dyslexicFont: true,
};

function normalizeTextSize(value) {
  return TEXT_SIZE_OPTIONS.includes(value) ? value : 'default';
}

export function loadAccessibilitySettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ACCESSIBILITY };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ACCESSIBILITY,
      ...parsed,
      textSize: normalizeTextSize(parsed?.textSize),
    };
  } catch {
    return { ...DEFAULT_ACCESSIBILITY };
  }
}

export function saveAccessibilitySettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Apply settings to the document root (call on load and when settings change). */
export function applyAccessibilitySettings(settings) {
  const root = document.documentElement;
  const s = { ...DEFAULT_ACCESSIBILITY, ...settings, textSize: normalizeTextSize(settings?.textSize) };

  const flag = (key, on) => {
    if (on) root.setAttribute(key, 'true');
    else root.removeAttribute(key);
  };

  if (s.lightMode) root.setAttribute('data-a11y-theme', 'light');
  else root.removeAttribute('data-a11y-theme');

  flag('data-a11y-reduce-motion', s.reduceMotion);
  flag('data-a11y-high-contrast', s.highContrast);
  flag('data-a11y-reduce-transparency', s.reduceTransparency);
  flag('data-a11y-strong-focus', s.strongFocus);
  flag('data-a11y-underline-links', s.underlineLinks);
  flag('data-a11y-classic-font', !s.dyslexicFont);

  if (s.textSize === 'default') root.removeAttribute('data-a11y-text-size');
  else root.setAttribute('data-a11y-text-size', s.textSize);
}
