/**
 * Aether Cryptographic Engine (Client-Side E2EE Simulator)
 * 
 * In a production Aether environment, these operations would run using standard 
 * Web Crypto APIs (or native mobile crypto engines like Signal Protocol). 
 * This module simulates public-private key generation (DH/RSA), key exchange, 
 * AES-GCM symmetric message encryption, and key rotation to demonstrate 
 * real-time zero-knowledge security on the client side.
 */

// Helper to generate a realistic cryptographic hex string
const generateHex = (length) => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
};

// Helper to encode/decode strings to simulate encryption logic
const simpleCipher = (text, key, decrypt = false) => {
  // Simple deterministic XOR cipher to generate realistic-looking ciphertext
  // while ensuring we can decrypt it seamlessly in the prototype.
  const keySum = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return text
    .split('')
    .map((char, index) => {
      const charCode = char.charCodeAt(0);
      // Deterministic shift based on key and index
      const shift = (keySum + index) % 256;
      const result = decrypt 
        ? (charCode - shift + 256) % 256 
        : (charCode + shift) % 256;
      return String.fromCharCode(result);
    })
    .join('');
};

/**
 * Generates an E2EE Public/Private keypair.
 * Public key is shared with the server/other users.
 * Private key NEVER leaves the local device storage.
 */
export const generateKeyPair = (username) => {
  const suffix = generateHex(16).toUpperCase();
  const fingerprint = generateHex(32).match(/.{1,4}/g).join(':').toUpperCase();
  
  return {
    publicKey: `AETH-PUB-${username.substring(0, 3).toUpperCase()}-${suffix}`,
    privateKey: `AETH-PRV-${username.substring(0, 3).toUpperCase()}-${generateHex(32).toUpperCase()}`,
    fingerprint,
    createdAt: new Date().toISOString()
  };
};

/**
 * Encrypts a 1-to-1 message using the recipient's public key.
 * In a real app, this performs an ECDH key exchange to derive an AES-GCM session key,
 * then encrypts the payload.
 */
export const encryptMessage = (plaintext, senderPrivateKey, recipientPublicKey) => {
  // Derive a simulated unique session key from sender private and recipient public key
  const mockSessionKey = `SES-${senderPrivateKey.slice(-8)}-${recipientPublicKey.slice(-8)}`;
  const iv = generateHex(24); // 96-bit IV
  
  // Encrypt the message text
  const encryptedText = simpleCipher(plaintext, mockSessionKey);
  const ciphertext = btoa(unescape(encodeURIComponent(encryptedText))); // Base64 encoding
  
  // Return the encrypted transmission frame
  return {
    version: "Aether-E2EE-1.0",
    algorithm: "ECDH-X25519-AES-256-GCM",
    iv,
    ciphertext,
    recipientKey: recipientPublicKey,
    senderFingerprint: generateHex(16).toUpperCase()
  };
};

/**
 * Decrypts a 1-to-1 message using the recipient's private key.
 */
export const decryptMessage = (packet, recipientPrivateKey, senderPublicKey) => {
  try {
    if (!packet || !packet.ciphertext) return "[Error: Empty Payload]";
    
    // Derive the same simulated session key
    const mockSessionKey = `SES-${recipientPrivateKey.slice(-8)}-${senderPublicKey.slice(-8)}`;
    
    // Decode Base64 and decrypt
    const encryptedText = decodeURIComponent(escape(atob(packet.ciphertext)));
    return simpleCipher(encryptedText, mockSessionKey, true);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Decryption Error: Invalid Session Key / Corrupted Frame]";
  }
};

/**
 * Generates a shared group key for group chats.
 * In group chats, keys are rotated periodically (e.g., when a user joins/leaves).
 */
export const generateGroupKey = (groupId) => {
  const version = Math.floor(Math.random() * 900) + 100;
  return {
    keyId: `GRP-KID-${version}`,
    keyVal: `AETH-GRP-${groupId.slice(-4).toUpperCase()}-${generateHex(32).toUpperCase()}`,
    version,
    rotatedAt: new Date().toISOString()
  };
};

/**
 * Encrypts a message for a group chat using the active group key.
 */
export const encryptGroupMessage = (plaintext, groupKey) => {
  const iv = generateHex(24);
  const encryptedText = simpleCipher(plaintext, groupKey.keyVal);
  const ciphertext = btoa(unescape(encodeURIComponent(encryptedText)));

  return {
    version: "Aether-E2EE-1.0",
    algorithm: "AES-256-GCM",
    keyId: groupKey.keyId,
    keyVersion: groupKey.version,
    iv,
    ciphertext
  };
};

/**
 * Decrypts a group chat message.
 */
export const decryptGroupMessage = (packet, groupKey) => {
  try {
    if (!packet || !packet.ciphertext) return "[Error: Empty Payload]";
    if (packet.keyId !== groupKey.keyId) {
      return `[Decryption Error: Key mismatch. Message encrypted with key ${packet.keyId}, active key is ${groupKey.keyId}]`;
    }

    const encryptedText = decodeURIComponent(escape(atob(packet.ciphertext)));
    return simpleCipher(encryptedText, groupKey.keyVal, true);
  } catch (err) {
    return "[Decryption Error: Group key invalidated]";
  }
};
