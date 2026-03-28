import crypto from 'crypto';
import https from 'https';

/**
 * Check if a password has been exposed in a data breach using HIBP k-Anonymity.
 * 
 * This is a FREE API - no API key required!
 * 
 * How k-anonymity works:
 * 1. SHA-1 hash the password
 * 2. Send only the first 5 chars of the hash to HIBP
 * 3. HIBP returns all hash suffixes matching that prefix
 * 4. We check locally if our full hash suffix is in the returned list
 * 
 * The actual password is NEVER sent to HIBP.
 * 
 * @param password - The plain text password to check
 * @returns Object with breached status and count of times found
 */
export async function checkPasswordBreach(password: string): Promise<{
  breached: boolean;
  count: number;
}> {
  // SHA-1 hash the password and convert to uppercase hex
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.pwnedpasswords.com',
      path: `/range/${prefix}`,
      method: 'GET',
      headers: {
        'User-Agent': 'SecureVault-SchoolProject',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const lines = data.split('\n');
          for (const line of lines) {
            const [hashSuffix, count] = line.trim().split(':');
            if (hashSuffix === suffix) {
              resolve({ breached: true, count: parseInt(count, 10) });
              return;
            }
          }
          resolve({ breached: false, count: 0 });
        } else if (res.statusCode === 404) {
          // No results means password is not pwned
          resolve({ breached: false, count: 0 });
        } else {
          reject(new Error(`Pwned Passwords API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Check if an email has been involved in a data breach using HIBP v3 k-anonymity.
 * 
 * NOTE: This actually uses the Pwned Passwords API which checks passwords,
 * not emails. This function exists for backwards compatibility but should
 * not be used for email checking. Use checkEmailBreachAccount() with an API key instead.
 * 
 * @deprecated Use checkEmailBreachAccount() with an API key for email lookups
 */
export async function checkEmailBreach(email: string): Promise<{
  breached: boolean;
  breachCount: number;
}> {
  // This is a misunderstanding - the Pwned Passwords API checks passwords, not emails
  // Keeping for backwards compatibility but it's not the right use case
  const sha1 = crypto.createHash('sha1').update(email.toLowerCase().trim()).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.pwnedpasswords.com',
      path: `/range/${prefix}`,
      method: 'GET',
      headers: {
        'User-Agent': 'SecureVault-SchoolProject',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const lines = data.split('\n');
          for (const line of lines) {
            const [hashSuffix, count] = line.trim().split(':');
            if (hashSuffix === suffix) {
              resolve({ breached: true, breachCount: parseInt(count, 10) });
              return;
            }
          }
          resolve({ breached: false, breachCount: 0 });
        } else if (res.statusCode === 404) {
          resolve({ breached: false, breachCount: 0 });
        } else {
          reject(new Error(`HIBP API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Check email against HIBP breachedaccount endpoint (requires API key)
 */
export async function checkEmailBreachAccount(
  email: string,
  apiKey: string
): Promise<{ breached: boolean; breaches: string[] }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'haveibeenpwned.com',
      path: `/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=true`,
      method: 'GET',
      headers: {
        'User-Agent': 'SecureVault-SchoolProject',
        'hibp-api-key': apiKey,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const breaches = JSON.parse(data);
            resolve({
              breached: true,
              breaches: breaches.map((b: any) => b.Name),
            });
          } catch {
            reject(new Error('Failed to parse HIBP response'));
          }
        } else if (res.statusCode === 404) {
          resolve({ breached: false, breaches: [] });
        } else if (res.statusCode === 429) {
          reject(new Error('HIBP rate limit exceeded — try again later'));
        } else {
          reject(new Error(`HIBP API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
