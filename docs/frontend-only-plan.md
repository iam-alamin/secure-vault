# Frontend-Only SecureVault Architecture Plan

## Overview
Transform SecureVault from a backend-dependent application to a fully client-side password manager using IndexedDB for storage.

## Current Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React UI     │─────▶│  Node Backend   │─────▶│  SQLite DB      │
│                 │      │  (Express)      │      │  (encrypted)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │ HIBP API        │
                        │ (breach check)  │
                        └─────────────────┘
```

## Target Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React UI      │─────▶│   IndexedDB     │      │   Crypto       │
│                 │      │   (browser)     │      │   (Web Crypto) │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│ HIBP Pwned     │                            │ Master Password│
│ Passwords API  │                            │ (PBKDF2 key)   │
└─────────────────┘                            └─────────────────┘
```

## Data Models

### IndexedDB Schema

```typescript
// Object Store: master_config
{
  id: 1,
  passwordHash: string,      // PBKDF2 derived key hash
  salt: string,              // For PBKDF2
  createdAt: string
}

// Object Store: credentials  
{
  id: number,                // Auto-increment
  siteName: string,
  siteUrl: string,
  username: string,
  encryptedPassword: string, // AES-256-GCM
  iv: string,                // Initialization vector
  authTag: string,           // Authentication tag
  breachStatus: 'safe' | 'compromised' | 'unknown',
  pwnedCount: number,       // Times found in breaches
  lastScanned: string | null,
  createdAt: string,
  updatedAt: string
}
```

## Implementation Steps

### Step 1: Create IndexedDB Service Layer
- File: `src/lib/indexeddb.ts`
- Initialize database with required object stores
- Implement CRUD operations for credentials
- Implement master password storage (hashed)

### Step 2: Create Crypto Service (Frontend)
- File: `src/lib/crypto-client.ts`
- Implement PBKDF2 key derivation from master password
- Implement AES-256-GCM encryption/decryption
- Reuse existing crypto utilities pattern

### Step 3: Update API Layer
- File: `src/lib/api.ts`
- Replace axios calls with IndexedDB operations
- Remove backend authentication endpoints
- Keep HIBP API calls (they're client-side anyway)

### Step 4: Update VaultTable Component
- Replace `getCredentials()` with IndexedDB calls
- Replace `createCredential()` with IndexedDB calls
- Implement in-memory decryption when needed

### Step 5: Update App Component
- Replace backend auth check with IndexedDB check
- Store master password in React state (session only)
- Remove backend dependency completely

### Step 6: Migrate HIBP Integration
- Keep `checkPasswordBreach()` function (works client-side!)
- Update to call directly from frontend
- Remove backend breach routes

## Key Differences from Backend Version

| Aspect | Backend | Frontend-Only |
|--------|---------|---------------|
| Storage | SQLite (file) | IndexedDB (browser) |
| Auth | JWT token | Session master password |
| Encryption | Backend does it | Frontend does it |
| Breach Scan | Backend calls HIBP | Frontend calls HIBP |
| Device Sync | Possible (future) | Not possible |
| Offline | No | Yes |

## Security Considerations

1. **Master Password**: Never stored - only derived key hash for verification
2. **Encryption Key**: Derived from master password using PBKDF2 (100k iterations)
3. **Credential Encryption**: AES-256-GCM with unique IV per credential
4. **Session**: Master password kept in React state only (cleared on refresh)
5. **Data at Rest**: Fully encrypted in IndexedDB

## HIBP Integration (No Changes Needed)

The Pwned Passwords API is already designed for client-side use:
- Uses k-Anonymity (only sends first 5 chars of SHA-1 hash)
- No API key required
- Free to use
- Already implemented in `backend/src/services/haveibeenpwned.ts`

## Migration Path

1. **Phase 1**: Dual support (try IndexedDB, fall back to backend)
2. **Phase 2**: Full frontend-only
3. **Phase 3**: Remove backend code entirely

## Files to Modify/Create

### New Files
- `src/lib/indexeddb.ts` - Database operations
- `src/lib/crypto-client.ts` - Client-side encryption

### Modified Files
- `src/lib/api.ts` - Replace with IndexedDB
- `src/App.tsx` - Change auth flow
- `src/components/VaultTable.tsx` - Change data operations
- `src/components/MasterLogin.tsx` - Change to IndexedDB auth
- `src/components/EmailLookup.tsx` - May need updates

### Files to Remove (later)
- `backend/` entire directory
- All backend-related documentation
