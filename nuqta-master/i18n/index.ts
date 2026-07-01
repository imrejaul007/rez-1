/**
 * Internationalization (i18n) Utilities
 * Simple i18n implementation with RTL support
 */

import { useCallback, useMemo } from 'react';
import { I18nManager } from 'react-native';

// ============================================================================
// RTL Support
// ============================================================================

const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa', 'ps', 'sd'];

export function isRTLLocale(locale: string): boolean {
  const lang = locale.split('-')[0].toLowerCase();
  return RTL_LANGUAGES.includes(lang);
}

export function getDeviceLocale(): string {
  try {
    return I18nManager?.isRTL ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

// ============================================================================
// Translation Functions
// ============================================================================

type TranslationMap = Record<string, string | Record<string, unknown>>;

let currentLocale = 'en';
const translations: Record<string, TranslationMap> = {};

export function registerTranslations(locale: string, map: TranslationMap): void {
  translations[locale] = { ...translations[locale], ...map };
}

export function setLocale(locale: string): void {
  currentLocale = locale;
  I18nManager.forceRTL(isRTLLocale(locale));
}

export function getLocale(): string {
  return currentLocale;
}

function pluralize(key: string, count: number): string {
  const pluralSuffix = count === 1 ? '' : '_plural';
  const pluralKey = `${key}${pluralSuffix}`;
  return (translations[currentLocale]?.[pluralKey] as string) ?? (translations[currentLocale]?.[key] as string) ?? key;
}

function interpolate(str: string, values: Record<string, unknown>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? `{{${k}}}`));
}

export function t(key: string, values?: Record<string, unknown>): string {
  let translation = translations[currentLocale]?.[key];
  if (!translation && currentLocale !== 'en') {
    translation = translations['en']?.[key];
  }
  if (!translation || typeof translation !== 'string') {
    return key;
  }
  if (values?.count !== undefined) {
    translation = pluralize(key, values.count as number);
  }
  if (values) {
    translation = interpolate(translation, values);
  }
  return translation;
}

// ============================================================================
// React Hooks
// ============================================================================

export function useLocale() {
  return useMemo(() => ({
    locale: currentLocale,
    setLocale,
    isRTL: isRTLLocale(currentLocale),
  }), [currentLocale]);
}

export function useRTL() {
  return useMemo(() => ({
    isRTL: isRTLLocale(currentLocale),
    direction: isRTLLocale(currentLocale) ? 'row-reverse' : 'row',
    textAlign: isRTLLocale(currentLocale) ? 'right' : 'left',
    start: isRTLLocale(currentLocale) ? 'right' : 'left',
    end: isRTLLocale(currentLocale) ? 'left' : 'right',
    marginStart: isRTLLocale(currentLocale) ? 'marginRight' : 'marginLeft',
    paddingStart: isRTLLocale(currentLocale) ? 'paddingRight' : 'paddingLeft',
    arrowDirection: isRTLLocale(currentLocale) ? '←' : '→',
    backArrow: isRTLLocale(currentLocale) ? '→' : '←',
  }), [currentLocale]);
}

export function useTranslations() {
  const translate = useCallback((key: string, values?: Record<string, unknown>) => t(key, values), []);
  const locale = useLocale();
  const rtl = useRTL();
  return { t: translate, ...locale, ...rtl };
}

// ============================================================================
// Initialize
// ============================================================================

export { savingsTranslations } from './savings';
import { savingsTranslations } from './savings';
registerTranslations('en', savingsTranslations);
