const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 250_000;

function bytesToBase64(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * @param {object} payload - conversations, readReceipts, exportedAt
 * @param {string} passphrase
 */
export async function createEncryptedBackup(payload, passphrase) {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const userKeysRaw = localStorage.getItem('aether_user_keys');
  const envelope = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    conversations: payload.conversations ?? {},
    readReceipts: payload.readReceipts ?? { incoming: {}, outgoing: {} },
    keys: userKeysRaw ? JSON.parse(userKeysRaw) : null,
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(envelope));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    format: 'aether-chat-backup',
    version: BACKUP_VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export async function decryptEncryptedBackup(fileJson, passphrase) {
  if (!passphrase) throw new Error('Passphrase is required.');
  if (fileJson?.format !== 'aether-chat-backup') {
    throw new Error('Unrecognised backup file.');
  }

  const salt = base64ToBytes(fileJson.salt);
  const iv = base64ToBytes(fileJson.iv);
  const ciphertext = base64ToBytes(fileJson.ciphertext);
  const key = await deriveKey(passphrase, salt);

  let plainBytes;
  try {
    plainBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    throw new Error('Wrong passphrase or corrupted backup file.');
  }

  const envelope = JSON.parse(new TextDecoder().decode(plainBytes));
  if (envelope.version !== BACKUP_VERSION) {
    throw new Error('Unsupported backup version.');
  }
  return envelope;
}

export function downloadBackupFile(backupJson, filename) {
  const blob = new Blob([JSON.stringify(backupJson, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `aether-chat-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
