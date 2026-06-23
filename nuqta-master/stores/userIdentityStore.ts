import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type IdentitySegment =
  | 'normal'
  | 'verified_student'
  | 'verified_employee'
  | 'verified_defence'
  | 'verified_healthcare'
  | 'verified_teacher'
  | 'verified_senior'
  | 'verified_government'
  | 'verified_differentlyAbled';

export type StatedIdentity = 'student' | 'corporate' | 'other' | 'general';
export type VerificationSegment = 'none' | 'provisional' | 'pending' | 'verified';
export type InstituteStatus = 'not_available' | 'pending_referral' | 'onboarded';

interface UserIdentityState {
  segment: IdentitySegment;
  featureLevel: number;
  verificationSegment: VerificationSegment;
  instituteStatus: InstituteStatus;
  statedIdentity: StatedIdentity | null;
  instituteName: string | null;
  companyName: string | null;
  hasSkippedVerificationPrompt: boolean;
  hasSkippedInstituteReferral: boolean;
  _hydrated: boolean;

  // Actions
  setIdentity: (data: Partial<UserIdentityState>) => void;
  hydrateFromBackend: (data: {
    statedIdentity?: string | null;
    featureLevel?: number;
    segment?: string;
    verificationSegment?: string;
    instituteStatus?: string;
    instituteName?: string | null;
    companyName?: string | null;
  }) => void;
  dismissVerificationPrompt: () => void;
  dismissInstituteReferral: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  segment: 'normal' as IdentitySegment,
  featureLevel: 1,
  verificationSegment: 'none' as VerificationSegment,
  instituteStatus: 'not_available' as InstituteStatus,
  statedIdentity: null as StatedIdentity | null,
  instituteName: null as string | null,
  companyName: null as string | null,
  hasSkippedVerificationPrompt: false,
  hasSkippedInstituteReferral: false,
  _hydrated: false,
};

export const useUserIdentityStore = create<UserIdentityState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setIdentity: (data) =>
        set((state) => ({ ...state, ...data })),

      hydrateFromBackend: (data) =>
        set((state) => ({
          ...state,
          segment: (data.segment as IdentitySegment) || state.segment,
          featureLevel: data.featureLevel || state.featureLevel,
          verificationSegment: (data.verificationSegment as VerificationSegment) || state.verificationSegment,
          instituteStatus: (data.instituteStatus as InstituteStatus) || state.instituteStatus,
          statedIdentity: (data.statedIdentity as StatedIdentity) || state.statedIdentity,
          instituteName: data.instituteName ?? state.instituteName,
          companyName: data.companyName ?? state.companyName,
          _hydrated: true,
        })),

      dismissVerificationPrompt: () =>
        set({ hasSkippedVerificationPrompt: true }),

      dismissInstituteReferral: () =>
        set({ hasSkippedInstituteReferral: true }),

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'user-identity-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSkippedVerificationPrompt: state.hasSkippedVerificationPrompt,
        hasSkippedInstituteReferral: state.hasSkippedInstituteReferral,
        statedIdentity: state.statedIdentity,
        // Also persist identity data so it's available before API hydration
        segment: state.segment,
        featureLevel: state.featureLevel,
        verificationSegment: state.verificationSegment,
        instituteStatus: state.instituteStatus,
        instituteName: state.instituteName,
        companyName: state.companyName,
      }),
    }
  )
);
