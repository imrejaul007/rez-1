/**
 * Auth Storage Utilities
 * Handles auth token storage for both web and native platforms
 * - Web: localStorage
 * - Native: expo-secure-store (encrypted keychain/keystore)
 *
 * Migration: Users upgrading from AsyncStorage-only will have tokens migrated
 * on first read, then removed from AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Import SecureStore with fallback for environments where it's not available
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store');
  } catch (_error) {
    // SecureStore not available — will fall back to AsyncStorage
  }
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'auth_user',
};

const isWeb = Platform.OS === 'web';
const hasLocalStorage = isWeb && typeof window !== 'undefined' && !!window.localStorage;

// ── Secure Store helpers (native only) ──

/**
 * Write a value to SecureStore. Falls back silently on failure.
 * Returns true if SecureStore write succeeded.
 */
async function secureSet(key: string, value: string): Promise<boolean> {
  if (!SecureStore) return false;
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (_error) {
    // SecureStore can fail on some Android devices (no hardware-backed keystore,
    // rooted devices, etc.). Fall through to AsyncStorage.
    return false;
  }
}

/**
 * Read a value from SecureStore. Returns null on failure or if not found.
 */
async function secureGet(key: string): Promise<string | null> {
  if (!SecureStore) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch (_error) {
    return null;
  }
}

/**
 * Delete a value from SecureStore. Silently ignores failures.
 */
async function secureDelete(key: string): Promise<void> {
  if (!SecureStore) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (_error) {
    // Ignore — value may not exist or SecureStore unavailable
  }
}

// ── Native read with migration ──

/**
 * Read a value on native: tries SecureStore first, then falls back to
 * AsyncStorage (migration path for users who had tokens before SecureStore
 * was introduced). If found only in AsyncStorage, promotes to SecureStore.
 */
async function nativeGet(key: string): Promise<string | null> {
  // Try SecureStore first
  const secureValue = await secureGet(key);
  if (secureValue) return secureValue;

  // Fallback: read from AsyncStorage (migration)
  const asyncValue = await AsyncStorage.getItem(key);
  if (asyncValue) {
    // Promote to SecureStore for future reads
    await secureSet(key, asyncValue);
  }
  return asyncValue;
}

/**
 * Write a value on native: writes to SecureStore only.
 */
async function nativeSet(key: string, value: string): Promise<void> {
  await secureSet(key, value);
  await AsyncStorage.removeItem(key);
}

/**
 * Delete a value on native: removes from both SecureStore and AsyncStorage.
 */
async function nativeDelete(key: string): Promise<void> {
  await secureDelete(key);
  await AsyncStorage.removeItem(key);
}

// ── Public API ──

/**
 * Save auth token
 * On web: localStorage only
 * On native: SecureStore only
 */
export async function saveAuthToken(token: string): Promise<void> {
  if (isWeb) {
    if (hasLocalStorage) {
      window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }
  } else {
    await nativeSet(STORAGE_KEYS.ACCESS_TOKEN, token);
  }
}

/**
 * Save refresh token
 */
export async function saveRefreshToken(token: string): Promise<void> {
  if (isWeb) {
    if (hasLocalStorage) {
      window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    }
  } else {
    await nativeSet(STORAGE_KEYS.REFRESH_TOKEN, token);
  }
}

/**
 * Save user data
 */
export async function saveUser(user: any): Promise<void> {
  const userString = JSON.stringify(user);
  if (isWeb) {
    if (hasLocalStorage) {
      window.localStorage.setItem(STORAGE_KEYS.USER, userString);
    }
  } else {
    await nativeSet(STORAGE_KEYS.USER, userString);
  }
}

/**
 * Get auth token
 * On web: Reads from localStorage
 * On native: Tries SecureStore first, then AsyncStorage (migration)
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (isWeb) {
      if (hasLocalStorage) {
        const localStorageToken = window.localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (localStorageToken) return localStorageToken;
      }
      return null;
    }
    return await nativeGet(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (_error) {
    return null;
  }
}

/**
 * Get refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      if (hasLocalStorage) {
        const localStorageToken = window.localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (localStorageToken) return localStorageToken;
      }
      return null;
    }
    return await nativeGet(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (_error) {
    return null;
  }
}

/**
 * Get user data
 */
export async function getUser(): Promise<any | null> {
  try {
    let userString: string | null = null;

    if (isWeb) {
      if (hasLocalStorage) {
        const localStorageUser = window.localStorage.getItem(STORAGE_KEYS.USER);
        if (localStorageUser) return JSON.parse(localStorageUser);
      }
      userString = null;
    } else {
      userString = await nativeGet(STORAGE_KEYS.USER);
    }

    return userString ? JSON.parse(userString) : null;
  } catch (_error) {
    return null;
  }
}

/**
 * Clear all auth data
 */
export async function clearAuthData(): Promise<void> {
  // Remove any legacy AsyncStorage keys.
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);

  if (isWeb) {
    // Clear localStorage on web
    if (hasLocalStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      window.localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } else {
    // Clear SecureStore on native
    await secureDelete(STORAGE_KEYS.ACCESS_TOKEN);
    await secureDelete(STORAGE_KEYS.REFRESH_TOKEN);
    await secureDelete(STORAGE_KEYS.USER);
  }
}

/**
 * Save all auth data at once
 * On web: localStorage only
 * On native: SecureStore only
 */
export async function saveAuthData(accessToken: string, refreshToken: string, user: any): Promise<void> {
  const userString = JSON.stringify(user);

  if (isWeb) {
    if (hasLocalStorage) {
      window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      window.localStorage.setItem(STORAGE_KEYS.USER, userString);
    }
  } else {
    // Write to both SecureStore and AsyncStorage in parallel
    await Promise.all([
      nativeSet(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      nativeSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      nativeSet(STORAGE_KEYS.USER, userString),
    ]);
  }
}
