const KEY = 'aether_blocked_users';

export function loadBlockedUsers() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function saveBlockedUsers(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function blockUserLocal(peerId) {
  const set = loadBlockedUsers();
  set.add(peerId);
  saveBlockedUsers(set);
  return set;
}

export function unblockUserLocal(peerId) {
  const set = loadBlockedUsers();
  set.delete(peerId);
  saveBlockedUsers(set);
  return set;
}

export function isBlockedLocal(peerId) {
  return loadBlockedUsers().has(peerId);
}
