/**
 * Have I Been Pwned Client (Frontend Version)
 * Uses k-Anonymity for privacy-preserving password checks
 * Free API - no key required
 * 
 * Multiple CORS proxies with fallback for reliability
 */

// Multiple CORS proxy options with fallback
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
];

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';

let currentProxyIndex = 0;

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

  // Add delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try with current proxy, with fallback to other proxies
  let lastError: Error | null = null;
  
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      const proxyUrl = CORS_PROXIES[(currentProxyIndex + i) % CORS_PROXIES.length];
      const fullUrl = proxyUrl.includes('url=') 
        ? `${proxyUrl}${HIBP_API_URL}${prefix}`
        : `${proxyUrl}${HIBP_API_URL}${prefix}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SecureVault-PasswordChecker',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HIBP API error: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n');

      // Look for our suffix in the response
      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix && hashSuffix.trim() === suffix) {
          // Update current proxy index for next request
          currentProxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
          return parseInt(count.trim(), 10);
        }
      }

      // Password not found in any breach
      currentProxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
      return 0;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Proxy attempt ${i + 1} failed (${CORS_PROXIES[(currentProxyIndex + i) % CORS_PROXIES.length]}):`, lastError.message);
      
      // Don't retry immediately, add delay between proxy attempts
      if (i < CORS_PROXIES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // All proxies failed
  throw lastError || new Error('All CORS proxies failed');
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
