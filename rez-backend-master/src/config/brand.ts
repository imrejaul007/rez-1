/**
 * Brand Constants — Single Source of Truth (Backend)
 *
 * To rebrand the app, change ONLY this file.
 * All user-facing strings in emails, push notifications, and error messages
 * are derived from here.
 *
 * DO NOT change:
 * - Model enums ('nuqta', 'rez', 'promo', 'branded') — internal DB identifiers
 * - API query params — API contracts
 */

export const BRAND = {
  APP_NAME: 'Rez',
  BRAND_NAME: 'Rez',
  COIN_NAME: 'Rez Coins',
  COIN_SINGLE: 'Rez Coin',
  COIN_SHORT: 'RC',
  PAY_NAME: 'Rez Pay',
  PRIVE_NAME: 'Rez Prive',
  SUPPORT_EMAIL: 'support@rezapp.com',
  WEBSITE: 'https://www.rezapp.com',
} as const;

export type Brand = typeof BRAND;
