# ReZ Frontend Navigation Map

This document describes how to access all 38 new pages integrated into the rez-frontend app.

---

## Page Categories and Access Paths

### 1. Legal Pages

| Page | Route | How to Access |
|------|-------|---------------|
| About ReZ | `/legal/about` | Profile Menu > Legal > About ReZ |
| Terms & Conditions | `/legal/terms` | Profile Menu > Legal > Terms & Conditions |
| Privacy Policy | `/legal/privacy` | Profile Menu > Legal > Privacy Policy |
| Refund Policy | `/legal/refund-policy` | Profile Menu > Legal > Refund Policy |

---

### 2. Support Pages

| Page | Route | How to Access |
|------|-------|---------------|
| Support Index | `/support` | Account > Customer Support > Contact Support |
| Call Support | `/support/call` | Account > Customer Support > Call Support |
| Report Fraud | `/support/report-fraud` | Account > Customer Support > Report Fraud |
| Feedback | `/support/feedback` | Account > Customer Support > Feedback |
| Ticket Detail | `/support/ticket/[id]` | Support Index > View Ticket |

---

### 3. System Pages (Auto-Triggered)

| Page | Route | Trigger |
|------|-------|---------|
| Maintenance | `/system/maintenance` | API returns HTTP 503 (Service Unavailable) |
| App Update Required | `/system/app-update` | API returns HTTP 426 or version mismatch header |
| Notification Permission | `/onboarding/notification-permission` | Onboarding flow after location permission |

---

### 4. Authentication

| Page | Route | How to Access |
|------|-------|---------------|
| Account Recovery | `/account-recovery` | Sign In > "Can't access your account? Recover" |

---

### 5. Wallet Pages

| Page | Route | How to Access |
|------|-------|---------------|
| P2P Transfer | `/wallet/transfer` | Wallet Screen > Quick Actions > Transfer |
| Gift Coins | `/wallet/gift` | Wallet Screen > Quick Actions > Gift Coins |
| Expiry Tracker | `/wallet/expiry-tracker` | Wallet Screen > Quick Actions > Expiry |
| Gift Cards | `/wallet/gift-cards` | Wallet Screen > Quick Actions > Gift Cards |
| Scheduled Drops | `/wallet/scheduled-drops` | Wallet Screen > Quick Actions > Drops |

---

### 6. Search Pages

| Page | Route | How to Access |
|------|-------|---------------|
| AI Search | `/search/ai-search` | Search > Quick Search Actions > AI Search |
| Nearby Hotspots | `/search/hotspots` | Search > Quick Search Actions > Hotspots |

---

### 7. Offers Pages (Pre-Connected)

| Page | Route | How to Access |
|------|-------|---------------|
| AI Recommended | `/offers/ai-recommended` | Offers > Quick Offer Categories |
| Friends Redeemed | `/offers/friends-redeemed` | Offers > Quick Offer Categories |
| Double Cashback | `/offers/double-cashback` | Offers > Quick Offer Categories |
| Sponsored Cashback | `/offers/sponsored` | Offers > Quick Offer Categories |
| Birthday Rewards | `/offers/birthday` | Offers > Quick Offer Categories |

---

### 8. Offer Zones (Pre-Connected)

| Page | Route | How to Access |
|------|-------|---------------|
| Student Zone | `/offers/zones/student` | Offers > Exclusive Zones > Student |
| Employee Zone | `/offers/zones/employee` | Offers > Exclusive Zones > Employee |
| Women Zone | `/offers/zones/women` | Offers > Exclusive Zones > Women |
| Heroes Zone | `/offers/zones/heroes` | Offers > Exclusive Zones > Heroes |

---

### 9. Mall & Store Pages

| Page | Route | How to Access |
|------|-------|---------------|
| Alliance Stores | `/mall/alliance-store` | Mall Tab > Quick Access > Alliance |
| Lowest Price | `/mall/lowest-price` | Mall Tab > Quick Access > Lowest Price |
| Store EMI Info | `/store/emi-info` | Store Detail > EMI Info |

---

### 10. Social Pages

| Page | Route | How to Access |
|------|-------|---------------|
| Reels | `/social/reels` | Discover & Shop Section > Reels Button |
| Upload Content | `/social/upload` | Reels Screen > Upload Button |
| Comments | `/social/comments/[postId]` | Any Post > Comments Icon |

---

### 11. Earn Pages (Pre-Connected)

| Page | Route | How to Access |
|------|-------|---------------|
| Share to Earn | `/earn/share` | Earn Tab > Earning Opportunities > Share & Earn |
| Review to Earn | `/earn/review` | Earn Tab > Earning Opportunities > Review & Earn |

---

### 12. Checkout & Payments

| Page | Route | How to Access |
|------|-------|---------------|
| EMI Selection | `/checkout/emi-selection` | Checkout > Pay with EMI option |
| Refund Initiated | `/payments/refund-initiated` | Order Detail > Refund Status |

---

## Navigation Flow Diagrams

### Onboarding Flow
```
Sign Up → OTP Verification → Location Permission → Notification Permission → Home
```

### Support Flow
```
Profile Menu → Help & Support → Support Index
                            → Call Support
                            → Report Fraud
                            → Feedback
```

### Wallet Features Flow
```
Bottom Nav "Wallet" → Wallet Screen → Quick Actions → Transfer
                                                    → Gift
                                                    → Expiry
                                                    → Gift Cards
                                                    → Drops
```

### Legal Pages Flow
```
Profile Menu → Legal Section → About ReZ
                            → Terms & Conditions
                            → Privacy Policy
                            → Refund Policy
```

### System Pages Flow
```
API 503 Response → Maintenance Page → Retry → Home
API 426 Response → App Update Page → App Store
```

---

## Files Modified

1. `data/profileData.ts` - Added legal and support sections to profile menu
2. `data/accountData.ts` - Expanded customer support categories
3. `components/wallet/WalletQuickActions.tsx` - New wallet quick actions component
4. `app/WalletScreen.tsx` - Added WalletQuickActions
5. `components/mall/MallSectionContainer.tsx` - Added Alliance & Lowest Price links
6. `components/discover/DiscoverAndShopHeader.tsx` - Added Reels button
7. `services/apiClient.ts` - Added system page interceptors
8. `app/_layout.tsx` - Set up maintenance and version check callbacks

---

## Testing Pages

Access all test pages at: `/dev/test-pages`

This development screen provides quick access to all 38 pages organized by category for testing purposes.
