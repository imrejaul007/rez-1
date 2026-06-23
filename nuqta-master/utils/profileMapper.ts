// @ts-nocheck
// Maps backend user data to profile User format
// Extracted to avoid circular dependency between profileStore and ProfileContext

import { User } from '@/types/profile.types';
import { User as BackendUser } from '@/services/authApi';

export const mapBackendUserToProfileUser = (backendUser: BackendUser): User => {
  const getInitials = (): string => {
    if (backendUser.profile?.firstName && backendUser.profile?.lastName) {
      return (backendUser.profile.firstName.charAt(0) + backendUser.profile.lastName.charAt(0)).toUpperCase();
    }
    if (backendUser.profile?.firstName) {
      return backendUser.profile.firstName.charAt(0).toUpperCase();
    }
    if (backendUser.email) {
      return backendUser.email.charAt(0).toUpperCase();
    }
    if (backendUser.phoneNumber) {
      return backendUser.phoneNumber.charAt(1)?.toUpperCase() || 'U';
    }
    return 'U';
  };

  const getDisplayName = (): string => {
    if (backendUser.profile?.firstName && backendUser.profile?.lastName) {
      return `${backendUser.profile.firstName} ${backendUser.profile.lastName}`;
    }
    if (backendUser.profile?.firstName) {
      return backendUser.profile.firstName;
    }
    if (backendUser.email) {
      return backendUser.email.split('@')[0];
    }
    if (backendUser.phoneNumber) {
      return backendUser.phoneNumber;
    }
    return 'User';
  };

  return {
    id: backendUser.id,
    name: getDisplayName(),
    email: backendUser.email || '',
    avatar: backendUser.profile?.avatar && !backendUser.profile.avatar.includes('ui-avatars.com')
      ? backendUser.profile.avatar
      : undefined,
    bio: backendUser.profile?.bio || '',
    location: backendUser.profile?.location?.address || '',
    website: backendUser.profile?.website || '',
    dateOfBirth: backendUser.profile?.dateOfBirth ? new Date(backendUser.profile.dateOfBirth).toLocaleDateString() : '',
    gender: backendUser.profile?.gender || '',
    initials: getInitials(),
    phone: backendUser.phoneNumber,
    joinDate: backendUser.createdAt,
    isVerified: backendUser.isVerified,
    isOnboarded: backendUser.isOnboarded,
    wallet: {
      balance: typeof backendUser.wallet?.balance === 'object'
        ? (backendUser.wallet.balance as any).available || (backendUser.wallet.balance as any).total || 0
        : backendUser.wallet?.balance || 0,
      totalEarned: backendUser.wallet?.totalEarned || 0,
      totalSpent: backendUser.wallet?.totalSpent || 0,
      pendingAmount: typeof backendUser.wallet?.pendingAmount === 'object'
        ? (backendUser.wallet.pendingAmount as any).pending || 0
        : backendUser.wallet?.pendingAmount || 0,
    },
    subscriptionTier: (backendUser as any).priveTier
      || (backendUser as any).subscriptionTier
      || (backendUser as any).nuqtaPlusTier
      || undefined,
    creatorLevel: (backendUser as any).creatorLevel
      || (backendUser as any).partner?.level
      || undefined,
    tier: (() => {
      const priveTier = (backendUser as any).priveTier
        || (backendUser as any).nuqtaPlus?.tier
        || (backendUser as any).nuqtaPlusTier
        || (backendUser as any).subscriptionTier;
      if (priveTier === 'elite') return 'Privé Elite';
      if (priveTier === 'prive' || priveTier === 'premium') return 'Privé';
      if ((backendUser as any).segment === 'verified_student') return 'Verified Student';
      if ((backendUser as any).segment === 'verified_employee') return 'Corporate Member';
      if ((backendUser as any).segment === 'verified_defence') return 'Defence Member';
      if ((backendUser as any).segment === 'verified_healthcare') return 'Healthcare Worker';
      return 'REZ Member';
    })(),
    preferences: {
      notifications: {
        push: backendUser.preferences?.pushNotifications ?? true,
        email: backendUser.preferences?.emailNotifications ?? true,
        sms: backendUser.preferences?.smsNotifications ?? false,
        orderUpdates: true,
        promotions: false,
        reminders: true,
      },
      privacy: {
        profileVisible: true,
        showActivity: false,
        allowMessaging: true,
        dataSharing: false,
      },
      display: {
        theme: backendUser.preferences?.theme === 'dark' ? 'dark' : backendUser.preferences?.theme === 'light' ? 'light' : 'auto',
        language: backendUser.preferences?.language || 'en',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    },
  };
};
