import i18n from './instance.js';

const ERROR_PATTERNS = [
  { match: /session expired/i, key: 'apiError.sessionExpired' },
  { match: /invalid credentials/i, key: 'apiError.invalidCredentials' },
  { match: /email already/i, key: 'apiError.emailTaken' },
  { match: /password must be at least/i, key: 'authPasswordShort' },
  { match: /not found/i, key: 'apiError.notFound' },
  { match: /unauthorized/i, key: 'apiError.unauthorized' },
  { match: /forbidden/i, key: 'apiError.forbidden' },
  { match: /network/i, key: 'apiError.network' },
  { match: /^API \d+$/i, key: 'authFailed' },
];

export function translateApiError(message) {
  const text = String(message ?? '').trim();
  if (!text) return i18n.t('authFailed');
  for (const { match, key } of ERROR_PATTERNS) {
    if (match.test(text)) return i18n.t(key);
  }
  return text;
}
