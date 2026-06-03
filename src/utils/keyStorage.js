const DB_NAME = 'aether-keys';
const STORE = 'device';
const KEY_ID = 'primary';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
  });
}

export async function loadDeviceKeys() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const get = tx.objectStore(STORE).get(KEY_ID);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => reject(get.error);
    });
  } catch {
    return null;
  }
}

export async function saveDeviceKeys(keys) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const put = tx.objectStore(STORE).put(keys, KEY_ID);
    put.onsuccess = () => resolve();
    put.onerror = () => reject(put.error);
  });
}

export async function clearDeviceKeys() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const del = tx.objectStore(STORE).delete(KEY_ID);
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
    });
  } catch {
    /* ignore */
  }
}

/** Migrate legacy localStorage keys into IndexedDB once. */
export async function migrateLegacyKeysFromLocalStorage() {
  const raw = localStorage.getItem('aether_user_keys');
  if (!raw) return null;
  try {
    const keys = JSON.parse(raw);
    await saveDeviceKeys(keys);
    localStorage.removeItem('aether_user_keys');
    return keys;
  } catch {
    return null;
  }
}
