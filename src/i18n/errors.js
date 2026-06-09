import i18n from './instance.js';

/** Map setup errors to friendly text (never show raw internal errors). Used by App.jsx on startup. */
export function friendlyKeySetupError(err) {
  const msg = typeof err === 'string' ? err : err?.message ?? '';
  if (
    msg.includes('X25519') ||
    msg.includes('Web Crypto') ||
    msg.includes('not support') ||
    msg.includes('not available in this browser')
  ) {
    return i18n.t('keysBrowserUnsupported');
  }
  return i18n.t('keysSetupFailed');
}
