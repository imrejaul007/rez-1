// @deprecated — Use `useProfile` from `@/contexts/ProfileContext` instead.
// ProfileContext is the single source of truth for user data AND completion status.
// This standalone hook is kept only for backward compatibility.

import { useState, useCallback, useEffect } from 'react';
import profileApi, { ProfileData, ProfileCompletionStatus } from '@/services/profileApi';

interface UseProfileOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  completionStatus: ProfileCompletionStatus | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<boolean>;
  uploadProfilePicture: (imageUri: string) => Promise<boolean>;
  clearError: () => void;
}

export const useProfile = ({ 
  autoFetch = true,
  refreshInterval 
}: UseProfileOptions = {}): UseProfileReturn => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const [profileResponse, completionResponse] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getProfileCompletion()
      ]);

      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
      } else {
        throw new Error(profileResponse.error || 'Failed to fetch profile');
      }

      if (completionResponse.success && completionResponse.data) {
        setCompletionStatus(completionResponse.data);
      } else {
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [profileResponse, completionResponse] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getProfileCompletion()
      ]);

      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
      }

      if (completionResponse.success && completionResponse.data) {
        setCompletionStatus(completionResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<ProfileData>): Promise<boolean> => {
    try {
      setError(null);

      const response = await profileApi.updateProfile(updates);

      if (response.success && response.data) {
        setProfile(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    }
  }, []);

  // Upload profile picture
  const uploadProfilePicture = useCallback(async (imageUri: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await profileApi.uploadProfilePicture(imageUri);

      if (response.success && response.data) {
        setProfile(prev => prev ? {
          ...prev,
          profilePicture: response.data!.profilePicture
        } : null);
        return true;
      } else {
        setError(response.error || 'Failed to upload profile picture');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture');
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchProfile();
    }
  }, [autoFetch, fetchProfile]);

  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (!isLoading && !isRefreshing) {
          refreshProfile();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, isLoading, isRefreshing, refreshProfile]);

  return {
    profile,
    completionStatus,
    isLoading,
    isRefreshing,
    error,
    fetchProfile,
    refreshProfile,
    updateProfile,
    uploadProfilePicture,
    clearError,
  };
};

export default useProfile;
