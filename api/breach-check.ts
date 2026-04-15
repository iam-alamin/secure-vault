/**
 * Vercel API Route: /api/breach-check
 * 
 * Server-side password breach checking via Have I Been Pwned API
 * No CORS issues since this is server-to-server communication
 * 
 * Usage: POST /api/breach-check
 * Body: { passwordHash: string } (first 5 chars of SHA-1)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';

interface CheckResult {
  breached: boolean;
  count: number;
}

async function checkPasswordBreach(hashPrefix: string): Promise<CheckResult> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.pwnedpasswords.com',
      path: `/range/${hashPrefix}`,
      method: 'GET',
      headers: {
        'User-Agent': 'SecureVault',
      },
      timeout: 10000, // 10 second timeout
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HIBP API returned status ${res.statusCode}`));
          return;
        }

        // Parse response
        // Format: HASH_SUFFIX:COUNT\r\nHASH_SUFFIX:COUNT...
        resolve({
          breached: data.length > 0,
          count: data.split('\r\n').length,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { hashPrefix } = req.body;

    if (!hashPrefix || typeof hashPrefix !== 'string' || hashPrefix.length !== 5) {
      res.status(400).json({ error: 'Invalid hash prefix (must be 5 characters)' });
      return;
    }

    // Check against HIBP
    const result = await checkPasswordBreach(hashPrefix);

    res.status(200).json(result);
  } catch (error) {
    console.error('Breach check error:', error);
    res.status(500).json({
      error: 'Failed to check password breach',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
