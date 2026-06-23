"use strict";
/**
 * User entity — canonical shape for the `users` collection.
 *
 * Mirrors rezbackend/src/models/User.ts (1200+ lines). Fields covered:
 *   - identity (phoneNumber, email, password)
 *   - profile (firstName, lastName, avatar, bio, location, locationHistory, jewelry)
 *   - preferences (notifications, categories, theme, currency)
 *   - auth (OTP, TOTP, PIN, login attempts, lock)
 *   - referral (code, referredBy, earnings, reward dedup flag)
 *   - verifications (8 exclusive zones with per-zone fields)
 *   - social logins (google, facebook)
 *   - role + status (active/suspended/inactive)
 *   - entitlement denormalizations (rezPlus, prive, loyalty tiers)
 *   - push tokens, patch tests, fraud flags
 *   - TOS / privacy acceptance
 *   - soft-delete
 *
 * The `wallet?` sub-doc is intentionally deprecated — live balances live
 * in the Wallet collection. See the `@deprecated` JSDoc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=user.js.map