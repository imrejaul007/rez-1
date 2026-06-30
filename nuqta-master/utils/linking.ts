/**
 * Linking Utilities
 *
 * Safe wrappers around React Native's `Linking.openURL`. Adds:
 * - Input validation (rejects empty / non-string URLs)
 * - Scheme allow-listing (blocks unsafe schemes like `file:`, `javascript:`)
 * - Native error capture (returns a result object instead of throwing)
 * - Web fallbacks (Phase 6 — web parity): on web, `tel:` and `geo:` schemes
 *   can't open native apps, so we either show a modal with the number / URL,
 *   convert to a Google Maps URL, or silently no-op, depending on the
 *   `webFallback` option.
 *
 * The deep-link scheme `rez://` (from app.config.js) is always allowed so the
 * app can hand off routes to its own `Linking.addEventListener` handler.
 *
 * Usage:
 * ```ts
 * import { safeOpenURL } from '@/utils/linking';
 *
 * const result = await safeOpenURL('tel:+15551234567');
 * if (!result.ok) {
 *   // handle blocked-scheme / native-error
 * }
 *
 * // Phase 6 — web parity: with a web fallback
 * await safeOpenURL('tel:+15551234567', { webFallback: 'modal' });
 * await safeOpenURL('geo:12.97,77.59?q=12.97,77.59', { webFallback: 'maps' });
 * ```
 */

import { Linking, Platform } from 'react-native';
import { showAlert } from '@/stores/alertStore';

const DEFAULT_ALLOWED_SCHEMES = ['https:', 'tel:', 'mailto:', 'geo:', 'sms:'] as const;

// App's deep-link scheme — declared in app.config.js (`expo.scheme`).
// Always allowed so internal links like `rez://b/...` keep working.
const APP_DEEP_LINK_SCHEME = 'rez:';

export type WebFallback = 'maps' | 'modal' | 'silent' | 'mailto';

/**
 * Backward-compatible result type. Existing callers destructure `ok` /
 * `reason` and ignore extra fields. The `method` field is added in Phase 6
 * for callers that want to know which path ran.
 */
export type SafeOpenURLResult =
  | {
      ok: true;
      method?: 'native' | 'web-redirect' | 'web-modal' | 'web-maps' | 'web-mailto';
    }
  | {
      ok: false;
      reason: 'invalid-url' | 'blocked-scheme' | 'native-error' | 'scheme-blocked' | 'open-failed';
      error?: unknown;
    };

export interface SafeOpenURLOptions {
  /** Override the default allow-list (advanced). */
  allowedSchemes?: readonly string[];
  /** What to do on web when the native scheme isn't usable. */
  webFallback?: WebFallback;
  /** Title used by the modal fallback (e.g. "Call support"). */
  modalTitle?: string;
}

/**
 * Returns true if the URL uses one of the allowed schemes (or the app's own
 * deep-link scheme). Invalid URLs (unparseable, empty, non-string) return false.
 */
export function isAllowedScheme(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const scheme = new URL(url).protocol;
    if (scheme === APP_DEEP_LINK_SCHEME) return true;
    return (DEFAULT_ALLOWED_SCHEMES as readonly string[]).includes(scheme);
  } catch {
    return false;
  }
}

function getScheme(url: string): string | null {
  try {
    return new URL(url).protocol;
  } catch {
    // Fallback regex parser for malformed URLs (e.g. "tel:+1234" sometimes
    // gets rejected by older runtimes).
    const m = /^([a-z][a-z0-9+.-]*):/i.exec(url);
    return m ? m[1].toLowerCase() + ':' : null;
  }
}

/**
 * Open a URL with scheme validation, error capture, and web-fallback support.
 *
 * @param url URL to open
 * @param options.allowedSchemes Override the default allow-list (advanced)
 * @param options.webFallback Strategy for web-incompatible schemes:
 *   - `'maps'` (default for `geo:`): convert to a Google Maps web URL
 *   - `'modal'` (default for `tel:`): show a modal with the URL / number
 *   - `'mailto'`: open a prefilled mailto: link (alternative for `tel:`)
 *   - `'silent'`: succeed without any UI
 * @returns `SafeOpenURLResult` — never throws; on native failure returns
 *          `{ ok: false, reason: 'native-error', error }`.
 */
export async function safeOpenURL(
  url: string,
  options: SafeOpenURLOptions = {}
): Promise<SafeOpenURLResult> {
  if (!url || typeof url !== 'string') {
    return { ok: false, reason: 'invalid-url' };
  }

  const allowed = (options.allowedSchemes ?? DEFAULT_ALLOWED_SCHEMES) as readonly string[];

  let scheme: string | null;
  try {
    scheme = new URL(url).protocol;
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }

  if (scheme !== APP_DEEP_LINK_SCHEME && !allowed.includes(scheme)) {
    return { ok: false, reason: 'blocked-scheme' };
  }

  // Native path: pass through to Linking.openURL.
  if (Platform.OS !== 'web') {
    try {
      await Linking.openURL(url);
      return { ok: true, method: 'native' };
    } catch (error) {
      return { ok: false, reason: 'native-error', error };
    }
  }

  // Web path
  return openOnWeb(url, scheme, options);
}

function openOnWeb(
  url: string,
  scheme: string,
  options: SafeOpenURLOptions
): SafeOpenURLResult {
  // Schemes the browser handles natively.
  if (scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:') {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return { ok: true, method: 'native' };
    } catch (error) {
      return { ok: false, reason: 'open-failed', error };
    }
  }

  // tel: — the browser can't place a call. Show a modal with the number.
  if (scheme === 'tel:') {
    const fallback = options.webFallback ?? 'modal';
    if (fallback === 'mailto') {
      const number = url.replace(/^tel:/i, '').trim();
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(
        options.modalTitle ?? 'Phone number'
      )}&body=${encodeURIComponent(number)}`;
      try {
        window.open(mailtoUrl, '_self');
        return { ok: true, method: 'web-mailto' };
      } catch (error) {
        return { ok: false, reason: 'open-failed', error };
      }
    }
    if (fallback === 'silent') {
      return { ok: true, method: 'web-modal' };
    }
    const number = url.replace(/^tel:/i, '').trim();
    showAlert(
      options.modalTitle ?? 'Call this number',
      `Please dial this number on your phone:\n\n${number}`,
      [{ text: 'OK', style: 'default' }],
      'info'
    );
    return { ok: true, method: 'web-modal' };
  }

  // geo: — convert to a Google Maps web URL.
  if (scheme === 'geo:') {
    const fallback = options.webFallback ?? 'maps';
    if (fallback === 'modal') {
      // ponytail: scheme is geo:, only show the label portion from the parsed payload
      const label = (() => {
        const qIdx = url.indexOf('?q=');
        return qIdx >= 0 ? decodeURIComponent(url.slice(qIdx + 3).split('&')[0].split('(')[0]) : 'this location';
      })();
      showAlert(
        options.modalTitle ?? 'Location',
        `Open "${label}" in Google Maps on your phone.`,
        [{ text: 'OK', style: 'default' }],
        'info'
      );
      return { ok: true, method: 'web-modal' };
    }
    if (fallback === 'silent') {
      return { ok: true, method: 'web-maps' };
    }
    const payload = url.replace(/^geo:/i, '').trim();
    const [coordsPart] = payload.split('?');
    const [latStr, lngStr] = (coordsPart ?? '').split(',');
    const lat = Number((latStr ?? '').trim());
    const lng = Number((lngStr ?? '').trim());
    // Always use lat,lng query; never pass raw payload to avoid leaking unexpected URL content.
    const mapsUrl = Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1`; // safe fallback — no raw payload
    try {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      return { ok: true, method: 'web-maps' };
    } catch (error) {
      return { ok: false, reason: 'open-failed', error };
    }
  }

  // Other schemes (sms:, whatsapp:, rez:, etc.) — try the URL as-is; on
  // failure, surface a generic modal without echoing the raw URL.
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok: true, method: 'web-redirect' };
  } catch (error) {
    showAlert(
      options.modalTitle ?? 'Open link',
      'This link could not be opened on web. Please open it on your phone.',
      [{ text: 'OK', style: 'default' }],
      'info'
    );
    return { ok: true, method: 'web-modal' };
  }
}

/**
 * Convenience helper: open a phone number with a modal fallback on web.
 */
export async function safeCallPhone(
  phone: string,
  title?: string
): Promise<SafeOpenURLResult> {
  if (!phone) return { ok: false, reason: 'invalid-url' };
  return safeOpenURL(`tel:${phone}`, {
    allowedSchemes: ['tel:'],
    webFallback: 'modal',
    modalTitle: title ?? 'Call this number',
  });
}

/**
 * Convenience helper: open a geo: coordinate with a Google Maps fallback on web.
 */
export async function safeOpenGeo(
  latitude: number,
  longitude: number,
  label?: string
): Promise<SafeOpenURLResult> {
  if (
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return { ok: false, reason: 'invalid-url' };
  }
  const q = label
    ? `?q=${latitude},${longitude}(${encodeURIComponent(label)})`
    : `?q=${latitude},${longitude}`;
  return safeOpenURL(`geo:${latitude},${longitude}${q}`, {
    allowedSchemes: ['geo:', 'https:'],
    webFallback: 'maps',
  });
}

export default safeOpenURL;
