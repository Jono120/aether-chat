const STORAGE_KEY = 'aether_app_security';
const UNLOCK_TTL_MS = 15 * 60 * 1000;

const DEFAULT = {
  lockEnabled: false,
  unlockMethod: 'pin',
  pinHash: null,
  biometricCredentialId: null,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT, unlockedUntil: 0 };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT, unlockedUntil: 0 };
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getAppSecurity() {
  return load();
}

export function setAppSecurity(patch) {
  const next = { ...load(), ...patch };
  save(next);
  return next;
}

async function hashPin(pin) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `${saltB64}:${hashB64}`;
}

async function verifyPin(pin, stored) {
  if (!stored) return false;
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const derived = new Uint8Array(bits);
  if (derived.length !== expected.length) return false;
  return derived.every((b, i) => b === expected[i]);
}

export async function setPinCode(pin) {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('PIN must be 4–8 digits');
  }
  const pinHash = await hashPin(pin);
  setAppSecurity({ pinHash, unlockMethod: 'pin', lockEnabled: true });
}

export async function unlockWithPin(pin) {
  const { pinHash } = load();
  if (!(await verifyPin(pin, pinHash))) {
    throw new Error('Incorrect PIN');
  }
  grantSensitiveUnlock();
  return true;
}

export function isSensitiveUnlocked() {
  const { unlockedUntil } = load();
  return Boolean(unlockedUntil && unlockedUntil > Date.now());
}

export function grantSensitiveUnlock() {
  setAppSecurity({ unlockedUntil: Date.now() + UNLOCK_TTL_MS });
}

export function revokeSensitiveUnlock() {
  setAppSecurity({ unlockedUntil: 0 });
}

export async function registerBiometric() {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometric unlock is not supported in this browser');
  }
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Aether' },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'aether-user',
        displayName: 'Aether user',
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
    },
  });
  if (!credential?.rawId) throw new Error('Biometric setup failed');
  const id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
  setAppSecurity({ biometricCredentialId: id, unlockMethod: 'biometric', lockEnabled: true });
  return id;
}

export async function unlockWithBiometric() {
  const { biometricCredentialId } = load();
  if (!biometricCredentialId) throw new Error('Biometric unlock is not set up');
  const idBytes = Uint8Array.from(atob(biometricCredentialId), (c) => c.charCodeAt(0));
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: idBytes, type: 'public-key' }],
      userVerification: 'required',
    },
  });
  if (!assertion) throw new Error('Biometric verification failed');
  grantSensitiveUnlock();
  return true;
}

export function canUseBiometric() {
  return Boolean(window.PublicKeyCredential);
}
