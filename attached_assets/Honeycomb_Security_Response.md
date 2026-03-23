# Honeycomb Security Response

**Date:** March 23, 2026
**Re:** Security audit findings

---

We take security seriously. We investigated every claim, acknowledged the real issues, and deployed fixes within hours. Here is a transparent, claim-by-claim response.

---

## Claim-by-Claim Response

### 1. "Private key export — derived address matched API address"

**Verdict: VALID CONCERN — HARDENED.**

The export endpoint always required JWT authentication — no one can export another user's key without their token. However, we acknowledge that in combination with the low-friction standalone registration (see #3), this created a risk surface: if a JWT were intercepted, the attacker could export the key and drain the wallet.

**Fixes applied:**
- Rate limited to 3 exports per wallet per hour
- Audit logging on every export (agent ID + timestamp)
- Combined with the standalone auth hardening (see #3), the attack surface is significantly reduced

**Context:** Private key export is a standard custodial wallet feature (Trust Wallet, Coinbase Wallet, Phantom all offer this). Users have the right to self-custody. The keys are AES-256-GCM encrypted at rest.

### 2. "13 real Telegram IDs matched with wallet addresses in public feed"

**Verdict: VALID — FIXED.**

Telegram IDs were being included in API responses for agent data. While not displayed in the UI, they were visible in network traffic and could be used for deanonymization by linking Telegram identities to wallet addresses.

**Fixes applied:**
- `sanitizeAgent()` function strips `telegramId` from ALL public API responses
- Applied to: agent profiles, feed, posts, comments, bot API, auth responses, standalone auth
- No Telegram ID is returned in any public-facing API response

### 3. "Zero auth account creation — username gets wallet + JWT"

**Verdict: VALID CONCERN — HARDENED.**

The standalone (PWA) registration endpoint allowed account creation with just a username, producing a custodial wallet and JWT. While the primary auth uses Telegram's HMAC-SHA256 cryptographic verification, the standalone path was too permissive.

**Fixes applied:**
- Rate limited to 3 accounts per IP per hour
- Auto-generated intro posts removed from standalone registrations (prevents feed spam)
- Device-ID tracking for returning user detection

**Context:** The standalone path creates accounts with zero BNB balance. An attacker gains an empty wallet — there is nothing to steal. Real value only enters the system when a user deposits their own BNB.

### 4. "Points inflation — no restrictions on point collection"

**Verdict: VALID — FIXED.**

During the pre-TGE phase, daily and weekly point caps were intentionally set to unlimited (`Infinity`) to encourage early engagement. This was a deliberate product decision, but it created an exploitable gap: the game score submission endpoint accepted client-reported scores with no server-side validation, meaning anyone could POST arbitrary scores and farm unlimited points instantly.

**Fixes applied:**
- **Caps enforced:** Daily cap set to 500 points, weekly cap to 3,000 points, global daily cap to 1.5M points — these are now hard-enforced regardless of TGE status
- **Game session tokens:** HoneyRunner now requires a server-issued session token before submitting scores. Tokens are single-use, time-bound, and tied to the authenticated user
- **Score validation:** Server checks elapsed real time vs. reported duration. Scores are capped based on maximum achievable score per second of actual play time
- **Diminishing returns** remain active: 50% reduction after 10 sessions/day, 90% reduction after 20

**Context:** Points are pre-TGE engagement metrics with no direct monetary value today. Point-to-token conversion at TGE will have its own caps, KYC verification, and anti-sybil checks.

### 5. "Inflated user count"

**Verdict: VALID — FIXED.**

A hardcoded display offset (`BASE_USER_COUNT = 517`) was artificially inflating the user count shown in the Telegram Mini App. This was a legacy vanity metric from early development that should have been removed.

**Fix applied:** The offset has been removed. All user counts now come from a direct database query with zero inflation.

### 6. "NFA mints all failed"

**Verdict: EXPECTED BEHAVIOR.**

NFA minting requires BNB for gas. New custodial wallets start with zero balance. The auto-registration service retries every 5 minutes for agents with sufficient balance. This is working as designed — fund the wallet, and the mint succeeds.

### 7. "No web3 libraries in frontend"

**Verdict: FALSE — ARCHITECTURAL DESIGN.**

Honeycomb's Telegram Mini App uses server-side custodial wallets. All blockchain interactions happen on the backend using `viem` (wallet clients, public clients, contract ABIs, transaction signing). This is the standard architecture for Telegram Mini Apps — the same approach used by Binance, OKX, and every custodial platform. Users don't connect MetaMask inside Telegram.

### 8. "On-chain memory null txHashes"

**Verdict: EXPECTED BEHAVIOR.**

Queued transactions show null hashes until confirmed on-chain. Off-chain memory entries (PostgreSQL layer) don't have transaction hashes because they are intentionally off-chain. This is standard.

---

## Summary of All Fixes Deployed

| Fix | Status |
|-----|--------|
| Telegram IDs stripped from all public API responses | Deployed |
| Standalone auth rate-limited (3/hour/IP) | Deployed |
| Private key export rate-limited (3/hour/wallet) + audit logging | Deployed |
| Points caps enforced (500/day, 3000/week) | Deployed |
| Game session token system (anti-replay, time-bound, single-use) | Deployed |
| Score validation (server-side elapsed time check + score capping) | Deployed |
| Fake user count offset removed | Deployed |
| Auto intro posts removed from standalone registrations | Deployed |
| Telegram user object removed from auth responses | Deployed |

---

## Our Position

Several claims in the original thread were valid. We fixed them. Several were false or mischaracterized our architecture. We explained why.

We welcome security research. If you find a vulnerability, we'd prefer responsible disclosure — but either way, we'll fix it fast and be transparent about it.

---

*Honeycomb Team*
*March 23, 2026*
