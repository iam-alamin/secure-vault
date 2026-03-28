/**
 * SecureVault API Layer (Frontend-Only Version)
 * Uses IndexedDB for storage instead of backend
 */

import {
  initDB,
  isVaultConfigured,
  setupMasterPassword as setupPasswordFn,
  verifyMasterPassword,
  getCredentials as getAllCredentials,
  addCredential as addCredentialFn,
  updateCredential as updateCredentialFn,
  deleteCredential as deleteCredentialFn,
  revealPassword as revealPasswordFromDB,
  updateBreachStatus,
  getBreachStatus,
  StoredCredential,
} from './indexeddb';
import { checkPasswordBreach } from './hibp-client';

// Master password stored in memory (session only)
let masterPassword: string | null = null;

/**
 * Initialize the local database
 */
export async function initializeApp(): Promise<void> {
  await initDB();
}

/**
 * Check if vault is configured (first run)
 */
export async function checkAuthStatus(): Promise<{ isConfigured: boolean }> {
  await initDB();
  const configured = await isVaultConfigured();
  return { isConfigured: configured };
}

/**
 * Setup master password (first time)
 */
export async function setupMaster(password: string): Promise<{ token: string }> {
  await initDB();
  await setupPasswordFn(password);
  masterPassword = password;
  return { token: `vault-${Date.now()}` };
}

/**
 * Login with master password
 */
export async function login(password: string): Promise<{ token: string }> {
  await initDB();
  const isValid = await verifyMasterPassword(password);
  if (!isValid) {
    throw new Error('Invalid master password');
  }
  masterPassword = password;
  return { token: `vault-${Date.now()}` };
}

/**
 * Clear session (logout)
 */
export function clearToken(): void {
  masterPassword = null;
}

/**
 * Get stored master password (for operations requiring decryption)
 */
export function getMasterPassword(): string | null {
  return masterPassword;
}

/**
 * Set master password in memory
 */
export function setMasterPassword(password: string): void {
  masterPassword = password;
}

/**
 * Convert stored credential to frontend format
 */
function toCredentialFormat(c: StoredCredential) {
  return {
    id: c.id,
    site_name: c.site_name,
    site_url: c.site_url,
    username: c.username,
    breach_status: c.breach_status,
    pwned_count: c.pwned_count,
    last_scanned: c.last_scanned,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

// Credentials API

/**
 * Get all credentials
 */
export async function getCredentials(): Promise<ReturnType<typeof toCredentialFormat>[]> {
  const credentials = await getAllCredentials();
  return credentials.map(toCredentialFormat);
}

/**
 * Create a new credential
 */
export async function createCredential(data: {
  site_name: string;
  site_url: string;
  username: string;
  password: string;
}): Promise<{ id: number }> {
  if (!masterPassword) {
    throw new Error('Not authenticated');
  }
  const id = await addCredentialFn(data, masterPassword);
  return { id };
}

/**
 * Update a credential
 */
export async function updateCredential(
  id: number,
  data: Partial<{
    site_name: string;
    site_url: string;
    username: string;
    password: string;
  }>
): Promise<{ id: number }> {
  if (!masterPassword) {
    throw new Error('Not authenticated');
  }
  await updateCredentialFn(id, data, masterPassword);
  return { id };
}

/**
 * Delete a credential
 */
export async function deleteCredential(id: number): Promise<void> {
  await deleteCredentialFn(id);
}

/**
 * Reveal password (decrypt)
 */
export async function revealPassword(id: number): Promise<{ password: string }> {
  if (!masterPassword) {
    throw new Error('Not authenticated');
  }
  const password = await revealPasswordFromDB(id, masterPassword);
  return { password };
}

// Breach API

/**
 * Scan all credentials for breaches
 */
export async function scanBreaches(masterPasswordParam?: string): Promise<void> {
  // Use provided password or stored one
  const password = masterPasswordParam || masterPassword;
  if (!password) {
    throw new Error('Master password required');
  }

  const credentials = await getAllCredentials();
  
  for (const cred of credentials) {
    if (!cred.id) continue;
    try {
      // Decrypt password to check it
      const decryptedPassword = await revealPasswordFromDB(cred.id, password);
      
      // Check against HIBP
      const pwnedCount = await checkPasswordBreach(decryptedPassword);
      
      // Update breach status
      const status = pwnedCount > 0 ? 'compromised' : 'safe';
      await updateBreachStatus(cred.id, status, pwnedCount);
    } catch (error) {
      console.error(`Error scanning credential ${cred.id}:`, error);
    }
  }
}

/**
 * Scan a single credential for breach
 */
export async function scanSingleBreach(credentialId: number, password: string): Promise<{
  status: 'safe' | 'compromised';
  pwnedCount: number;
}> {
  const pwnedCount = await checkPasswordBreach(password);
  const status = pwnedCount > 0 ? 'compromised' : 'safe';
  
  await updateBreachStatus(credentialId, status, pwnedCount);
  
  return { status, pwnedCount };
}

/**
 * Get breach status summary
 */
export async function getBreachStatusAPI(): Promise<{
  safe: number;
  compromised: number;
  unknown: number;
}> {
  return getBreachStatus();
}

// Legacy exports for compatibility
export const setToken = (_token: string | null) => {
  // No-op in frontend-only mode - token is internal
};
export const getToken = () => 'local-vault';
export const getMockCredentials = () => [];
export const addMockCredential = () => null;
export const updateMockCredential = () => null;
export const deleteMockCredential = () => false;
export const mockScanBreaches = () => [];
export const recordEmailBreaches = () => Promise.resolve();
export const getBreachStatus2 = getBreachStatusAPI;
export const getCredentials2 = getCredentials;
export const createCredential2 = createCredential;
export const updateCredential2 = updateCredential;
export const deleteCredential2 = deleteCredential;
