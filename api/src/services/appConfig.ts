import { config } from '../config.js';

function validHttpsUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return /^https:\/\/.+/i.test(trimmed) ? trimmed : null;
}

export function getMobileLinksConfig(): { ios: string | null; android: string | null } {
  return {
    ios: validHttpsUrl(config.iosAppStoreUrl),
    android: validHttpsUrl(config.androidPlayStoreUrl),
  };
}
