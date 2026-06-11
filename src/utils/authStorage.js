const SESSION_KEY = 'aether_session';

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(apiEnabled) {
  const session = loadSession();
  if (!session) return false;
  if (apiEnabled) return Boolean(session.token);
  return Boolean(session.user?.id);
}

/** Offline demo: create a local-only session without API. Never admin. */
export function createOfflineSession(email, displayName) {
  const normalized = email.trim().toLowerCase();
  const id = `local-${normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user'}`;
  const session = {
    token: null,
    user: {
      id,
      email: normalized,
      displayName: displayName.trim() || normalized.split('@')[0],
      isAdmin: false,
    },
  };
  saveSession(session);
  return session;
}
