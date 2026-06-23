import { create } from 'zustand';
import { router } from 'expo-router';
import {
  ProfileContextType,
  ProfileCompletionStatus,
  User,
  ProfileMenuItem,
  UserPreferences,
} from '@/types/profile.types';
import profileApi from '@/services/profileApi';
import { useAuthStore } from './authStore';
import { mapBackendUserToProfileUser } from '@/utils/profileMapper';

interface ProfileStoreState extends ProfileContextType {}

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  completionStatus: null,
  isModalVisible: false,

  refreshCompletionStatus: async () => {
    try {
      const response = await profileApi.getProfileCompletion();
      if (response.success && response.data) {
        set({ completionStatus: response.data });
      }
    } catch (_err) {
      // silently handle
    }
  },

  showModal: () => {
    set({ isModalVisible: true });
  },

  hideModal: () => {
    set({ isModalVisible: false });
  },

  updateUser: async (_userData: Partial<User>) => {
    // Stub — the real implementation lives in ProfileProvider which uses
    // AuthContext for auth-dependent profile updates.
    // The store fallback only prevents crashes when used outside the provider.
  },

  updatePreferences: async (_preferences: Partial<UserPreferences>) => {
    // Stub — requires AuthContext
  },

  logout: async () => {
    // Stub — requires AuthContext
    router.replace('/sign-in');
  },

  navigateToScreen: (route: string, params?: any) => {
    try {
      if (params) {
        router.push({ pathname: route as any, params });
      } else {
        router.push(route as any);
      }
    } catch (_err) {
      router.push('/');
    }
  },
}));

// Subscribe to auth store changes and sync user data into profile store
useAuthStore.subscribe((authState) => {
  const authUser = authState.state.user;
  const currentProfileUser = useProfileStore.getState().user;

  if (authUser) {
    const mappedUser = mapBackendUserToProfileUser(authUser);
    // Only update if the mapped user actually changed (avoid unnecessary re-renders)
    if (!currentProfileUser || currentProfileUser.id !== mappedUser.id ||
        currentProfileUser.name !== mappedUser.name ||
        currentProfileUser.email !== mappedUser.email ||
        currentProfileUser.phone !== mappedUser.phone ||
        currentProfileUser.avatar !== mappedUser.avatar ||
        currentProfileUser.bio !== mappedUser.bio ||
        currentProfileUser.website !== mappedUser.website) {
      useProfileStore.setState({ user: mappedUser });
    }
  } else if (currentProfileUser) {
    // Auth user logged out — clear profile user
    useProfileStore.setState({ user: null, completionStatus: null });
  }
});
