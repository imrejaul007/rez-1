# testID Props Required for Maestro E2E Tests

Add these `testID` props to the corresponding React Native components.
Maestro targets elements via `id:` which maps to the `testID` prop.

## Bottom Navigation (`components/navigation/BottomNavigation.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `tab-home` | Home tab touchable | |
| `tab-categories` | Categories tab touchable | |
| `tab-pay-in-store` | Center floating button | |
| `tab-explore` | Explore tab touchable | |
| `tab-earn` | Earn tab touchable | |

## Onboarding / Auth

### Registration (`app/onboarding/registration.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `registration-screen` | Root View | |
| `phone-input` | Phone TextInput | Already exists in e2e patterns |
| `email-input` | Email TextInput | |
| `referral-input` | Referral code TextInput | |
| `send-otp-button` | "Continue" / "Send OTP" button | |
| `phone-error` | Error text below phone | |
| `login-link` | "Sign In" link text | |

### Sign In (`app/sign-in.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `signin-screen` | Root View | |
| `phone-input` | Phone TextInput | Shared pattern |
| `send-otp-button` | "Send OTP" button | |
| `otp-input-0` through `otp-input-5` | 6 OTP digit inputs | Already defined |
| `verify-otp-button` | "Verify" button | |
| `resend-otp-button` | "Resend OTP" link | |

### OTP Verification (`app/onboarding/otp-verification.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `otp-verification-screen` | Root View | |
| `otp-input-0` to `otp-input-5` | Individual digit TextInputs | |
| `verify-otp-button` | Verify button | |
| `resend-otp-button` | Resend link | |
| `otp-error` | Error text | |

## Home Screen (`app/(tabs)/index.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `home-screen` | Root View | |
| `search-header` | Sticky search bar | |
| `cart-icon` | Cart icon button in header | |
| `cart-badge` | Red badge on cart icon showing item count | |
| `wallet-balance-chip` | Coin balance chip | Navigates to wallet |
| `notification-icon` | Bell icon in header | |

## Categories (`app/(tabs)/categories.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `categories-screen` | Root View | |
| `category-item-{index}` | Each category card (0-indexed) | |
| `category-{slug}` | Category by slug (e.g., `category-fitness`) | |

## Product List (category detail pages)
| testID | Element | Notes |
|--------|---------|-------|
| `product-list` | FlatList container | |
| `product-card-{index}` | Each product card (0-indexed) | |
| `store-card-{index}` | Each store card (0-indexed) | |
| `stores-list` | Store FlatList container | |

## Product Detail (`app/product-page.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `product-detail-screen` | Root View | |
| `add-to-cart-button` | "Add to Cart" / "ADD" button | |
| `quantity-increment` | "+" button on stepper | |
| `quantity-decrement` | "-" button on stepper | |
| `product-price` | Price display | |

## Added to Cart Modal (`components/cart/AddedToCartModal.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `added-to-cart-modal` | Modal container | |
| `view-cart-button` | "View Cart" button | |
| `continue-shopping-button` | "Continue Shopping" button | |

## Cart (`app/cart.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `cart-screen` | Root View | |
| `cart-item-{index}` | Each cart item row (0-indexed) | |
| `buy-now-button` | "Buy Now" sticky bottom button | |
| `cart-empty-state` | Empty cart view | |

## Checkout (`app/checkout.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `checkout-screen` | Root View | |
| `address-section` | Address card/section | |
| `address-list` | Address selection list | |
| `address-item-{index}` | Each address option (0-indexed) | |
| `promo-code-input` | Promo code TextInput | |
| `apply-promo-button` | "Apply" button next to promo | |
| `promo-applied-badge` | Applied promo indicator | |
| `payment-methods` | Payment methods container | |
| `payment-method-wallet` | Wallet payment option | |
| `payment-method-cod` | COD payment option | |
| `payment-method-upi` | UPI payment option | |
| `confirm-pay-button` | "Place Order" / "Confirm & Pay" button | |
| `order-confirmation-screen` | Success screen root | |
| `order-success-icon` | Success checkmark/icon | |

## Wallet (`app/wallet-screen.tsx`)
| testID | Element | Notes |
|--------|---------|-------|
| `wallet-screen` | Root View | |
| `wallet-balance-display` | Main balance number | |
| `add-money-button` | "Add Money" / recharge button | |

## Wallet Recharge
| testID | Element | Notes |
|--------|---------|-------|
| `recharge-screen` | Recharge modal/screen root | |
| `amount-option-120` | Preset 120 NC | |
| `amount-option-500` | Preset 500 NC | |
| `amount-option-1000` | Preset 1000 NC | |
| `amount-option-5000` | Preset 5000 NC | |
| `amount-option-10000` | Preset 10000 NC | |
| `custom-amount-input` | Custom amount TextInput | |
| `payment-method-upi` | UPI option | |
| `pay-button` | "Pay" / "Proceed" button | |
| `payment-success` | Payment success indicator | |

## Store Detail
| testID | Element | Notes |
|--------|---------|-------|
| `store-detail-screen` | Root View | |
| `book-now-button` | "Book Now" / "Book Service" CTA | |

## Booking Flow
| testID | Element | Notes |
|--------|---------|-------|
| `booking-screen` | Root View | |
| `date-option-{index}` | Date picker items (0=today, 1=tomorrow) | |
| `time-slot-{index}` | Available time slots (0-indexed) | |
| `confirm-booking-button` | "Confirm" / "Book Now" button | |
| `booking-confirmation-screen` | Success screen root | |
| `booking-success-icon` | Success checkmark/icon | |

---

## How to Add testIDs

```tsx
// Example: Add testID to a View
<View testID="cart-screen" style={styles.container}>

// Example: Add testID to a TouchableOpacity
<TouchableOpacity testID="buy-now-button" onPress={handleBuy}>

// Example: Add testID to a TextInput
<TextInput testID="phone-input" placeholder="Mobile number" />

// Example: Dynamic testID in a FlatList renderItem
<Pressable testID={`product-card-${index}`} onPress={() => navigateToProduct(item)}>

// Example: Bottom tab
<TouchableOpacity testID={`tab-${tabName}`} onPress={() => navigate(tab)}>
```

**Total testIDs to add: ~75 across 15 screens/components**
