import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { checkPasswordBreach } from '../services/haveibeenpwned';
import * as vault from '../services/vault';
import { decrypt } from '../services/crypto';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Decrypt password using the stored cipher and user's master password
 */
function decryptPassword(encryptedPassword: string, iv: string, authTag: string, masterPassword: string): string {
  return decrypt(encryptedPassword, iv, authTag, masterPassword);
}

/**
 * Backward-compatible scan endpoint that works with the new approach.
 * Requires masterPassword to decrypt credentials.
 */
export async function scanWithMasterPassword(req: AuthRequest, res: Response): Promise<void> {
  const { credentialId, masterPassword } = req.body;

  if (!masterPassword) {
    res.status(400).json({ 
      error: 'masterPassword is required for breach scanning',
      hint: 'Provide your master password to decrypt credentials for scanning'
    });
    return;
  }

  try {
    let credentials: vault.CredentialRow[];
    
    if (credentialId) {
      const cred = vault.getById(credentialId);
      if (!cred) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }
      credentials = [cred];
    } else {
      credentials = vault.getAll();
    }

    if (credentials.length === 0) {
      res.json({ results: [], message: 'No credentials to scan' });
      return;
    }

    const results: Array<{
      id: number;
      site_name: string;
      pwned: boolean;
      pwned_count: number;
    }> = [];

    for (const cred of credentials) {
      try {
        const password = decryptPassword(cred.encrypted_password, cred.iv, cred.auth_tag, masterPassword);
        const result = await checkPasswordBreach(password);
        vault.updatePwnedCount(cred.id, result.count);
        
        results.push({
          id: cred.id,
          site_name: cred.site_name,
          pwned: result.breached,
          pwned_count: result.count
        });

        await sleep(100);
      } catch (err) {
        console.error(`Failed to scan credential ${cred.id}:`, err);
        results.push({
          id: cred.id,
          site_name: cred.site_name,
          pwned: false,
          pwned_count: 0
        });
      }
    }

    const compromisedCount = results.filter(r => r.pwned).length;
    
    res.json({
      results,
      summary: {
        total: results.length,
        compromised: compromisedCount,
        safe: results.length - compromisedCount
      },
      message: `Scanned ${results.length} passwords, ${compromisedCount} found in breaches`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password scan failed';
    if (message.includes('Unsupported state') || message.includes('auth tag')) {
      res.status(401).json({ error: 'Invalid master password' });
      return;
    }
    res.status(500).json({ error: message });
  }
}

/**
 * Scan a single credential's password against the free Pwned Passwords API.
 */
export async function scanPassword(req: AuthRequest, res: Response): Promise<void> {
  const { credentialId, masterPassword } = req.body;

  if (!credentialId) {
    res.status(400).json({ error: 'credentialId is required' });
    return;
  }

  if (!masterPassword) {
    res.status(400).json({ error: 'masterPassword is required to decrypt and check password' });
    return;
  }

  try {
    const cred = vault.getById(credentialId);
    if (!cred) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const password = decryptPassword(cred.encrypted_password, cred.iv, cred.auth_tag, masterPassword);
    const result = await checkPasswordBreach(password);
    vault.updatePwnedCount(cred.id, result.count);

    res.json({
      id: cred.id,
      site_name: cred.site_name,
      pwned: result.breached,
      pwned_count: result.count,
      message: result.breached 
        ? `Password found in ${result.count} data breaches!`
        : 'Password not found in known breaches'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password scan failed';
    if (message.includes('Unsupported state') || message.includes('auth tag')) {
      res.status(401).json({ error: 'Invalid master password' });
      return;
    }
    res.status(500).json({ error: message });
  }
}

/**
 * Scan all credentials' passwords against the free Pwned Passwords API.
 */
export async function scanAllPasswords(req: AuthRequest, res: Response): Promise<void> {
  const { masterPassword } = req.body;

  if (!masterPassword) {
    res.status(400).json({ error: 'masterPassword is required to decrypt and check passwords' });
    return;
  }

  try {
    const credentials = vault.getAll();
    
    if (credentials.length === 0) {
      res.json({ results: [], message: 'No credentials to scan' });
      return;
    }

    const results: Array<{
      id: number;
      site_name: string;
      pwned: boolean;
      pwned_count: number;
    }> = [];

    for (const cred of credentials) {
      try {
        const password = decryptPassword(cred.encrypted_password, cred.iv, cred.auth_tag, masterPassword);
        const result = await checkPasswordBreach(password);
        vault.updatePwnedCount(cred.id, result.count);
        
        results.push({
          id: cred.id,
          site_name: cred.site_name,
          pwned: result.breached,
          pwned_count: result.count
        });

        await sleep(100);
      } catch (err) {
        console.error(`Failed to scan credential ${cred.id}:`, err);
        results.push({
          id: cred.id,
          site_name: cred.site_name,
          pwned: false,
          pwned_count: 0
        });
      }
    }

    const compromisedCount = results.filter(r => r.pwned).length;
    res.json({
      results,
      summary: {
        total: results.length,
        compromised: compromisedCount,
        safe: results.length - compromisedCount
      },
      message: `Scanned ${results.length} passwords, ${compromisedCount} found in breaches`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password scan failed';
    if (message.includes('Unsupported state') || message.includes('auth tag')) {
      res.status(401).json({ error: 'Invalid master password' });
      return;
    }
    res.status(500).json({ error: message });
  }
}

/**
 * Manual email breach lookup.
 */
export async function recordEmailBreaches(req: AuthRequest, res: Response): Promise<void> {
  const { email, breaches } = req.body;

  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  if (!Array.isArray(breaches) || breaches.length === 0) {
    res.status(400).json({ 
      error: 'breaches array is required (copy breach names from haveibeenpwned.com)',
      example: { email: 'user@example.com', breaches: ['Adobe', 'LinkedIn', 'Dropbox'] }
    });
    return;
  }

  try {
    const credentials = vault.getAll().filter(c => 
      c.username.toLowerCase() === email.toLowerCase()
    );

    if (credentials.length === 0) {
      res.status(404).json({ 
        error: 'No credentials found for this email',
        hint: 'Add credentials with this email address first, then record breaches'
      });
      return;
    }

    for (const cred of credentials) {
      vault.updateBreachStatus(cred.id, 'compromised');
    }

    res.json({
      email,
      breaches,
      credentials_updated: credentials.length,
      message: `Recorded ${breaches.length} breaches for ${credentials.length} credential(s)`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record breaches';
    res.status(500).json({ error: message });
  }
}

/**
 * Get breach status for all credentials
 */
export async function getBreachStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const credentials = vault.getAll();
    
    const results = credentials.map(({ encrypted_password, iv, auth_tag, ...cred }) => ({
      id: cred.id,
      site_name: cred.site_name,
      site_url: cred.site_url,
      username: cred.username,
      breach_status: cred.breach_status,
      pwned_count: cred.pwned_count,
      last_scanned: cred.last_scanned
    }));

    res.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get breach status';
    res.status(500).json({ error: message });
  }
}
