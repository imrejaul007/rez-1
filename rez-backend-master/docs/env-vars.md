# Environment Variables Reference

This document covers environment variables required for the REZ backend. Never commit actual values to git — set these via Render's Environment Group or your secret manager.

---

## Apple Universal Links (AASA)

The backend serves `/.well-known/apple-app-site-association` for iOS universal links. Each variable must be formatted as `TEAMID.bundleIdentifier` where `TEAMID` is the 10-character Apple Developer Team ID found at [developer.apple.com](https://developer.apple.com/account) under Membership.

| Variable | App | Bundle ID | Example value |
|---|---|---|---|
| `APPLE_APP_ID` | Consumer (Rez) | `money.rez.app` | `AB12CD34EF.money.rez.app` |
| `MERCHANT_APPLE_APP_ID` | Rez Merchant | `com.rez.merchant` | `AB12CD34EF.com.rez.merchant` |
| `ADMIN_APPLE_APP_ID` | Rez Admin | `com.rez.admin` | `AB12CD34EF.com.rez.admin` |

```
APPLE_APP_ID=TEAMID.money.rez.app
MERCHANT_APPLE_APP_ID=TEAMID.com.rez.merchant
ADMIN_APPLE_APP_ID=TEAMID.com.rez.admin
```

Replace `TEAMID` with your Apple Developer Team ID (10-character alphanumeric string).

If `APPLE_APP_ID` is not set or is set to `PLACEHOLDER_SET_ME`, the endpoint returns 404 — iOS will treat all deep links as unverified. `MERCHANT_APPLE_APP_ID` and `ADMIN_APPLE_APP_ID` are optional; entries are omitted from the AASA file when not set.

---

## Android App Links (assetlinks.json)

The backend serves `/.well-known/assetlinks.json` for Android App Links. SHA-256 fingerprints are obtained from the Play Console signing certificate or your local keystore.

| Variable | App | Package name |
|---|---|---|
| `ANDROID_SHA256_FINGERPRINT` | Consumer (Rez) | `money.rez.app` |
| `MERCHANT_ANDROID_SHA256_FINGERPRINT` | Rez Merchant | `com.rez.merchant` |
| `ADMIN_ANDROID_SHA256_FINGERPRINT` | Rez Admin | `com.rez.admin` |

```
ANDROID_SHA256_FINGERPRINT=AA:BB:CC:DD:...
MERCHANT_ANDROID_SHA256_FINGERPRINT=AA:BB:CC:DD:...
ADMIN_ANDROID_SHA256_FINGERPRINT=AA:BB:CC:DD:...
```

If `ANDROID_SHA256_FINGERPRINT` is not set or is `00:00:00:00`, the endpoint returns 404. Merchant and admin entries are optional — omitted when their respective env vars are not set.

---

## Notes

- All Apple App IDs must use the exact bundle identifiers from the app's `app.config.js`.
- Fingerprints must be colon-separated uppercase hex pairs (e.g. `AA:BB:CC:...`).
- Set all values in Render > Environment > Environment Groups to keep them out of git.
