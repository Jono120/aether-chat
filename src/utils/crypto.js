/**
 * Aether Cryptographic Engine (Web Crypto)
 *
 * X25519 key agreement + AES-256-GCM for 1:1 messages.
 * Private keys never leave the device; only public JWKs are registered with the API.
 */

import i18n from '../i18n/instance.js';

const X25519_NATIVE = { name: 'X25519' };
const X25519_ECDH = { name: 'ECDH', namedCurve: 'X25519' };
const AES_PARAMS = { name: 'AES-GCM', length: 256 };

/** @type {{ keyAlg: EcKeyAlgorithm | Algorithm; derivePublic: EcKeyImportParams | Algorithm } | null} */
let x25519Resolved = null;

async function resolveX25519() {
  if (x25519Resolved) return x25519Resolved;

  try {
    await crypto.subtle.generateKey(X25519_NATIVE, false, ['deriveBits']);
    x25519Resolved = {
      keyAlg: X25519_NATIVE,
      deriveBits: true,
      derivePublic: X25519_NATIVE,
    };
    return x25519Resolved;
  } catch {
    // Older Chromium builds used ECDH + namedCurve
  }

  try {
    await crypto.subtle.generateKey(X25519_ECDH, false, ['deriveKey']);
    x25519Resolved = {
      keyAlg: X25519_ECDH,
      deriveBits: false,
      derivePublic: { name: 'ECDH' },
    };
    return x25519Resolved;
  } catch {
    throw new Error(i18n.t('keysBrowserUnsupported'));
  }
}

function privateKeyUsages(resolved) {
  return resolved.deriveBits ? ['deriveBits'] : ['deriveKey'];
}

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
  const { keyAlg } = await resolveX25519();
  const key = await crypto.subtle.importKey('jwk', publicKeyJwk, keyAlg, true, []);
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
  const resolved = await resolveX25519();
  const keyPair = await crypto.subtle.generateKey(
    resolved.keyAlg,
    true,
    privateKeyUsages(resolved),
  );
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
  const resolved = await resolveX25519();
  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    resolved.keyAlg,
    false,
    privateKeyUsages(resolved),
  );
}

async function importPublicKey(publicKeyJwk) {
  const { keyAlg } = await resolveX25519();
  return crypto.subtle.importKey('jwk', publicKeyJwk, keyAlg, false, []);
}

async function deriveAesKey(privateKey, publicKey) {
  const { derivePublic } = await resolveX25519();
  const shared = await crypto.subtle.deriveBits(
    { ...derivePublic, public: publicKey },
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
    if (!packet?.ciphertext) return i18n.t('decryptEmpty');

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
    return i18n.t('decryptFailed');
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
    if (!packet?.ciphertext) return i18n.t('decryptEmpty');
    if (packet.keyId !== groupKey.keyId) {
      return i18n.t('decryptGroupKeyMismatch');
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
    return i18n.t('decryptGroupInvalid');
  }
}

/** Resolve peer public JWK from API key list or legacy string fingerprint. */
export function resolvePeerPublicJwk(peerKeys) {
  const row = peerKeys?.[0];
  if (!row) return null;
  return row.public_key_jwk ?? row.publicKeyJwk ?? null;
}
