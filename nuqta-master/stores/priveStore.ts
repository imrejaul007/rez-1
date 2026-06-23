import { create } from 'zustand';
import {
  PriveDashboard,
  PriveEligibility,
  PriveOffer,
  Highlights,
  DailyProgress,
} from '@/services/priveApi';

// ---------------------------------------------------------------------------
// State types (mirrors PriveContext)
// ---------------------------------------------------------------------------
interface ProgramConfig {
  featureFlags: Record<string, boolean>;
  tiers: Array<{
    id: string;
    name: string;
    threshold: number;
    benefits?: string[];
  }>;
}

interface PriveContextShape {
  // Raw state
  dashboard: PriveDashboard | null;
  eligibility: PriveEligibility | null;
  programConfig: ProgramConfig | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number;

  // Derived values
  tier: string;
  hasAccess: boolean;
  featuredOffers: PriveOffer[];
  highlights: Highlights | null;
  dailyProgress: DailyProgress | null;
  isFeatureEnabled: (flag: string) => boolean;

  // Actions
  refreshAll: () => Promise<void>;
  refreshEligibility: () => Promise<void>;
  checkIn: () => Promise<void>;
  trackOfferClick: (offerId: string) => void;
}

interface PriveStoreState extends PriveContextShape {
  _setFromProvider: (data: PriveContextShape) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const noopAsync = async () => {};
const noop = () => {};

const defaults: PriveContextShape = {
  dashboard: null,
  eligibility: null,
  programConfig: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: 0,
  tier: 'none',
  hasAccess: false,
  featuredOffers: [],
  highlights: null,
  dailyProgress: null,
  isFeatureEnabled: () => false,
  refreshAll: noopAsync,
  refreshEligibility: noopAsync,
  checkIn: noopAsync,
  trackOfferClick: noop,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const usePriveStore = create<PriveStoreState>((set) => ({
  ...defaults,

  // Called by PriveProvider on every render to keep store in sync
  _setFromProvider: (data: PriveContextShape) => {
    set(data);
  },
}));
