const HTTPS = /^https:\/\/.+/i;

let runtimeLinks = null;

function validUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return HTTPS.test(trimmed) ? trimmed : null;
}

/** Merge API-fetched links over build-time Vite env. */
export function setMobileStoreLinks(links) {
  if (!links || typeof links !== 'object') {
    runtimeLinks = null;
    return;
  }
  runtimeLinks = {
    ios: validUrl(links.ios) ?? null,
    android: validUrl(links.android) ?? null,
  };
}

function resolveLinks() {
  const ios = runtimeLinks?.ios ?? validUrl(import.meta.env.VITE_IOS_APP_STORE_URL);
  const android = runtimeLinks?.android ?? validUrl(import.meta.env.VITE_ANDROID_PLAY_STORE_URL);
  if (!ios && !android) return null;
  return { ios, android };
}

/** App store URLs from API override or Vite env; null when unset or invalid. */
export function getMobileStoreLinks() {
  return resolveLinks();
}

export function hasMobileStoreLinks() {
  return getMobileStoreLinks() !== null;
}

/** Prefer iOS link on Apple devices, Android on Android, otherwise both. */
export function getOrderedMobileStoreLinks() {
  const links = resolveLinks();
  if (!links) return [];

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const preferIos = /iPhone|iPad|iPod/i.test(ua);
  const preferAndroid = /Android/i.test(ua);

  const ordered = [];
  if (preferIos && links.ios) ordered.push({ platform: 'ios', href: links.ios });
  if (preferAndroid && links.android) ordered.push({ platform: 'android', href: links.android });
  if (links.ios && !ordered.some((l) => l.platform === 'ios')) {
    ordered.push({ platform: 'ios', href: links.ios });
  }
  if (links.android && !ordered.some((l) => l.platform === 'android')) {
    ordered.push({ platform: 'android', href: links.android });
  }
  return ordered;
}
