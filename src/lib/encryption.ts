/**
 * RestEasy — Client-Side Encryption (HIPAA Readiness)
 *
 * Architecture:
 * - AES-256-GCM encryption for sensitive health data before sending to Supabase
 * - Encryption key stored in iOS Keychain / Android Keystore via expo-secure-store
 * - Key rotation on first launch and annually
 * - All PHI (Protected Health Information) encrypted at rest and in transit
 *
 * HIPAA compliance notes:
 * - Data minimization: only collect what's needed for CBT-I
 * - Audit log: all data access logged to Supabase audit table
 * - Right to deletion: delete-account Edge Function wipes all data
 * - Data portability: export function returns decrypted JSON
 */
import * as SecureStore from 'expo-secure-store';

const KEY_ALIAS = 'resteasy_encryption_key_v2';
const KEY_ROTATION_DAYS = 365;

// ─── Key Management ───────────────────────────────────────────────────────────

async function getOrCreateRawKey(): Promise<Uint8Array> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_ALIAS);
    if (stored) {
      const parsed = JSON.parse(stored);
      const createdAt = new Date(parsed.created_at);
      const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < KEY_ROTATION_DAYS) {
        return Uint8Array.from(atob(parsed.key), c => c.charCodeAt(0));
      }
    }
  } catch {
    // Key doesn't exist yet or is corrupted — generate a new one
  }

  // Generate a cryptographically random 256-bit key
  const keyBytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(keyBytes);
  const keyBase64 = btoa(String.fromCharCode(...keyBytes));

  await SecureStore.setItemAsync(KEY_ALIAS, JSON.stringify({
    key: keyBase64,
    created_at: new Date().toISOString(),
    version: 2,
  }), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return keyBytes;
}

async function importKey(rawKey: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-GCM' }, false, usage
  );
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypts a string using AES-256-GCM.
 * Output: base64(iv [12 bytes] || ciphertext)
 */
export async function encryptValue(value: string): Promise<string> {
  const rawKey = await getOrCreateRawKey();
  const key = await importKey(rawKey, ['encrypt']);

  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const encoded = new TextEncoder().encode(value);
  const cipherBuf = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const combined = new Uint8Array(12 + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), 12);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptValue(encrypted: string): Promise<string> {
  const rawKey = await getOrCreateRawKey();
  const key = await importKey(rawKey, ['decrypt']);

  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts a full sleep entry object before sending to Supabase.
 * Only PHI fields are encrypted; metadata (dates, user_id) stays plain.
 */
export async function encryptSleepEntry(entry: Record<string, unknown>): Promise<Record<string, unknown>> {
  const PHI_FIELDS = ['bedtime', 'wake_time', 'out_of_bed_time'];
  const encrypted = { ...entry };

  for (const field of PHI_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptValue(encrypted[field] as string);
    }
  }

  encrypted['_encrypted'] = true;
  encrypted['_encryption_version'] = 2;

  return encrypted;
}

export async function decryptSleepEntry(entry: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!entry['_encrypted']) return entry;

  const PHI_FIELDS = ['bedtime', 'wake_time', 'out_of_bed_time'];
  const decrypted = { ...entry };

  for (const field of PHI_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = await decryptValue(decrypted[field] as string);
    }
  }

  return decrypted;
}

// ─── Data Export (GDPR / HIPAA Portability) ───────────────────────────────────

export async function exportUserData(entries: Record<string, unknown>[]): Promise<string> {
  const decrypted = await Promise.all(entries.map(decryptSleepEntry));
  return JSON.stringify({
    export_date: new Date().toISOString(),
    format_version: 2,
    data: decrypted,
  }, null, 2);
}
