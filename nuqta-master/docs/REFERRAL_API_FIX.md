# Referral API Fix

## Issue
The referral page was throwing an error:
```
Error fetching referral data: TypeError: (0 , _servicesReferralApi.getReferralStats) is not a function
```

## Root Cause
The `referralApi.ts` file was only exporting a default service instance but the referral page (`app/referral.tsx`) was trying to import named exports that didn't exist:
- `getReferralStats`
- `getReferralHistory`
- `getReferralCode`
- `trackShare`
- `ReferralStats` type
- `ReferralHistoryItem` type

## Solution
Added the missing named exports to `services/referralApi.ts`:

1. **Added type alias for backward compatibility:**
   ```typescript
   export type ReferralStats = ReferralStatistics;
   ```

2. **Added wrapper functions as named exports:**
   - `getReferralStats()` - Maps to `getReferralStatistics()` and returns the data
   - `getReferralHistory()` - Returns the referrals array from the response
   - `getReferralCode()` - Generates referral link and formats the response
   - `trackShare()` - Wraps the share tracking functionality

3. **All functions include proper error handling** to return safe defaults if the API calls fail

## Files Modified
- `/services/referralApi.ts` - Added missing exports and type aliases

## Testing
The referral page should now load without errors and properly display:
- Referral statistics (total referrals, earnings, etc.)
- Referral history
- Referral code and sharing functionality

## Note
The bill upload page is working correctly and was not affected by this issue.