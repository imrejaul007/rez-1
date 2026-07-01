// @ts-nocheck
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import authService, { User, AuthResponse, UnifiedUser } from '@/services/authApi';
import apiClient from '@/services/apiClient';
import * as authStorage from '@/utils/authStorage';
import { isTokenExpired, isTokenExpiringSoon, getTimeUntilExpiration } from '@/utils/tokenUtils';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import {
  User as UnifiedUserType,
  toUser,
  validateUser,
  isUserVerified
} from '@/types/unified';
import { useToastStore } from '@/stores/toastStore';

// Use types from unified type system
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  token: string | null;
}

type AuthAction =
  | { type: 'AUTH_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'CLEAR_ERROR' };

// Storage keys
const STORAGE_KEYS = {
  USER: 'auth_user',
};

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  token: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    
    case 'AUTH_SUCCESS':

      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Context
interface AuthContextType {
  state: AuthState;
  actions: {
    sendOTP: (phoneNumber: string, email?: string, referralCode?: string) => Promise<void>;
    login: (phoneNumber: string, otp: string) => Promise<void>;
    register: (phoneNumber: string, email: string, referralCode?: string) => Promise<void>;
    verifyOTP: (phoneNumber: string, otp: string) => Promise<void>;
    logout: () => Promise<void>;
    forceLogout: () => void;
    updateProfile: (data: Partial<User>) => Promise<void>;
    completeOnboarding: (data: Partial<User>) => Promise<void>;
    clearError: () => void;
    checkAuthStatus: () => Promise<void>;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [hasExplicitlyLoggedOut, setHasExplicitlyLoggedOut] = React.useState(false);
  const [lastNavigationTime, setLastNavigationTime] = React.useState(0);
  const [shouldRedirectToSignIn, setShouldRedirectToSignIn] = React.useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Refs to prevent race conditions
  const isRefreshingToken = useRef(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingRefreshCallbacks = useRef<Array<(success: boolean) => void>>([]);
  const isCancelledRef = useRef(false);
  const lastRedirectTimeRef = useRef(0);

  // Set up API client callbacks
  useEffect(() => {
    // Set refresh token callback
    apiClient.setRefreshTokenCallback(async () => {
      try {
        const success = await tryRefreshToken();
        return success;  // Return actual result, not always true
      } catch (error) {
        // silently handle
        return false;
      }
    });

    // Set logout callback - called when token expires/is revoked
    // This is guarded by isLoggingOut in apiClient, so only called once per cycle
    // NOTE: No router.replace here — dispatch AUTH_LOGOUT triggers the navigation guard
    apiClient.setLogoutCallback(async () => {
      try {
        // Immediately clear API tokens to stop any further authenticated requests
        apiClient.setAuthToken(null);
        authService.setAuthToken(null);

        // Clear all stored auth data (AsyncStorage + localStorage)
        await authStorage.clearAuthData();

        // Dispatch logout — navigation guard will handle redirect
        dispatch({ type: 'AUTH_LOGOUT' });

        // Set explicit logout flag to prevent auto-restoration
        setHasExplicitlyLoggedOut(true);
      } catch (error) {
        // Even if cleanup fails, ensure auth state is cleared
        dispatch({ type: 'AUTH_LOGOUT' });
        setHasExplicitlyLoggedOut(true);
      }
    });
  }, []);

  // Check auth status on app start (but not after explicit logout)
  useEffect(() => {
    isCancelledRef.current = false;
    if (!hasExplicitlyLoggedOut) {
      checkAuthStatus();
    }
    return () => { isCancelledRef.current = true; };
  }, [hasExplicitlyLoggedOut]);

  // Proactive token refresh: refresh 2 minutes before expiry instead of waiting for 401
  useEffect(() => {
    if (!state.isAuthenticated || !state.token) return;

    const scheduleRefresh = () => {
      const secsLeft = getTimeUntilExpiration(state.token!);
      if (secsLeft <= 0) return; // Already expired, 401 handler will deal with it

      // Refresh 2 minutes before expiry (or immediately if less than 2 min left)
      const refreshInMs = Math.max(0, (secsLeft - 120) * 1000);

      return setTimeout(async () => {
        // Double-check token is still expiring soon (state may have changed)
        if (state.token && isTokenExpiringSoon(state.token, 3)) {
          await tryRefreshToken();
        }
      }, refreshInMs);
    };

    const timerId = scheduleRefresh();
    return () => { if (timerId) clearTimeout(timerId); };
  }, [state.isAuthenticated, state.token]);

  // Navigation guard: Redirect to sign-in when user is logged out
  // Single source of truth for all sign-in redirects — no other code should call router.replace('/sign-in')
  useEffect(() => {
    // Don't navigate during initial loading
    if (state.isLoading) {
      return;
    }

    const currentRoute = segments.join('/');
    const isSignInRoute = currentRoute === 'sign-in';
    const isOnboardingRoute = currentRoute.startsWith('onboarding/');

    // Determine if we need to redirect
    let needsRedirect = false;

    if (shouldRedirectToSignIn && !isSignInRoute) {
      needsRedirect = true;
      setShouldRedirectToSignIn(false);
    } else if (!state.isAuthenticated) {
      if (isSignInRoute) return;
      if (isOnboardingRoute && !state.error) return;
      needsRedirect = true;
    }

    if (needsRedirect) {
      // Debounce: prevent multiple redirects within 1 second
      const now = Date.now();
      if (now - lastRedirectTimeRef.current < 1000) return;
      lastRedirectTimeRef.current = now;
      router.replace('/sign-in');
    }
  }, [state.isAuthenticated, state.isLoading, state.error, segments, hasExplicitlyLoggedOut, shouldRedirectToSignIn]);

  // Set analytics user properties when user changes
  useEffect(() => {
    if (state.user && state.isAuthenticated) {
      analytics.setUserId(state.user.id);
      analytics.setUserProperties({
        city: state.user.profile?.location?.city || 'unknown',
        user_type: state.user.role || 'user',
        member_since_month: state.user.createdAt
          ? new Date(state.user.createdAt).toISOString().substring(0, 7)
          : 'unknown',
      });
    }
  }, [state.user?.id, state.isAuthenticated]);

  // Backend service integration (dummy + real API ready)

  // Actions
  const sendOTP = async (phoneNumber: string, email?: string, referralCode?: string) => {
    try {
      dispatch({ type: 'AUTH_LOADING', payload: true });

      const requestData: any = { phoneNumber };
      if (email) requestData.email = email;
      if (referralCode) requestData.referralCode = referralCode;

      const response = await authService.sendOtp(requestData);

      // Check if API returned an error
      if (!response.success) {
        const errorMessage = response.error || response.message || 'Failed to send OTP';
        dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
        throw new Error(errorMessage);
      }

      dispatch({ type: 'AUTH_LOADING', payload: false });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error?.message || 'Failed to send OTP'
      });

      // Re-throw error so calling components know it failed
      throw error;
    }
  };
  const login = async (phoneNumber: string, otp: string) => {
    try {

      dispatch({ type: 'AUTH_LOADING', payload: true });

      const response = await authService.verifyOtp({ phoneNumber, otp });

      // Check if API returned an error
      if (!response.success) {
        const errorMessage = response.error || response.message || 'Login failed';
        dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
        throw new Error(errorMessage);
      }

      // Store auth/session data in secure storage utilities.
      if (!response.data || !response.data.tokens || !response.data.user) {
        throw new Error('Invalid response data from server');
      }

      // Use authStorage utility (saves to both AsyncStorage and localStorage on web)
      await authStorage.saveAuthData(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken,
        response.data.user
      );

      // Fire-and-forget: set onboarding flag (non-blocking)
      if (response.data.user.isOnboarded) {
        AsyncStorage.setItem('onboarding_completed', 'true').catch((err) => {
  console.error('[AuthContext] Error:', err);
});
      }

      // Set auth token in API client
      authService.setAuthToken(response.data.tokens.accessToken);
      apiClient.setAuthToken(response.data.tokens.accessToken);


      dispatch({ type: 'AUTH_SUCCESS', payload: { user: response.data.user, token: response.data.tokens.accessToken } });

      // Track analytics: set user ID for all logins, fire sign_up for new users
      try {
        const userId = response.data.user._id || response.data.user.id;
        analytics.setUserId(userId);
        if (!response.data.user.isOnboarded) {
          analytics.trackEvent(ANALYTICS_EVENTS.USER_REGISTERED, { method: 'otp', user_id: userId });
        }
        // Track session start on successful login
        try {
          analytics.trackEvent(ANALYTICS_EVENTS.SESSION_STARTED, { user_id: userId });
        } catch {}
      } catch {}

      // Reset explicit logout flag since user is logging in again
      setHasExplicitlyLoggedOut(false);
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error?.message || 'Login failed'
      });

      // Re-throw error so calling components know it failed
      throw error;
    }
  };

  const register = async (phoneNumber: string, email: string, referralCode?: string) => {
    // Note: Registration is handled through OTP verification in this backend
    // This method can be used for additional registration data after OTP verification
    try {
      dispatch({ type: 'AUTH_LOADING', payload: true });

      // Send OTP first
      await sendOTP(phoneNumber, email, referralCode);

      dispatch({ type: 'AUTH_LOADING', payload: false });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error?.message || 'Registration failed'
      });

      // Re-throw error so calling components know it failed
      throw error;
    }
  };

  const verifyOTP = async (phoneNumber: string, otp: string) => {
    // Use login for OTP verification
    await login(phoneNumber, otp);
  };

  const logout = async () => {
    // Track session end before any cleanup (non-blocking)
    const userId = state.user?.id || state.user?._id;
    try {
      analytics.trackEvent(ANALYTICS_EVENTS.SESSION_ENDED, { user_id: userId });
    } catch {}

    try {

      // Call backend logout (invalidate token) - but don't fail if it errors
      try {

        const response = await authService.logout();

        // Check if logout request failed
        if (!response.success) {
          // Continue with local logout even if backend fails
        } else {

        }
      } catch (error: any) {
        // Continue with local logout even if backend fails
        // This is especially important for cases where the token is already invalid
      }

      // Always proceed with local cleanup regardless of backend response
      await performLocalLogout();
      
    } catch (error) {
      // Even if there's an error, try to perform local logout
      try {
        await performLocalLogout();
      } catch (localError) {
        // silently handle
      }
      // Don't re-throw - logout should always succeed from user perspective
    }
  };

  const performLocalLogout = async () => {
    try {
      // Clear from AsyncStorage and localStorage (web)
      await authStorage.clearAuthData();

      // Clear auth token from API client
      authService.setAuthToken(null);
      apiClient.setAuthToken(null);

      dispatch({ type: 'AUTH_LOGOUT' });

      // Set explicit logout flag to prevent auto-restoration
      setHasExplicitlyLoggedOut(true);

      // Double-check that state is properly cleared

    } catch (error) {
      throw error;
    }
  };

  const forceLogout = () => {

    try {
      // Clear both localStorage and AsyncStorage via authStorage
      authStorage.clearAuthData().catch(() => { /* silently handle */ });

      // Clear API client token
      authService.setAuthToken(null);
      apiClient.setAuthToken(null);
      
      // Force state update
      dispatch({ type: 'AUTH_LOGOUT' });
      
      // Set explicit logout flag to prevent auto-restoration
      setHasExplicitlyLoggedOut(true);

    } catch (error) {
      // Still dispatch logout even if clearing fails
      dispatch({ type: 'AUTH_LOGOUT' });
      setHasExplicitlyLoggedOut(true);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    // 1. Snapshot for rollback
    const previousUser = state.user;

    try {
      if (!state.user?.id) {
        throw new Error('User not authenticated');
      }

      // 2. Optimistic update - apply changes immediately
      const optimisticUser = state.user
        ? { ...state.user, ...data, profile: { ...state.user.profile, ...data.profile } }
        : null;
      dispatch({ type: 'UPDATE_USER', payload: optimisticUser });

      const response = await authService.updateProfile({
        profile: data.profile,
        preferences: data.preferences
      });

      // Check if API returned an error
      if (!response.success) {
        const errorMessage = response.error || response.message || 'Profile update failed';
        dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
        throw new Error(errorMessage);
      }

      // Update AsyncStorage with proper null check
      if (response.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
        dispatch({ type: 'UPDATE_USER', payload: response.data });
      } else {
        throw new Error('No user data received from server');
      }
    } catch (error: any) {
      // 5. Rollback on failure
      dispatch({ type: 'UPDATE_USER', payload: previousUser });
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error?.message || 'Profile update failed'
      });
      useToastStore.getState().showError('Profile update failed');

      // Re-throw error so calling components know it failed
      throw error;
    }
  };

  const completeOnboarding = async (data: Partial<User>) => {
    try {

      if (!state.user?.id) {
        throw new Error('User not authenticated');
      }

      // Do not optimistically flip user state — isOnboarded must only change on API success
      // to avoid wallet/gamification/cart init + rollback loops on failure (React #185).

      const response = await authService.completeOnboarding({
        profile: data.profile,
        preferences: data.preferences
      });

      // Check if API returned an error
      if (!response.success) {
        const errorMessage = response.error || response.message || 'Onboarding completion failed';
        dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
        throw new Error(errorMessage);
      }

      // Update AsyncStorage with new user data (parallel writes, no verification read)
      if (response.data) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.USER, JSON.stringify(response.data)],
          ['onboarding_completed', 'true'],
        ]);
      } else {
        throw new Error('No user data received from server');
      }

      dispatch({ type: 'UPDATE_USER', payload: response.data });

    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error?.message || 'Onboarding completion failed'
      });

      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const checkAuthStatus = async () => {
    try {
      // Read stored auth FIRST, then only show loading if nothing is cached.
      // This avoids the flash: authenticated → loading skeleton → authenticated.
      const [storedToken, storedUser] = await Promise.all([
        authStorage.getAuthToken(),
        authStorage.getUser(),
      ]);

      // Only show loading spinner if there's nothing in storage to restore from.
      // When stored credentials exist, we can restore synchronously without a flash.
      if (!storedToken || !storedUser) {
        dispatch({ type: 'AUTH_LOADING', payload: true });
      }

      if (storedToken && storedUser) {
        // Check if the access token is expired BEFORE setting isAuthenticated
        if (isTokenExpired(storedToken)) {

          // Try to refresh the token BEFORE restoring auth state
          const refreshSuccess = await tryRefreshToken();

          if (!refreshSuccess) {
            // Refresh failed - clear everything and redirect to sign-in
            await authStorage.clearAuthData();
            apiClient.setAuthToken(null);
            authService.setAuthToken(null);
            dispatch({ type: 'AUTH_LOGOUT' });
            return;
          }

          // Refresh succeeded - tryRefreshToken already dispatched AUTH_SUCCESS
          // and updated the API client with new token
          setHasExplicitlyLoggedOut(false);
          return;
        }

        // Token is still valid - restore auth state immediately
        authService.setAuthToken(storedToken);
        apiClient.setAuthToken(storedToken);

        // Dispatch auth immediately — don't block on flag write
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: storedUser, token: storedToken }
        });

        // Fire-and-forget: set onboarding flag (non-blocking)
        if (storedUser.isOnboarded) {
          AsyncStorage.setItem('onboarding_completed', 'true').catch((err) => {
  console.error('[AuthContext] Error:', err);
});
        }

        // Reset explicit logout flag since auth is restored
        setHasExplicitlyLoggedOut(false);

        // Validate token with backend in background (token is valid, just sync user data)
        // Skip if profile was synced recently (within 5 minutes) to reduce startup API calls
        Promise.resolve().then(async () => {
          if (isCancelledRef.current) return;
          try {
            const lastSync = await AsyncStorage.getItem('lastProfileSync');
            if (lastSync && Date.now() - parseInt(lastSync, 10) < 5 * 60 * 1000) {
              return; // Profile data is fresh, skip background sync
            }
            const response = await authService.getProfile();
            if (isCancelledRef.current) return;

            if (!response.success) {
              if (response.error?.includes('401') || response.error?.includes('403') || response.error?.includes('Access token') || response.error?.includes('expired') || response.error?.includes('invalid')) {
                const refreshSuccess = await tryRefreshToken();
                if (!refreshSuccess) {
                  // silently handle
                }
              }
            } else if (response.data) {
              if (isCancelledRef.current) return;
              // Update stored user data if changed
              if (JSON.stringify(response.data) !== JSON.stringify(storedUser)) {
                authStorage.saveUser(response.data).catch((err) => {
  console.error('[AuthContext] Error:', err);
});
                dispatch({ type: 'UPDATE_USER', payload: response.data });
              }
              // Fire-and-forget: non-critical flag writes
              if (response.data.isOnboarded) {
                AsyncStorage.setItem('onboarding_completed', 'true').catch((err) => {
  console.error('[AuthContext] Error:', err);
});
              }
              AsyncStorage.setItem('lastProfileSync', Date.now().toString()).catch((err) => {
  console.error('[AuthContext] Error:', err);
});
            } else {
              await tryRefreshToken();
            }
          } catch (error: any) {
            if (isCancelledRef.current) return;
            if (error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.includes('Access token') || error?.message?.includes('expired') || error?.message?.includes('invalid')) {
              await tryRefreshToken();
            }
          }
        });

      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    // If already refreshing, return the existing promise
    if (isRefreshingToken.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Mark as refreshing
    isRefreshingToken.current = true;
    let refreshSuccess = false;

    // Create refresh promise
    const refreshPromise = (async () => {
      try {
        const refreshToken = await authStorage.getRefreshToken();

        if (refreshToken) {
          const response = await authService.refreshToken(refreshToken);

          // Check if API returned an error
          if (!response.success) {
            throw new Error(response.error || 'Token refresh failed');
          }

          // Update stored tokens
          if (!response.data || !response.data.tokens) {
            throw new Error('Invalid response data from server');
          }

          // Save to both AsyncStorage AND localStorage (web) using authStorage
          await authStorage.saveAuthToken(response.data.tokens.accessToken);
          await authStorage.saveRefreshToken(response.data.tokens.refreshToken);

          // Set auth token in API client
          authService.setAuthToken(response.data.tokens.accessToken);
          apiClient.setAuthToken(response.data.tokens.accessToken);

          // Track token refresh success (non-blocking)
          try {
            analytics.trackEvent('token_refresh', { success: true });
          } catch {}

          // Get user data safely (use authStorage to check localStorage first on web)
          let storedUser = null;
          try {
            storedUser = await authStorage.getUser();
          } catch (parseError) {
            storedUser = null;
          }

          if (storedUser) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user: storedUser, token: response.data.tokens.accessToken }
            });
            refreshSuccess = true;
            return true; // Success
          } else {
            // SECURITY: refresh succeeded but no stored user (SecureStore cleared,
            // web localStorage evicted, app reinstall). Do NOT force logout — we
            // just refreshed a valid access token. Fetch the profile to rebuild
            // the user blob before deciding.
            try {
              const profileResp = await authService.getProfile();
              if (profileResp.success && profileResp.data) {
                await authStorage.setUser(profileResp.data as any);
                dispatch({
                  type: 'AUTH_SUCCESS',
                  payload: { user: profileResp.data, token: response.data.tokens.accessToken },
                });
                refreshSuccess = true;
                return true;
              }
            } catch {
              // profile fetch failed; fall through to logout
            }
            dispatch({ type: 'AUTH_LOGOUT' });
            return false; // Failed - no user data
          }
        } else {
          return false; // No refresh token available
        }
      } catch (error: any) {
        // Don't immediately logout on refresh failure - could be network issue
        // Only logout if it's a 401/403 (invalid refresh token)
        const errorMessage = error?.message?.toLowerCase() || '';
        const isInvalidToken = error?.response?.status === 401 ||
                              error?.response?.status === 403 ||
                              errorMessage.includes('401') ||
                              errorMessage.includes('403') ||
                              errorMessage.includes('invalid') ||
                              errorMessage.includes('expired');

        if (isInvalidToken) {
          // Track token refresh failure (non-blocking)
          try {
            analytics.trackEvent('token_refresh', { success: false, reason: 'invalid_token' });
          } catch {}

          // Clear all stored auth data.
          await authStorage.clearAuthData().catch(() => { /* silently handle */ });

          // Clear API client token
          apiClient.setAuthToken(null);
          authService.setAuthToken(null);

          // Dispatch logout with error so navigation guard knows to redirect
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired. Please sign in again.' });

          // Set redirect flag — navigation guard handles the actual redirect
          setShouldRedirectToSignIn(true);

          return false; // Failed - invalid token
        } else {
          return false; // Failed - network error
        }
      } finally {
        // Reset refreshing flag
        isRefreshingToken.current = false;
        refreshPromiseRef.current = null;

        // Resolve all pending callbacks
        const callbacks = pendingRefreshCallbacks.current;
        pendingRefreshCallbacks.current = [];
        callbacks.forEach(cb => cb(refreshSuccess));
      }
    })();

    // Store promise for subsequent calls
    refreshPromiseRef.current = refreshPromise;

    return refreshPromise;
  }, [router]);

  // Stable actions ref — callbacks change identity on re-render but their behavior
  // is always "latest". Using a ref avoids invalidating the context memo on every render.
  // Pattern copied from GamificationContext (lines 655-689).
  const actionsRef = useRef({
    sendOTP, login, register, verifyOTP, logout, forceLogout,
    updateProfile, completeOnboarding, clearError, checkAuthStatus,
  });
  actionsRef.current = {
    sendOTP, login, register, verifyOTP, logout, forceLogout,
    updateProfile, completeOnboarding, clearError, checkAuthStatus,
  };

  // Stable wrapper that delegates to latest callbacks via ref — identity never changes
  const stableActions = useMemo(() => ({
    sendOTP: (...args: Parameters<typeof sendOTP>) => actionsRef.current.sendOTP(...args),
    login: (...args: Parameters<typeof login>) => actionsRef.current.login(...args),
    register: (...args: Parameters<typeof register>) => actionsRef.current.register(...args),
    verifyOTP: (...args: Parameters<typeof verifyOTP>) => actionsRef.current.verifyOTP(...args),
    logout: () => actionsRef.current.logout(),
    forceLogout: () => actionsRef.current.forceLogout(),
    updateProfile: (...args: Parameters<typeof updateProfile>) => actionsRef.current.updateProfile(...args),
    completeOnboarding: (...args: Parameters<typeof completeOnboarding>) => actionsRef.current.completeOnboarding(...args),
    clearError: () => actionsRef.current.clearError(),
    checkAuthStatus: () => actionsRef.current.checkAuthStatus(),
  }), []); // Empty deps — wrapper identity never changes

  // Memoize context value — only re-renders consumers when state changes (not actions)
  const contextValue: AuthContextType = useMemo(() => ({
    state,
    actions: stableActions,
  }), [state, stableActions]);

  // Sync to Zustand store for crash-safe fallback
  const _setFromProvider = useAuthStore((s) => s._setFromProvider);
  useEffect(() => {
    _setFromProvider(state, stableActions);
  }, [state, stableActions, _setFromProvider]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook — falls back to Zustand store for crash safety when outside Provider
export function useAuth() {
  const context = useContext(AuthContext);
  const storeState = useAuthStore((s) => s.state);
  const storeActions = useAuthStore((s) => s.actions);

  if (context !== undefined) {
    return context;
  }

  // Fallback to Zustand store (populated by Provider elsewhere in the tree)
  return { state: storeState, actions: storeActions };
}

export { AuthContext };
