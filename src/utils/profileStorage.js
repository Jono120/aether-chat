import { mergeInterests, splitInterests } from './profileOptions.js';

const PROFILE_KEY = 'aether_user_profile';
const MEDIA_PREFIX = 'aether_media_preview_';

export const DEFAULT_LOCAL_PROFILE = {
  id: 'local-user',
  username: 'You',
  age: null,
  gender: null,
  role: '',
  bio: '',
  fuzzedDistance: 'Nearby',
  primaryColor: '#7c3aed',
  secondaryColor: '#db2777',
  pattern: 1,
  hasSecureAlbum: false,
  tags: [],
  lookingFor: [],
  discoverable: true,
  allowProfileMediaUpload: true,
  allowAlbumMediaUpload: true,
  avatarMediaId: null,
};

export function loadLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_LOCAL_PROFILE };
    return { ...DEFAULT_LOCAL_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_LOCAL_PROFILE };
  }
}

export function saveLocalProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function saveMediaPreview(mediaId, dataUrl) {
  if (!mediaId || !dataUrl) return;
  localStorage.setItem(`${MEDIA_PREFIX}${mediaId}`, dataUrl);
}

export function loadMediaPreview(mediaId) {
  if (!mediaId) return null;
  return localStorage.getItem(`${MEDIA_PREFIX}${mediaId}`);
}

export function clearMediaPreview(mediaId) {
  if (!mediaId) return;
  localStorage.removeItem(`${MEDIA_PREFIX}${mediaId}`);
}

export function profileToForm(profile) {
  const { selected, custom } = splitInterests(profile.tags ?? []);
  return {
    username: profile.username ?? '',
    age: profile.age ?? '',
    gender: profile.gender ?? '',
    role: profile.role ?? '',
    bio: profile.bio ?? '',
    interestsSelected: selected,
    interestsCustom: custom,
    lookingFor: profile.lookingFor ?? [],
    primaryColor: profile.primaryColor ?? '#7c3aed',
    secondaryColor: profile.secondaryColor ?? '#db2777',
    hasSecureAlbum: Boolean(profile.hasSecureAlbum),
    discoverable: profile.discoverable !== false,
    allowProfileMediaUpload: profile.allowProfileMediaUpload !== false,
    allowAlbumMediaUpload: profile.allowAlbumMediaUpload !== false,
    avatarMediaId: profile.avatarMediaId ?? null,
  };
}

export function formToProfile(form, existing = {}) {
  const age = form.age === '' || form.age === null ? null : Number(form.age);
  const tags = mergeInterests(form.interestsSelected ?? [], form.interestsCustom ?? '');

  return {
    ...existing,
    username: form.username.trim() || 'You',
    age: Number.isFinite(age) && age >= 18 ? age : null,
    gender: form.gender || null,
    role: form.role.trim(),
    bio: form.bio.trim(),
    tags,
    lookingFor: form.lookingFor ?? [],
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    hasSecureAlbum: form.hasSecureAlbum,
    discoverable: form.discoverable,
    allowProfileMediaUpload: form.allowProfileMediaUpload,
    allowAlbumMediaUpload: form.allowAlbumMediaUpload,
    avatarMediaId: form.avatarMediaId,
    pattern: existing.pattern ?? 1,
    fuzzedDistance: existing.fuzzedDistance ?? 'Nearby',
  };
}

export function profileToApiPayload(profile) {
  return {
    displayName: profile.username,
    bio: profile.bio,
    roleLabel: profile.role,
    age: profile.age,
    gender: profile.gender,
    tags: profile.tags,
    lookingFor: profile.lookingFor,
    primaryColor: profile.primaryColor,
    secondaryColor: profile.secondaryColor,
    hasSecureAlbum: profile.hasSecureAlbum,
    discoverable: profile.discoverable,
    avatarMediaId: profile.avatarMediaId,
    allowProfileMediaUpload: profile.allowProfileMediaUpload,
    allowAlbumMediaUpload: profile.allowAlbumMediaUpload,
  };
}
