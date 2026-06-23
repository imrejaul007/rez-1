/**
 * Mode Types for Nuqta Mode Switcher
 *
 * Defines the 4-mode intent selector system:
 * - near-u: Rewards Near You (everyday, local)
 * - mall: Nuqta Mall (curated brands)
 * - cash: Cash Store (cashback focus)
 * - prive: Privé (exclusive, reputation-based)
 */

// Mode identifiers
export type ModeId = 'near-u' | 'mall' | 'cash' | 'prive';

// Mode configuration for display
export interface ModeConfig {
  id: ModeId;
  label: string;
  icon: string;
  activeColor: string;
  microcopy: string;
}

// Trend direction for pillar scores
export type TrendDirection = 'up' | 'down' | 'stable';

// Privé tier levels
export type PriveTier = 'none' | 'entry' | 'signature' | 'elite';

// Individual pillar score in the 6-pillar reputation system
export interface PillarScore {
  id: string;
  name: string;
  score: number;        // 0-100
  weight: number;       // 0.25 = 25%
  weightedScore: number;
  trend: TrendDirection;
  icon: string;
  color: string;
  description: string;
  improvementTips: string[];
}

// Privé eligibility state
export interface PriveEligibility {
  isEligible: boolean;
  score: number;
  tier: PriveTier;
  pillars: PillarScore[];
  trustScore: number;
  reason?: string;
  hasSeenGlowThisSession: boolean;
  // Backend-driven next-tier progression
  nextTierThreshold?: number;
  pointsToNextTier?: number;
  nextTierName?: string;
  accessState?: 'active' | 'grace_period' | 'paused' | 'suspended' | 'revoked';
  gracePeriodEnds?: string;
  // Invite-based access fields
  hasAccess?: boolean;
  accessSource?: 'invite' | 'admin_whitelist' | 'auto_qualify' | 'none';
  isWhitelisted?: boolean;
  effectiveTier?: PriveTier;
}

// Mode theme configuration
export interface ModeTheme {
  id: ModeId;
  label: string;
  microcopy: string;
  activeColor: string;
  textColor: string;
  heroGradient: string[];
  containerBg: string;
  gradientColors?: string[]; // For Privé gradient
}

// Mode context state
export interface ModeContextState {
  activeMode: ModeId;
  previousMode: ModeId | null;
  isTransitioning: boolean;
  priveEligibility: PriveEligibility;
  isLoaded: boolean;
}

// Mode context actions
export interface ModeContextActions {
  setActiveMode: (mode: ModeId) => void;
  refreshPriveEligibility: () => Promise<void>;
}

// Full mode context type
export interface ModeContextType extends ModeContextState, ModeContextActions {
  // Legacy compatibility helpers
  isNearUActive: boolean;
  isMallActive: boolean;
  isCashActive: boolean;
  isPriveActive: boolean;
  // Backward compatibility with old API
  isNuqtaMallActive: boolean;
  isCashStoreActive: boolean;
}

// Mode switcher component props
export interface ModeSwitcherProps {
  activeMode: ModeId;
  onModeChange: (mode: ModeId) => void;
  priveEligibility: PriveEligibility;
  onPriveLockedPress?: () => void;
  isPriveMode?: boolean;
}

// Tab layout for animation calculations
export interface TabLayout {
  x: number;
  width: number;
}

// Storage keys
export const MODE_STORAGE_KEYS = {
  ACTIVE_MODE: 'rez_active_mode',
  PRIVE_GLOW_SHOWN: 'rez_prive_glow_shown_session',
} as const;

// Default eligibility state
export const DEFAULT_PRIVE_ELIGIBILITY: PriveEligibility = {
  isEligible: false,
  score: 0,
  tier: 'none',
  pillars: [],
  trustScore: 0,
  reason: 'Not evaluated',
  hasSeenGlowThisSession: false,
};

// Eligibility thresholds
export const ELIGIBILITY_THRESHOLDS = {
  ENTRY_TIER: 50,
  SIGNATURE_TIER: 70,
  ELITE_TIER: 85,
  TRUST_MINIMUM: 60,
} as const;
