# HIBP Integration Analysis for SecureVault

## Current Implementation Overview

Your SecureVault project already has a functional HIBP (Have I Been Pwned) integration! Here's what's currently implemented:

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SecureVault                               │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)                                               │
│    └─> VaultTable displays breach_status for each credential    │
├─────────────────────────────────────────────────────────────────┤
│  Backend API (Express)                                          │
│    POST /api/breach/scan → triggers breach scan                  │
├─────────────────────────────────────────────────────────────────┤
│  Services                                                        │
│    ├─ haveibeenpwned.ts (API client)                            │
│    ├─ scheduler.ts (cron job - every 6 hours)                  │
│    └─ vault.ts (database operations)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Have I Been Pwned API v3                           │
│                                                                 │
│  [Authenticated APIs - Require API Key]                         │
│  └─ GET /api/v3/breachedaccount/{email}                        │
│                                                                 │
│  [Free APIs - No Key Required]                                  │
│  └─ GET /api.pwnedpasswords.com/range/{prefix}                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Features

### 1. Breach Scanning
- **Single credential scan**: Scan one stored credential by ID
- **Bulk scan**: Scan all credentials on demand
- **Scheduled scan**: Automatic scan every 6 hours (configurable via `CRON_SCHEDULE`)

### 2. HIBP API Integration
Two implementations exist in [`haveibeenpwned.ts`](backend/src/services/haveibeenpwned.ts):

| Function | API Used | Key Required | Privacy |
|----------|----------|---------------|---------|
| `checkEmailBreach()` | Pwned Passwords (k-Anonymity) | ❌ No | ✅ Excellent - only 5 chars sent |
| `checkEmailBreachAccount()` | Breached Account | ✅ Yes | ⚠️ Email sent to HIBP |

### 3. Database Schema
The `credentials` table stores:
```sql
breach_status  -- 'safe' | 'compromised' | 'unknown'
last_scanned   -- ISO timestamp
```

---

## Current API Usage

### Endpoint: `POST /api/breach/scan`

**Request Body:**
```json
{
  "credentialId": 123  // optional - if omitted, scans all credentials
}
```

**Response:**
```json
{
  "id": 123,
  "breach_status": "compromised",
  "breaches": ["Adobe", "LinkedIn", "Dropbox"]
}
```

---

## Configuration Required

Create a `.env` file in the `backend/` directory with:

```env
PORT=3001
JWT_SECRET=your-random-secret-at-least-32-chars
ENCRYPTION_PEPPER=optional-extra-entropy
HIBP_API_KEY=your-hibp-api-key-here
CRON_SCHEDULE=0 */6 * * *
```

### Getting an HIBP API Key
1. Visit [haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key)
2. Choose a subscription plan (Pwned 1 starts at $3.90/month)
3. The key is a 32-character hexadecimal string

---

## Recommendations for Enhancement

### 1. **Use k-Anonymity for Better Privacy** (Priority: High)

Currently, the authenticated API sends emails directly to HIBP. Consider using the k-Anonymity approach for better privacy:

```typescript
// Already implemented in checkEmailBreach()
// SHA-1 hash the email, send only first 5 chars
// HIBP returns all matching suffixes
// Check locally if full hash exists in response
```

**Benefits:**
- No API key required (free)
- Email never leaves your server
- Better for user privacy

**Trade-offs:**
- Only tells you IF email was pwned, not WHERE
- Returns only breach count, not breach names

### 2. **Add Breach Details to Response** (Priority: Medium)

Currently returns only breach names. Consider fetching full breach details:

```typescript
// GET /api/v3/breach/{name}
const breachDetails = await fetchBreachDetails('Adobe');
// Returns: domain, date, data classes, description, etc.
```

### 3. **Implement Rate Limiting Handling** (Priority: Medium)

The current implementation has basic rate limit handling (1.5s delay between requests). Consider:
- Exponential backoff on 429 responses
- Queue system for bulk scans
- Cache results to reduce API calls

### 4. **Add Pwned Passwords Check** (Priority: High)

When users create/update passwords, check if they've been pwned:

```typescript
// Free API - no key required
async function checkPasswordPwned(password: string): Promise<number> {
  const sha1 = crypto.createHash('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase();
  
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);
  
  // GET https://api.pwnedpasswords.com/range/{prefix}
  // Search response for suffix, return count
}
```

### 5. **Add Email Notifications** (Priority: Low)

Alert users when their credentials are found in new breaches:
- Store last scan timestamp
- Compare new breaches against previous scan
- Send notification for new breaches only

---

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/breach/scan` | POST | JWT | Scan credentials for breaches |
| `/api/v3/breachedaccount/{email}` | GET | API Key | Get all breaches for email |
| `/api/v3/breach/{name}` | GET | API Key | Get breach details by name |
| `/api/v3/breaches` | GET | API Key | Get all breaches in system |
| `/api/v3/dataclasses` | GET | API Key | Get all data classes |
| `/api.pwnedpasswords.com/range/{prefix}` | GET | None | Check password (k-Anonymity) |

---

## Testing the Integration

### Test Accounts (No API Key Required)
Use these emails on `hibp-integration-tests.com` domain:

| Email | Expected Result |
|-------|-----------------|
| `account-exists@hibp-integration-tests.com` | 1 breach, 1 paste |
| `multiple-breaches@hibp-integration-tests.com` | 3 breaches |
| `stealer-log@hibp-integration-tests.com` | 1 stealer log |
| `sensitive-breach@hibp-integration-tests.com` | No results (sensitive) |

### Test API Key Format
```
00000000000000000000000000000000
```

---

## Files Reference

| File | Purpose |
|------|---------|
| [`backend/src/services/haveibeenpwned.ts`](backend/src/services/haveibeenpwned.ts) | HIBP API client |
| [`backend/src/services/scheduler.ts`](backend/src/services/scheduler.ts) | Cron job for periodic scans |
| [`backend/src/controllers/breachController.ts`](backend/src/controllers/breachController.ts) | API endpoint handlers |
| [`backend/src/routes/breachRoutes.ts`](backend/src/routes/breachRoutes.ts) | Route definitions |
| [`docs/haveibeenpwned-api.md`](docs/haveibeenpwned-api.md) | Full HIBP API documentation |
| [`backend/.env.example`](backend/.env.example) | Environment variables template |

---

## Quick Start

1. Get an HIBP API key from [haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key)
2. Add to your `.env` file: `HIBP_API_KEY=your-key`
3. Start the backend: `cd backend && bun run src/index.ts`
4. Trigger a scan: `POST /api/breach/scan`
5. View results in the Vault UI (breach status column)
