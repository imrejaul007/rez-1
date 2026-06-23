/**
 * useUserIdentity — Unified privilege view for the current user.
 *
 * Combines subscription tier, Prive membership, and zone verifications
 * into a single hook with granular Zustand selectors for performance.
 *
 * Usage:
 *   const { isPremium, priveTier, isStudent, canAccess } = useUserIdentity();
 *   if (canAccess('early_flash_sale')) { ... }
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePriveStore } from '@/stores/priveStore';

// Verification shape from backend User model (not typed in frontend User type)
interface ZoneVerification {
  verified?: boolean;
  verifiedAt?: Date;
  [key: string]: any;
}

interface UserVerifications {
  student?: ZoneVerification;
  corporate?: ZoneVerification;
  defence?: ZoneVerification;
  healthcare?: ZoneVerification;
  senior?: ZoneVerification;
  teacher?: ZoneVerification;
  government?: ZoneVerification;
  differentlyAbled?: ZoneVerification;
}

export type PriveTier = 'none' | 'entry' | 'signature' | 'elite';

export type GatedFeature =
  | 'early_flash_sale'
  | 'concierge'
  | 'personal_shopper'
  | 'prive_tab'
  | 'premium_events'
  | 'free_delivery'
  | 'exclusive_deals';

export interface UserIdentity {
  // Subscription tier
  isNuqtaFree: boolean;
  isPremium: boolean;
  isVIP: boolean;
  cashbackMultiplier: number;
  hasFreeDelivery: boolean;
  daysRemaining: number;

  // Prive tier
  priveTier: PriveTier;
  isPriveAny: boolean;
  isPriveEntry: boolean;
  isPriveSignature: boolean;
  isPriveElite: boolean;

  // Exclusive zones
  isStudent: boolean;
  isCorporate: boolean;
  isDefence: boolean;
  isHealthcare: boolean;
  isTeacher: boolean;
  isGovernment: boolean;
  isSenior: boolean;
  isDifferentlyAbled: boolean;

  // Feature gate
  canAccess: (feature: GatedFeature) => boolean;
}

export function useUserIdentity(): UserIdentity {
  // Granular selectors — each only triggers re-render when its slice changes
  const user = useAuthStore((s) => s.state.user);
  const computed = useSubscriptionStore((s) => s.computed);
  const priveTier = usePriveStore((s) => (s.eligibility?.tier as PriveTier) ?? 'none');

  return useMemo(() => {
    const isPremium = computed?.isPremium ?? false;
    const isVIP = computed?.isVIP ?? false;
    const isSubscribed = computed?.isSubscribed ?? false;
    const cashbackMultiplier = computed?.cashbackMultiplier ?? 1;
    const hasFreeDelivery = computed?.hasFreeDelivery ?? false;
    const daysRemaining = computed?.daysRemaining ?? 0;

    // Verifications from raw user object (backend includes this, frontend type doesn't declare it)
    const v = ((user as any)?.verifications ?? {}) as UserVerifications;

    const canAccess = (feature: GatedFeature): boolean => {
      switch (feature) {
        case 'early_flash_sale':
          return isPremium || isVIP || priveTier === 'signature' || priveTier === 'elite';
        case 'concierge':
          return isVIP || priveTier === 'signature' || priveTier === 'elite';
        case 'personal_shopper':
          return isVIP || priveTier === 'elite';
        case 'prive_tab':
          return priveTier !== 'none';
        case 'premium_events':
          return isVIP || priveTier === 'elite';
        case 'free_delivery':
          return hasFreeDelivery;
        case 'exclusive_deals':
          return isPremium || isVIP;
        default:
          return true;
      }
    };

    return {
      // Subscription
      isNuqtaFree: !isSubscribed,
      isPremium,
      isVIP,
      cashbackMultiplier,
      hasFreeDelivery,
      daysRemaining,

      // Prive
      priveTier,
      isPriveAny: priveTier !== 'none',
      isPriveEntry: priveTier === 'entry',
      isPriveSignature: priveTier === 'signature',
      isPriveElite: priveTier === 'elite',

      // Zones
      isStudent: v.student?.verified === true,
      isCorporate: v.corporate?.verified === true,
      isDefence: v.defence?.verified === true,
      isHealthcare: v.healthcare?.verified === true,
      isTeacher: v.teacher?.verified === true,
      isGovernment: v.government?.verified === true,
      isSenior: v.senior?.verified === true,
      isDifferentlyAbled: v.differentlyAbled?.verified === true,

      // Feature gate
      canAccess,
    };
  }, [user, computed, priveTier]);
}
