import { loadSession, clearSession } from '../utils/authStorage.js';
import { CLIENT_PLATFORM_HEADER, clientPlatformHeaderValue } from '../utils/platform.js';
import { translateApiError } from '../i18n/apiErrors.js';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? 'dev-user-1';

let onSessionExpired = null;

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

function isApiEnabled() {
  return Boolean(API_BASE);
}

function authHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    [CLIENT_PLATFORM_HEADER]: clientPlatformHeaderValue(),
  };
  const session = loadSession();

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  } else if (import.meta.env.VITE_API_TOKEN) {
    headers.Authorization = `Bearer ${import.meta.env.VITE_API_TOKEN}`;
  } else if (import.meta.env.DEV && isApiEnabled()) {
    headers['X-Dev-User-Id'] = DEV_USER_ID;
  }

  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    clearSession();
    const err = await res.json().catch(() => ({}));
    const message = translateApiError(err.error ?? 'Session expired');
    onSessionExpired?.(message);
    throw new Error(message);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(translateApiError(err.error ?? `API ${res.status}`));
  }
  return res.json();
}

async function publicRequest(path, options = {}) {
  if (!isApiEnabled()) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return handleResponse(res);
}

export async function registerAccount(email, password, displayName) {
  const data = await publicRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  return data;
}

export async function loginAccount(email, password) {
  const data = await publicRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data;
}

export async function fetchAuthConfig() {
  if (!isApiEnabled()) {
    return {
      google: 'mock',
      apple: 'mock',
      googleClientId: null,
      appleClientId: null,
      appleRedirectUri: window.location.origin,
    };
  }
  return publicRequest('/api/v1/auth/config');
}

export async function fetchMobileLinksConfig() {
  if (!isApiEnabled()) return null;
  return publicRequest('/api/v1/config/mobile-links');
}

export async function fetchLocaleConfig() {
  if (!isApiEnabled()) return null;
  return publicRequest('/api/v1/config/locale');
}

export async function loginWithGoogle(credential) {
  return publicRequest('/api/v1/auth/oauth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export async function loginWithApple(idToken, displayName) {
  return publicRequest('/api/v1/auth/oauth/apple', {
    method: 'POST',
    body: JSON.stringify({ idToken, displayName }),
  });
}

export async function mockOAuthLogin(provider) {
  return publicRequest('/api/v1/auth/oauth/mock', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}

export async function negotiateSignalR() {
  return request('/api/v1/signalr/negotiate', { method: 'POST' });
}

async function request(path, options = {}) {
  if (!isApiEnabled()) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  return handleResponse(res);
}

export async function fetchNearbyProfiles() {
  const data = await request('/api/v1/profiles/nearby');
  if (!data) return null;
  return {
    profiles: Array.isArray(data.profiles) ? data.profiles : [],
    totalNearby:
      typeof data.totalNearby === 'number'
        ? data.totalNearby
        : (Array.isArray(data.profiles) ? data.profiles.length : 0),
    filtersActive: Boolean(data.filtersActive),
  };
}

export async function fetchMyProfile() {
  const data = await request('/api/v1/profiles/me');
  return data?.profile ?? null;
}

export async function updateMyProfile(payload) {
  const data = await request('/api/v1/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data?.profile ?? null;
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

export async function requestUploadSas(contentType = 'image/jpeg', purpose = 'avatar') {
  return request('/api/v1/media/upload-sas', {
    method: 'POST',
    body: JSON.stringify({ contentType, purpose }),
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

export async function submitErrorReport(descriptionOrPayload, context = {}) {
  const payload =
    typeof descriptionOrPayload === 'object' && descriptionOrPayload !== null
      ? descriptionOrPayload
      : { description: descriptionOrPayload, context };
  const {
    description,
    context: ctx = {},
    source = 'user',
    errorName,
    stackSnippet,
  } = payload;
  return request('/api/v1/support/error-reports', {
    method: 'POST',
    body: JSON.stringify({
      description,
      context: ctx,
      source,
      errorName,
      stackSnippet,
    }),
  });
}

export async function fetchMessagingPreferences() {
  return request('/api/v1/users/me/messaging-preferences');
}

export async function patchMessagingPreferences(readReceiptsEnabled) {
  return request('/api/v1/users/me/messaging-preferences', {
    method: 'PATCH',
    body: JSON.stringify({ readReceiptsEnabled }),
  });
}

export async function fetchDiscoveryPreferences() {
  return request('/api/v1/users/me/discovery-preferences');
}

export async function patchDiscoveryPreferences(payload) {
  return request('/api/v1/users/me/discovery-preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchPrivacyPreferences() {
  return request('/api/v1/users/me/privacy-preferences');
}

export async function patchPrivacyPreferences(payload) {
  return request('/api/v1/users/me/privacy-preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function markConversationRead(conversationId, messageIds) {
  return request(`/api/v1/conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({ messageIds }),
  });
}

export async function fetchBlockedUsers() {
  const data = await request('/api/v1/users/blocked');
  return data?.blocked ?? [];
}

export async function blockUser(peerId) {
  return request(`/api/v1/users/${encodeURIComponent(peerId)}/block`, { method: 'POST' });
}

export async function unblockUser(peerId) {
  return request(`/api/v1/users/${encodeURIComponent(peerId)}/block`, { method: 'DELETE' });
}

export async function reportUser(peerId, { reason, details, conversationId } = {}) {
  return request(`/api/v1/users/${encodeURIComponent(peerId)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, details, conversationId }),
  });
}

export async function forgotPassword(email) {
  return publicRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, newPassword) {
  return publicRequest('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function verifyAccountPassword(password) {
  return request('/api/v1/auth/verify-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/api/v1/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export { isApiEnabled };
