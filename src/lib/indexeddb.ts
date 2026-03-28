/**
 * IndexedDB Storage Layer for SecureVault
 * Replaces backend SQLite with browser IndexedDB
 */

import { encrypt, decrypt, hashPassword } from './crypto-client';

// Database configuration
const DB_NAME = 'securevault';
const DB_VERSION = 1;

export interface StoredCredential {
  id?: number;
  site_name: string;
  site_url: string;
  username: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
  breach_status: 'safe' | 'compromised' | 'unknown';
  pwned_count: number;
  last_scanned: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterConfig {
  id: number;
  password_hash: string;
  salt: string;
  created_at: string;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB and create object stores
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Master config store
      if (!database.objectStoreNames.contains('master_config')) {
        database.createObjectStore('master_config', { keyPath: 'id' });
      }

      // Credentials store with auto-increment
      if (!database.objectStoreNames.contains('credentials')) {
        const credentialsStore = database.createObjectStore('credentials', {
          keyPath: 'id',
          autoIncrement: true,
        });
        credentialsStore.createIndex('site_name', 'site_name', { unique: false });
        credentialsStore.createIndex('breach_status', 'breach_status', { unique: false });
      }
    };
  });
}

/**
 * Get database instance
 */
export function getDB(): IDBDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Check if vault is configured (master password set)
 */
export async function isVaultConfigured(): Promise<boolean> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('master_config', 'readonly');
    const store = transaction.objectStore('master_config');
    const request = store.get(1);

    request.onsuccess = () => {
      resolve(!!request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Setup master password for the first time
 */
export async function setupMasterPassword(password: string): Promise<void> {
  const database = getDB();
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('master_config', 'readwrite');
    const store = transaction.objectStore('master_config');
    const request = store.put({
      id: 1,
      password_hash: passwordHash,
      salt,
      created_at: new Date().toISOString(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Verify master password
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const database = getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('master_config', 'readonly');
    const store = transaction.objectStore('master_config');
    const request = store.get(1);

    request.onsuccess = async () => {
      const config = request.result as MasterConfig | undefined;
      if (!config) {
        resolve(false);
        return;
      }

      const hash = await hashPassword(password, config.salt);
      resolve(hash === config.password_hash);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all credentials (without decrypted passwords)
 */
export async function getCredentials(): Promise<StoredCredential[]> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('credentials', 'readonly');
    const store = transaction.objectStore('credentials');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single credential by ID (without decrypted password)
 */
export async function getCredentialById(id: number): Promise<StoredCredential | null> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('credentials', 'readonly');
    const store = transaction.objectStore('credentials');
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a new credential
 */
export async function addCredential(
  data: {
    site_name: string;
    site_url: string;
    username: string;
    password: string;
  },
  masterPassword: string
): Promise<number> {
  const database = getDB();
  const { ciphertext, iv, authTag } = await encrypt(data.password, masterPassword);
  const now = new Date().toISOString();

  const credential: Omit<StoredCredential, 'id'> = {
    site_name: data.site_name,
    site_url: data.site_url,
    username: data.username,
    encrypted_password: ciphertext,
    iv,
    auth_tag: authTag,
    breach_status: 'unknown',
    pwned_count: 0,
    last_scanned: null,
    created_at: now,
    updated_at: now,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('credentials', 'readwrite');
    const store = transaction.objectStore('credentials');
    const request = store.add(credential);

    request.onsuccess = () => {
      resolve(request.result as number);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing credential
 */
export async function updateCredential(
  id: number,
  data: Partial<{
    site_name: string;
    site_url: string;
    username: string;
    password: string;
  }>,
  masterPassword: string
): Promise<void> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('credentials', 'readwrite');
    const store = transaction.objectStore('credentials');
    const getRequest = store.get(id);

    getRequest.onsuccess = async () => {
      const existing = getRequest.result as StoredCredential;
      if (!existing) {
        reject(new Error('Credential not found'));
        return;
      }

      const updates: Partial<StoredCredential> = {
        updated_at: new Date().toISOString(),
      };

      if (data.site_name !== undefined) updates.site_name = data.site_name;
      if (data.site_url !== undefined) updates.site_url = data.site_url;
      if (data.username !== undefined) updates.username = data.username;
      if (data.password !== undefined) {
        const { ciphertext, iv, authTag } = await encrypt(data.password, masterPassword);
        updates.encrypted_password = ciphertext;
        updates.iv = iv;
        updates.auth_tag = authTag;
      }

      const putRequest = store.put({ ...existing, ...updates });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete a credential
 */
export async function deleteCredential(id: number): Promise<void> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('credentials', 'readwrite');
    const store = transaction.objectStore('credentials');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Reveal password for a credential (decrypt)
 */
export async function revealPassword(id: number, masterPassword: string): Promise<string> {
  const credential = await getCredentialById(id);
  if (!credential) {
    throw new Error('Credential not found');
  }

  return decrypt(
    credential.encrypted_password,
    credential.iv,
    credential.auth_tag,
    masterPassword
  );
}

/**
 * Update breach status for a credential
 */
export async function updateBreachStatus(
  id: number,
  status: 'safe' | 'compromised' | 'unknown',
  pwnedCount: number = 0
): Promise<void> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('credentials', 'readwrite');
    const store = transaction.objectStore('credentials');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as StoredCredential;
      if (!existing) {
        reject(new Error('Credential not found'));
        return;
      }

      existing.breach_status = status;
      existing.pwned_count = pwnedCount;
      existing.last_scanned = new Date().toISOString();
      existing.updated_at = new Date().toISOString();

      const putRequest = store.put(existing);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get breach status for all credentials
 */
export async function getBreachStatus(): Promise<{
  safe: number;
  compromised: number;
  unknown: number;
}> {
  const credentials = await getCredentials();

  return {
    safe: credentials.filter((c) => c.breach_status === 'safe').length,
    compromised: credentials.filter((c) => c.breach_status === 'compromised').length,
    unknown: credentials.filter((c) => c.breach_status === 'unknown').length,
  };
}

/**
 * Clear all data (for reset)
 */
export async function clearAllData(): Promise<void> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ['master_config', 'credentials'],
      'readwrite'
    );

    transaction.objectStore('master_config').clear();
    transaction.objectStore('credentials').clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
