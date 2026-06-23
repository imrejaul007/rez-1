/**
 * Brand Constants — Single Source of Truth
 *
 * To rebrand the app, change ONLY this file.
 * All user-facing strings, images, and links are derived from here.
 *
 * DO NOT change:
 * - Model enums ('nuqta', 'rez', 'promo', 'branded') — internal DB identifiers
 * - API query params (nuqtaPay=true) — API contracts
 * - Asset filenames (nuqta-coin.png) — referenced only via BRAND.COIN_IMAGE
 */

export const BRAND = {
  // App identity
  APP_NAME: 'Rez',
  TAGLINE: 'Shop Smart. Earn More.',

  // Coin naming
  COIN_NAME: 'Rez Coins',
  COIN_SINGLE: 'Rez Coin',
  COIN_SHORT: 'RC',

  // Product names
  PAY_NAME: 'Rez Pay',
  PRIVE_NAME: 'Rez Prive',

  // Routes (must match actual file names in app/)
  HOW_IT_WORKS_ROUTE: '/how-rez-works' as const,
  HOW_CASH_STORE_WORKS_ROUTE: '/how-cash-store-works' as const,

  // Deep link scheme (must match app.config.js `scheme` field)
  DEEP_LINK_SCHEME: 'rez',

  // Contact & links
  SUPPORT_EMAIL: 'support@rezapp.com',
  WEBSITE: 'https://www.rezapp.com',

  // Images — update require() paths here to swap visuals
  COIN_IMAGE: require('@/assets/images/nuqta-coin.png'),
  LOGO_IMAGE: require('@/assets/images/nuqta-logo.png'),

  // Default currency display code (shown in UI, not stored in DB)
  CURRENCY_CODE: 'RC',
} as const;

export type Brand = typeof BRAND;
