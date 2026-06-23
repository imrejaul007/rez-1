// ProfileContext - State management for profile system
// Manages user data, modal visibility, and profile-related actions

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { router } from 'expo-router';
import {
  ProfileContextType,
  ProfileCompletionStatus,
  User,
  ProfileMenuItem,
  UserPreferences
} from '@/types/profile.types';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useAuthActions } from '@/stores/selectors';
import authService, { User as BackendUser, ProfileUpdate } from '@/services/authApi';
import { saveUser as saveUserToStorage } from '@/utils/authStorage';
import profileApi from '@/services/profileApi';
import walletApi from '@/services/walletApi';
import { mapBackendUserToProfileUser } from '@/utils/profileMapper';

interface ProfileProviderProps {
  children: ReactNode;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _profileCompletionLoaded = false;

export const ProfileProvider = ({ children }: ProfileProviderProps) => {
  // Get auth context
  const authUser = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const authActions = useAuthActions();

  // State
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);

  // Convert backend user to profile user format
  const [walletOverride, setWalletOverride] = useState<User['wallet'] | null>(null);

  const user = useMemo(() => {
    if (authUser) {
      const mappedUser = mapBackendUserToProfileUser(authUser);
      // Use wallet override if the mapped wallet data looks empty
      if (walletOverride && (!mappedUser.wallet?.balance && !mappedUser.wallet?.totalEarned)) {
        mappedUser.wallet = walletOverride;
      }
      return mappedUser;
    }
    return null;
  }, [authUser, isAuthenticated, walletOverride]);

  // Fetch wallet balance separately if user's wallet data seems empty
  useEffect(() => {
    if (!authUser || !isAuthenticated || authLoading) return;
    const w = authUser.wallet;
    const balance = typeof w?.balance === 'object' ? (w.balance as any).available || (w.balance as any).total || 0 : w?.balance || 0;
    if (balance || w?.totalEarned) return; // wallet data looks populated

    walletApi.getBalance().then((res) => {
      if (res.success && res.data) {
        setWalletOverride({
          balance: (res.data as any).balance?.available || (res.data as any).balance || 0,
          totalEarned: (res.data as any).totalEarned || 0,
          totalSpent: (res.data as any).totalSpent || 0,
          pendingAmount: (res.data as any).pendingAmount || 0,
        });
      }
    }).catch(() => { /* non-blocking */ });
  }, [authUser, isAuthenticated, authLoading]);

  // Fetch profile completion from backend (single source of truth)
  const refreshCompletionStatus = useCallback(async () => {
    try {
      const response = await profileApi.getProfileCompletion();
      if (response.success && response.data) {
        setCompletionStatus(response.data);
      }
    } catch (err) {
      // silently handle
    }
  }, []);

  // Auto-fetch completion when user is available
  // Skip during onboarding to prevent thundering herd of API calls on Android
  // Staggered delay (500ms) to avoid simultaneous API calls with Cart/Wishlist on mount
  useEffect(() => {
    if (user && isAuthenticated && user.isOnboarded) {
      if (_profileCompletionLoaded) return; // Module-level dedup
      _profileCompletionLoaded = true;
      const timer = setTimeout(() => refreshCompletionStatus(), 500);
      return () => clearTimeout(timer);
    } else if (!isAuthenticated) {
      setCompletionStatus(null);
      _profileCompletionLoaded = false;
    }
  }, [user, isAuthenticated, refreshCompletionStatus]);

  // User data functions - delegate to AuthContext
  const updateUser = useCallback(async (userData: Partial<User>) => {
    if (!user) return;

    try {
      setError(null);

      // Map profile user data to ProfileUpdate format for API call
      const profileUpdateData: any = {
        email: userData.email || undefined, // Add email at top level
        profile: {
          firstName: userData.name?.split(' ')[0] || undefined,
          lastName: userData.name?.split(' ').slice(1).join(' ') || undefined,
          avatar: userData.avatar,
          bio: userData.bio,
          website: userData.website,
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : undefined,
          gender: userData.gender && ['male', 'female', 'other'].includes(userData.gender.toLowerCase())
            ? userData.gender.toLowerCase() as 'male' | 'female' | 'other'
            : undefined,
          location: userData.location ? {
            address: userData.location,
          } : undefined,
        },
        preferences: {
          theme: userData.preferences?.display?.theme === 'auto' ? undefined : userData.preferences?.display?.theme as 'light' | 'dark',
          language: userData.preferences?.display?.language,
          emailNotifications: userData.preferences?.notifications?.email,
          pushNotifications: userData.preferences?.notifications?.push,
          smsNotifications: userData.preferences?.notifications?.sms,
        },
      };

      // Call the correct authService method directly instead of going through AuthContext
      const response = await authService.updateProfile(profileUpdateData);

      // Check for API errors and throw with descriptive message
      if (!response.success) {
        // Extract field-specific validation errors if available
        const errors = response.errors as any;
        if (Array.isArray(errors) && errors.length > 0) {
          const messages = errors.map((e: any) => e.message || e).join('\n');
          throw new Error(messages);
        }
        throw new Error(response.error || response.message || 'Failed to update profile');
      }

      // Persist updated user to storage so checkAuthStatus picks it up
      if (response.data) {
        await saveUserToStorage(response.data as any);
        await authActions.checkAuthStatus();
        refreshCompletionStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user profile');
      throw err;
    }
  }, [user, authActions, refreshCompletionStatus]);

  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      await updateUser({
        preferences: {
          ...user.preferences,
          ...preferences,
        },
      });
    } catch (err) {
      throw err;
    }
  }, [user, updateUser]);

  const logout = useCallback(async () => {
    try {
      setError(null);

      // Clear modal visibility
      setIsModalVisible(false);

      // Use AuthContext logout which handles tokens, API calls, etc.
      // AuthContext navigation guard handles redirect to sign-in automatically
      await authActions.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout');
      throw err;
    }
  }, [authActions]);

  // Modal functions - memoized for performance
  const showModal = useCallback(() => {

    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {

    setIsModalVisible(false);
  }, []);

  // Navigation function - memoized for performance
  const navigateToScreen = useCallback((route: string, params?: any) => {
    try {
      if (params) {
        router.push({
          pathname: route as any,
          params,
        });
      } else {
        router.push(route as any);
      }
    } catch (err) {
      // Fallback navigation
      router.push('/');
    }
  }, []);

  // Menu item handler - memoized for performance
  const handleMenuItemPress = useCallback((item: ProfileMenuItem) => {

    // Close the modal first
    hideModal();

    // Handle different menu actions
    switch (item.id) {
      case 'wallet':
        navigateToScreen('/wallet-screen'); // Use existing WalletScreen
        break;
      case 'order_trx':
        navigateToScreen('/transactions'); // Navigate to dedicated transactions page
        break;
      case 'bookings':
        navigateToScreen('/BookingsPage'); // Navigate to bookings page
        break;
      case 'account':
        navigateToScreen('/account/');
        break;
      case 'profile':
        navigateToScreen('/profile/');
        break;
      default:
        if (item.route) {
          navigateToScreen(item.route);
        } else if (item.action) {
          item.action();
        }
        break;
    }
  }, [navigateToScreen, hideModal]);

  // Stable-ref pattern: prevent consumer re-renders when action identities change
  const profileActionsRef = useRef({
    refreshCompletionStatus, showModal, hideModal, updateUser, updatePreferences, logout, navigateToScreen,
  });
  profileActionsRef.current = {
    refreshCompletionStatus, showModal, hideModal, updateUser, updatePreferences, logout, navigateToScreen,
  };

  const stableProfileActions = useMemo(() => ({
    refreshCompletionStatus: () => profileActionsRef.current.refreshCompletionStatus(),
    showModal: () => profileActionsRef.current.showModal(),
    hideModal: () => profileActionsRef.current.hideModal(),
    updateUser: (...args: Parameters<typeof updateUser>) => profileActionsRef.current.updateUser(...args),
    updatePreferences: (...args: Parameters<typeof updatePreferences>) => profileActionsRef.current.updatePreferences(...args),
    logout: () => profileActionsRef.current.logout(),
    navigateToScreen: (...args: Parameters<typeof navigateToScreen>) => profileActionsRef.current.navigateToScreen(...args),
  }), []);

  const contextValue: ProfileContextType = useMemo(() => ({
    user,
    isLoading: authLoading,
    error,
    completionStatus,
    isModalVisible,
    ...stableProfileActions,
  }), [user, authLoading, error, completionStatus, isModalVisible, stableProfileActions]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

const PROFILE_DEFAULTS: ProfileContextType = {
  user: null,
  isLoading: false,
  error: null,
  completionStatus: null,
  refreshCompletionStatus: async () => {},
  isModalVisible: false,
  showModal: () => {},
  hideModal: () => {},
  updateUser: async () => {},
  updatePreferences: async () => {},
  logout: async () => {},
  navigateToScreen: () => {},
};

// Lazy import to avoid circular deps
let __useProfileStore: () => any;
try {
  const { useProfileStore } = require('@/stores/profileStore');
  __useProfileStore = useProfileStore;
} catch {
  __useProfileStore = () => PROFILE_DEFAULTS;
}

// Custom hook to use profile context
// Now backed by Zustand store -- works with or without ProfileProvider in tree.
export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  const store = __useProfileStore();
  if (context) return context;
  return store as unknown as ProfileContextType;
};

// Custom hook specifically for the profile modal
export const useProfileModal = () => {
  const { isModalVisible, showModal, hideModal } = useProfile();
  
  return {
    isModalVisible,
    showModal,
    hideModal,
  };
};

// Custom hook for menu item handling
export const useProfileMenu = () => {
  const context = useProfile();
  
  const handleMenuItemPress = (item: ProfileMenuItem) => {

    // Close the modal first
    context.hideModal();

    // Handle different menu actions
    switch (item.id) {
      case 'wallet':
        context.navigateToScreen('/wallet-screen'); // Use existing WalletScreen
        break;
      case 'order_trx':
        context.navigateToScreen('/transactions'); // Navigate to dedicated transactions page
        break;
      case 'bookings':
        context.navigateToScreen('/BookingsPage'); // Navigate to bookings page
        break;
      case 'account':
        context.navigateToScreen('/account/');
        break;
      case 'profile':
        context.navigateToScreen('/profile/');
        break;
      default:
        if (item.route) {
          context.navigateToScreen(item.route);
        } else if (item.action) {
          item.action();
        }
        break;
    }
  };

  return {
    handleMenuItemPress,
  };
};

export default ProfileContext;