# Have I Been Pwned (HIBP) API Documentation

Version 3 - Current Version

## Overview

The API allows the list of pwned accounts (email addresses, usernames and phone numbers) to be quickly searched via a RESTful service.

---

## Authorization

Authorization is required for all APIs that enable searching HIBP by email address or domain:
- Retrieving all breaches for an account
- Retrieving all pastes for an account
- Retrieving all breached email addresses for a domain
- Retrieving all stealer log domains for a breached email addresses

**No authorization required** for the free Pwned Passwords API.

An HIBP subscription key is required and can be obtained on the API key page. The key is passed in a `hibp-api-key` header:

```http
GET https://haveibeenpwned.com/api/v3/{service}/{parameter}
hibp-api-key: [your key]
```

### Response Codes

| Code | Description |
|------|-------------|
| 200 | Ok — everything worked and there's a string array of pwned sites for the account |
| 400 | Bad request — the account does not comply with an acceptable format |
| 401 | Unauthorised — either no API key was provided or it wasn't valid |
| 403 | Forbidden — no user agent has been specified in the request |
| 404 | Not found — the account could not be found and has therefore not been pwned |
| 429 | Too many requests — the rate limit has been exceeded |
| 503 | Service unavailable — usually returned by Cloudflare if the underlying service is not available |

### Test API Key

Test keys can be used to query test accounts (domain: `hibp-integration-tests.com`):
```http
hibp-api-key: 00000000000000000000000000000000
```

---

## Specifying the API Version

Version 3 is required:
```http
GET https://haveibeenpwned.com/api/v3/{service}/{parameter}
```

---

## Specifying the User Agent

Each request must include a user agent header:
```http
GET https://haveibeenpwned.com/api/v3/{service}/{parameter}
user-agent: [your app name]
```

A missing user agent will result in HTTP 403.

---

## Endpoints

### 1. Breaches API

#### Getting all breaches for an account
```http
GET https://haveibeenpwned.com/api/v3/breachedaccount/{account}
```

Query Parameters:
| Parameter | Example | Description |
|-----------|---------|-------------|
| truncateResponse | ?truncateResponse=false | Returns full breach model (default: true - only breach names) |
| domain | ?domain=adobe.com | Filters results to breaches against the specified domain |
| IncludeUnverified | ?IncludeUnverified=false | Excludes unverified breaches (default: true) |

**Response (truncated):**
```json
[
  { "Name": "Adobe" },
  { "Name": "Gawker" }
]
```

**Response (full):**
```json
[
  {
    "Name": "Adobe",
    "Title": "Adobe",
    "Domain": "adobe.com",
    "BreachDate": "2013-10-04",
    "AddedDate": "2013-12-04T00:00:00Z",
    "ModifiedDate": "2022-05-15T23:52:49Z",
    "PwnCount": 152445165,
    "Description": "...",
    "DataClasses": ["Email addresses", "Passwords", "Usernames"],
    "IsVerified": true,
    "IsFabricated": false,
    "IsSensitive": false,
    "IsRetired": false,
    "IsSpamList": false,
    "IsMalware": false,
    "IsStealerLog": false,
    "IsSubscriptionFree": false,
    "LogoPath": "Adobe.png"
  }
]
```

#### Getting all breached email addresses for a domain
```http
GET https://haveibeenpwned.com/api/v3/breacheddomain/{domain}
```
Requires domain to be added to domain search dashboard after verifying control.

#### Getting all subscribed domains
```http
GET https://haveibeenpwned.com/api/v3/subscribeddomains
```

#### Getting all breached sites in the system
```http
GET https://haveibeenpwned.com/api/v3/breaches
```

Query Parameters:
| Parameter | Example | Description |
|-----------|---------|-------------|
| Domain | ?Domain=adobe.com | Filters by domain |
| IsSpamList | ?IsSpamList=true | Filters spam lists |

#### Getting a single breached site by name
```http
GET https://haveibeenpwned.com/api/v3/breach/{name}
```

#### Getting the most recently added breach
```http
GET https://haveibeenpwned.com/api/v3/latestbreach
```

#### Getting all data classes in the system
```http
GET https://haveibeenpwned.com/api/v3/dataclasses
```

---

### 2. Stealer Logs API

All stealer log APIs require Pwned 5 subscription or higher.

#### Getting all stealer log domains for an email address
```http
GET https://haveibeenpwned.com/api/v3/stealerlogsbyemail/{email address}
```

**Response:**
```json
["netflix.com", "spotify.com"]
```

#### Getting all stealer log email addresses for a website domain
```http
GET https://haveibeenpwned.com/api/v3/stealerlogsbywebsitedomain/{domain}
```

**Response:**
```json
["andy@gmail.com", "jane@gmail.com"]
```

#### Getting all stealer log email aliases for an email domain
```http
GET https://haveibeenpwned.com/api/v3/stealerlogsbyemaildomain/{domain}
```

**Response:**
```json
{
  "andy": ["netflix.com"],
  "jane": ["netflix.com", "spotify.com"]
}
```

---

### 3. Pastes API

#### Getting all pastes for an account
```http
GET https://haveibeenpwned.com/api/v3/pasteaccount/{account}
```

**Response:**
```json
[
  {
    "Source": "Pastebin",
    "Id": "8Q0BvKD8",
    "Title": "syslog",
    "Date": "2014-03-04T19:14:54Z",
    "EmailCount": 139
  }
]
```

---

### 4. Subscription API

#### Getting the subscription status
```http
GET https://haveibeenpwned.com/api/v3/subscription/status
```

**Response:**
```json
{
  "SubscriptionName": "Pwned 1",
  "Description": "...",
  "SubscribedUntil": "2025-01-01T00:00:00Z",
  "Rpm": 1,
  "DomainSearchMaxBreachedAccounts": 0,
  "IncludesStealerLogs": false
}
```

---

### 5. Pwned Passwords API (FREE - No API Key Required)

Each password is stored as both SHA-1 and NTLM hash.

#### Searching by range (k-Anonymity)
```http
GET https://api.pwnedpasswords.com/range/{first 5 hash chars}
```

**Response:**
```text
0018A45C4D1DEF81644B54AB7F969B88D65:1
00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2
011053FD0102E94D6AE2F8B83D76FAF94F6:1
```

- Pass first 5 characters of SHA-1 hash
- Response contains suffixes (35 chars for SHA-1, 27 chars for NTLM) + count
- Search for your full hash suffix in the response

#### Introducing padding
```http
GET https://api.pwnedpasswords.com/range/{prefix}
Add-Padding: true
```
Pads responses to 800-1000 results for enhanced privacy.

#### Searching for NTLM hashes
```http
GET https://api.pwnedpasswords.com/range/{first 5 chars}?mode=ntlm
```

---

## Test Accounts

All test accounts use domain: `hibp-integration-tests.com`

| Alias | Description |
|-------|-------------|
| account-exists | Returns one breach and one paste |
| multiple-breaches | Returns three breaches |
| not-active-and-active-breach | Returns one breach being "Adobe" |
| not-active-breach | Returns no breaches |
| opt-out | Returns no breaches and no pastes |
| opt-out-breach | Returns no breaches |
| paste-sensitive-breach | Returns no breaches and one paste |
| permanent-opt-out | Returns no breaches and no pastes |
| sensitive-and-other-breaches | Returns two non-sensitive breaches |
| sensitive-breach | Returns no breaches and no pastes |
| spam-list-only | Returns a single breach flagged as spam list |
| spam-list-and-others | Returns multiple breaches |
| subscription-free-and-other-breaches | Returns subscription-free and two other breaches |
| stealer-log | Returns single stealer log breach |
| subscription-free-breach | Returns single subscription-free breach |
| unverified-breach | Returns one unverified breach |

---

## Rate Limiting

- Breaches, pastes, and stealer log APIs are rate limited
- Rate limit depends on API key subscription level
- Response includes `retry-after` header
- Pwned Passwords API has **no rate limit**

---

## HTTPS

All API endpoints must use HTTPS. Only TLS 1.2 and 1.3 are supported.

---

## CORS

CORS is only supported for non-authenticated APIs. APIs requiring a key should not be hit directly from client side.

---

## License

- Breach & Paste APIs: Creative Commons Attribution 4.0 International License
- Pwned Passwords API: No licensing requirements

---

## Additional Notes

- Account is not case-sensitive
- Account should be URL encoded
- Leading/trailing whitespaces are trimmed
- Public API will not return accounts from sensitive or retired breaches
- By default, API returns unverified breaches (use `IncludeUnverified=false` to exclude)
