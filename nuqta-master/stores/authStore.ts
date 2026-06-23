import { create } from 'zustand';
import { User } from '@/services/authApi';

// ---------------------------------------------------------------------------
// State types (mirrors AuthContext)
// ---------------------------------------------------------------------------
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  token: string | null;
}

interface AuthActions {
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
}

interface AuthStoreState {
  state: AuthState;
  actions: AuthActions;
  _setFromProvider: (state: AuthState, actions: AuthActions) => void;
}

// ---------------------------------------------------------------------------
// Initial/default state
// ---------------------------------------------------------------------------
const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  token: null,
};

const noopAsync = async () => {};
const noop = () => {};

const defaultActions: AuthActions = {
  sendOTP: noopAsync,
  login: noopAsync,
  register: noopAsync,
  verifyOTP: noopAsync,
  logout: noopAsync,
  forceLogout: noop,
  updateProfile: noopAsync,
  completeOnboarding: noopAsync,
  clearError: noop,
  checkAuthStatus: noopAsync,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useAuthStore = create<AuthStoreState>((set) => ({
  state: initialState,
  actions: defaultActions,

  // Called by AuthProvider on every render to keep store in sync
  _setFromProvider: (state: AuthState, actions: AuthActions) => {
    set({ state, actions });
  },
}));
