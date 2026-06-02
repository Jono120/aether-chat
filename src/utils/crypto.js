/**
 * Aether Cryptographic Engine (Web Crypto)
 *
 * X25519 key agreement + AES-256-GCM for 1:1 messages.
 * Private keys never leave the device; only public JWKs are registered with the API.
 */

const ECDH_PARAMS = { name: 'ECDH', namedCurve: 'X25519' };
const AES_PARAMS = { name: 'AES-GCM', length: 256 };

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

async function fingerprintFromJwk(publicKeyJwk) {
  const key = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    ECDH_PARAMS,
    true,
    [],
  );
  const spki = await crypto.subtle.exportKey('spki', key);
  const hash = await crypto.subtle.digest('SHA-256', spki);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return hex.match(/.{1,4}/g).join(':');
}

function randomId() {
  return crypto.randomUUID();
}

export function isLegacyKeyFormat(keys) {
  return keys && typeof keys.publicKey === 'string' && keys.publicKey.startsWith('AETH-');
}

/**
 * Generates an E2EE keypair. Private JWK stays on device only.
 */
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey']);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const fingerprint = await fingerprintFromJwk(publicKeyJwk);

  return {
    deviceId: randomId(),
    publicKeyJwk,
    privateKeyJwk,
    fingerprint,
    createdAt: new Date().toISOString(),
    /** Display-friendly short id */
    publicKey: fingerprint.slice(0, 19),
    privateKey: '[device-only]',
  };
}

async function importPrivateKey(privateKeyJwk) {
  return crypto.subtle.importKey('jwk', privateKeyJwk, ECDH_PARAMS, false, ['deriveKey']);
}

async function importPublicKey(publicKeyJwk) {
  return crypto.subtle.importKey('jwk', publicKeyJwk, ECDH_PARAMS, false, []);
}

async function deriveAesKey(privateKey, publicKey) {
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  );
  const keyMaterial = await crypto.subtle.digest('SHA-256', shared);
  return crypto.subtle.importKey('raw', keyMaterial, AES_PARAMS, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypts a 1:1 message. recipientPublicKeyJwk is the peer's registered public JWK.
 */
export async function encryptMessage(plaintext, senderPrivateKeyJwk, recipientPublicKeyJwk) {
  const privateKey = await importPrivateKey(senderPrivateKeyJwk);
  const publicKey = await importPublicKey(recipientPublicKeyJwk);
  const aesKey = await deriveAesKey(privateKey, publicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  return {
    version: 'Aether-E2EE-2.0',
    algorithm: 'ECDH-X25519-AES-256-GCM',
    cipherSuite: 'ECDH-X25519-AES-256-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(cipherBuffer),
    recipientKeyJwk: recipientPublicKeyJwk,
  };
}

/**
 * Decrypts a 1:1 message packet.
 */
export async function decryptMessage(packet, recipientPrivateKeyJwk, senderPublicKeyJwk) {
  try {
    if (!packet?.ciphertext) return '[Error: Empty Payload]';

    const privateKey = await importPrivateKey(recipientPrivateKeyJwk);
    const publicKey = await importPublicKey(senderPublicKeyJwk);
    const aesKey = await deriveAesKey(privateKey, publicKey);
    const iv = base64ToBytes(packet.iv);
    const cipherBytes = base64ToBytes(packet.ciphertext);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      cipherBytes,
    );
    return new TextDecoder().decode(plainBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Decryption Error: Invalid session key or corrupted frame]';
  }
}

export async function generateGroupKey(groupId) {
  const aesKey = await crypto.subtle.generateKey(AES_PARAMS, true, ['encrypt', 'decrypt']);
  const keyJwk = await crypto.subtle.exportKey('jwk', aesKey);
  const version = Math.floor(Math.random() * 900) + 100;
  return {
    keyId: `GRP-KID-${version}`,
    keyJwk,
    version,
    rotatedAt: new Date().toISOString(),
    groupId,
  };
}

export async function encryptGroupMessage(plaintext, groupKey) {
  const aesKey = await crypto.subtle.importKey(
    'jwk',
    groupKey.keyJwk,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  return {
    version: 'Aether-E2EE-2.0',
    algorithm: 'AES-256-GCM',
    cipherSuite: 'AES-256-GCM',
    keyId: groupKey.keyId,
    keyVersion: groupKey.version,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(cipherBuffer),
  };
}

export async function decryptGroupMessage(packet, groupKey) {
  try {
    if (!packet?.ciphertext) return '[Error: Empty Payload]';
    if (packet.keyId !== groupKey.keyId) {
      return `[Decryption Error: Key mismatch. Message uses ${packet.keyId}, active is ${groupKey.keyId}]`;
    }
    const aesKey = await crypto.subtle.importKey(
      'jwk',
      groupKey.keyJwk,
      AES_PARAMS,
      false,
      ['encrypt', 'decrypt'],
    );
    const iv = base64ToBytes(packet.iv);
    const cipherBytes = base64ToBytes(packet.ciphertext);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      cipherBytes,
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return '[Decryption Error: Group key invalidated]';
  }
}

/** Resolve peer public JWK from API key list or legacy string fingerprint. */
export function resolvePeerPublicJwk(peerKeys) {
  if (peerKeys?.length && peerKeys[0].public_key_jwk) {
    return peerKeys[0].public_key_jwk;
  }
  return null;
}
