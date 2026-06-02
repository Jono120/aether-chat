const API_BASE = import.meta.env.VITE_API_URL ?? '';
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? 'dev-user-1';

function isApiEnabled() {
  return Boolean(API_BASE);
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (import.meta.env.VITE_API_TOKEN) {
    headers.Authorization = `Bearer ${import.meta.env.VITE_API_TOKEN}`;
  } else if (import.meta.env.DEV) {
    headers['X-Dev-User-Id'] = DEV_USER_ID;
  }
  return headers;
}

async function request(path, options = {}) {
  if (!isApiEnabled()) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API ${res.status}`);
  }
  return res.json();
}

export async function fetchNearbyProfiles() {
  const data = await request('/api/v1/profiles/nearby');
  return data?.profiles ?? null;
}

export async function registerPublicKey(deviceId, publicKeyJwk, fingerprint) {
  return request('/api/v1/keys/public', {
    method: 'POST',
    body: JSON.stringify({ deviceId, publicKeyJwk, fingerprint }),
  });
}

export async function fetchPublicKeys(userId) {
  const data = await request(`/api/v1/keys/public/${userId}`);
  return data?.keys ?? [];
}

export async function revokeKeys(deviceId) {
  return request('/api/v1/keys/revoke', {
    method: 'POST',
    body: JSON.stringify(deviceId ? { deviceId } : {}),
  });
}

export async function ensureConversation(peerId) {
  const data = await request(`/api/v1/conversations/direct/${peerId}`, { method: 'POST' });
  return data?.conversationId;
}

export async function fetchMessages(conversationId) {
  const data = await request(`/api/v1/conversations/${conversationId}/messages`);
  return data?.messages ?? [];
}

export async function sendMessage(conversationId, envelope) {
  return request(`/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(envelope),
  });
}

export async function requestUploadSas(contentType = 'image/jpeg') {
  return request('/api/v1/media/upload-sas', {
    method: 'POST',
    body: JSON.stringify({ contentType }),
  });
}

export async function scheduleAccountDeletion() {
  return request('/api/v1/account/deletion', { method: 'POST' });
}

export async function cancelAccountDeletion() {
  return request('/api/v1/account/deletion', { method: 'DELETE' });
}

export async function panicLockServer() {
  return request('/api/v1/account/panic', { method: 'POST' });
}

export { isApiEnabled };
