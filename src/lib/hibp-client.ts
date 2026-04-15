/**
 * Have I Been Pwned Client (Frontend Version)
 * Uses k-Anonymity for privacy-preserving password checks
 * 
 * Communicates with backend Vercel API endpoint instead of using CORS proxies
 * This eliminates CORS issues and is much more reliable
 */

/**
 * Check if a password has been breached using k-Anonymity
 * Only sends first 5 characters of SHA-1 hash to the API
 * @returns Number of times password was found in breaches, or 0 if safe
 */
export async function checkPasswordBreach(password: string): Promise<number> {
  // Create SHA-1 hash of the password
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  // Split into prefix (first 5 chars) and suffix (remaining)
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);

  try {
    // Call our Vercel API endpoint instead of CORS proxies
    const response = await fetch('/api/breach-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hashPrefix: prefix }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // If response indicates breached, make another request to get the actual suffix list
    if (data.breached) {
      // Fetch the full HIBP response
      const hibpResponse = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      
      if (!hibpResponse.ok) {
        throw new Error(`HIBP API error: ${hibpResponse.status}`);
      }

      const text = await hibpResponse.text();
      const lines = text.split('\n');

      // Look for our suffix in the response
      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix && hashSuffix.trim() === suffix) {
          return parseInt(count.trim(), 10);
        }
      }
    }

    // Password not found in any breach
    return 0;
  } catch (error) {
    console.error('Error checking password breach:', error);
    throw error;
  }
}

/**
 * Check multiple passwords and return breach counts
 */
export async function checkMultiplePasswords(
  passwords: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  
  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    try {
      const count = await checkPasswordBreach(password);
      results.set(password, count);
    } catch (error) {
      console.error(`Error checking password:`, error);
      results.set(password, -1); // Error indicator
    }
    
    if (onProgress) {
      onProgress(i + 1, passwords.length);
    }
    
    // Add small delay to avoid rate limiting
    if (i < passwords.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * SHA-1 hash function (returns hex string)
 */
export async function sha1Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
