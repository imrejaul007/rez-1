/**
 * usePriveEligibility Hook
 *
 * Provides Privé eligibility status based on the 6-pillar reputation system.
 * Integrates with SubscriptionContext for tier data and can fetch from backend.
 *
 * 6 Pillars (weighted):
 * - Engagement (25%): How deeply you use Nuqta
 * - Trust & Integrity (20%): Your reliability for brands
 * - Influence (20%): Your real social influence
 * - Economic Value (15%): Value to ecosystem
 * - Brand Affinity (10%): How brands perceive you
 * - Network & Community (10%): Ecosystem expansion impact
 *
 * Thresholds (from ELIGIBILITY_THRESHOLDS):
 * - Entry Tier: Score >= 50
 * - Signature Tier: Score >= 70
 * - Elite Tier: Score >= 85
 * - Trust Minimum: 60 (hard block if below)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import {
  PriveEligibility,
  PillarScore,
  PriveTier,
  TrendDirection,
  DEFAULT_PRIVE_ELIGIBILITY,
  ELIGIBILITY_THRESHOLDS,
} from '@/types/mode.types';
import priveApi from '@/services/priveApi';
import { PILLAR_CONFIG, IMPROVEMENT_TIPS, resolvePillarId } from '@/components/prive/priveTheme';

interface UsePriveEligibilityReturn {
  eligibility: PriveEligibility;
  isLoading: boolean;
  error: string | null;
  isEligible: boolean;
  isPrive: boolean;
  tier: PriveTier;
  refresh: () => Promise<void>;
  markGlowSeen: () => void;
  // Invite-based access fields
  hasAccess: boolean;
  accessSource: string;
  isWhitelisted: boolean;
}

// Empty default eligibility (no mock data)
const EMPTY_ELIGIBILITY: PriveEligibility = {
  isEligible: false,
  score: 0,
  tier: 'none',
  pillars: [],
  trustScore: 0,
  hasSeenGlowThisSession: false,
};

export const usePriveEligibility = (): UsePriveEligibilityReturn => {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { computed } = useSubscription();

  // Start with empty defaults — loading state until real data arrives
  const [eligibility, setEligibility] = useState<PriveEligibility>(EMPTY_ELIGIBILITY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine tier based on score (4-tier system)
  const determineTier = (score: number, trustScore: number): PriveTier => {
    // Hard block if trust is below minimum
    if (trustScore < ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM) return 'none';

    if (score >= ELIGIBILITY_THRESHOLDS.ELITE_TIER) return 'elite';
    if (score >= ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER) return 'signature';
    if (score >= ELIGIBILITY_THRESHOLDS.ENTRY_TIER) return 'entry';
    return 'none';
  };

  // Build pillar score from raw score
  const buildPillarScore = (
    id: string,
    rawScore: number,
    trend: TrendDirection = 'stable'
  ): PillarScore => {
    const frontendId = resolvePillarId(id) || id;
    const config = PILLAR_CONFIG[frontendId as keyof typeof PILLAR_CONFIG];
    return {
      id,
      name: config.name,
      score: rawScore,
      weight: config.weight,
      weightedScore: rawScore * config.weight,
      trend,
      icon: config.icon,
      color: config.color,
      description: config.description,
      improvementTips: IMPROVEMENT_TIPS[id] || [],
    };
  };

  // Fetch eligibility from backend API using priveApi service
  const fetchEligibilityFromBackend = async (): Promise<PriveEligibility | null> => {
    try {
      const response = await priveApi.getEligibility();

      if (response.success && response.data) {
        const backendData = response.data;

        // Transform backend pillars to frontend format (map backend IDs to frontend keys)
        const pillars: PillarScore[] = backendData.pillars.map((p: any) => {
          const frontendId = resolvePillarId(p.id) || p.id;
          const config = PILLAR_CONFIG[frontendId as keyof typeof PILLAR_CONFIG] || PILLAR_CONFIG.engagement;
          return {
            id: frontendId,
            name: p.label || p.name || config.name,
            score: p.score,
            weight: p.weight,
            weightedScore: p.weightedScore,
            trend: (p.trend || 'stable') as TrendDirection,
            icon: p.icon || config.icon,
            color: p.color || config.color,
            description: p.description || config.description,
            improvementTips: p.improvementTips || IMPROVEMENT_TIPS[p.id] || [],
          };
        });

        // Derive next tier name from threshold
        let nextTierName: string | undefined;
        if (backendData.nextTierThreshold === ELIGIBILITY_THRESHOLDS.ENTRY_TIER) nextTierName = 'Entry';
        else if (backendData.nextTierThreshold === ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER) nextTierName = 'Signature';
        else if (backendData.nextTierThreshold === ELIGIBILITY_THRESHOLDS.ELITE_TIER) nextTierName = 'Elite';
        else if (backendData.nextTierThreshold === 100) nextTierName = 'Max';

        return {
          isEligible: backendData.isEligible,
          score: backendData.score,
          tier: backendData.tier as PriveTier,
          pillars,
          trustScore: backendData.trustScore,
          reason: backendData.reason || (!backendData.isEligible
            ? backendData.trustScore < ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM
              ? 'Trust score below minimum threshold'
              : 'Score below entry threshold'
            : undefined),
          accessState: backendData.accessState,
          gracePeriodEnds: backendData.gracePeriodEnds,
          hasSeenGlowThisSession: eligibility.hasSeenGlowThisSession,
          nextTierThreshold: backendData.nextTierThreshold,
          pointsToNextTier: backendData.pointsToNextTier,
          nextTierName,
          // Invite-based access fields
          hasAccess: backendData.hasAccess,
          accessSource: backendData.accessSource,
          isWhitelisted: backendData.isWhitelisted,
          effectiveTier: backendData.effectiveTier as PriveTier,
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  // Calculate eligibility from backend data or fallback to mock
  const calculateEligibility = useCallback(async (): Promise<PriveEligibility> => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      return DEFAULT_PRIVE_ELIGIBILITY;
    }

    // Fetch from backend
    const backendEligibility = await fetchEligibilityFromBackend();
    if (backendEligibility) {
      return backendEligibility;
    }

    // Backend failed — return empty eligibility with error indicator
    return {
      ...EMPTY_ELIGIBILITY,
      hasSeenGlowThisSession: eligibility.hasSeenGlowThisSession,
    };
  }, [isAuthenticated, user, null /* TODO: token not available via selectors */, eligibility.hasSeenGlowThisSession]);

  // Refresh eligibility data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newEligibility = await calculateEligibility();
      setEligibility(newEligibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate eligibility');
    } finally {
      setIsLoading(false);
    }
  }, [calculateEligibility]);

  // Mark glow animation as seen for this session
  const markGlowSeen = useCallback(() => {
    setEligibility((prev) => ({
      ...prev,
      hasSeenGlowThisSession: true,
    }));
  }, []);

  // Fetch when auth changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      calculateEligibility().then(newEligibility => {
        setEligibility(newEligibility);
      }).catch(err => {
        setError('Failed to load eligibility');
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isAuthenticated]);

  return {
    eligibility,
    isLoading,
    error,
    isEligible: eligibility.isEligible,
    // Access is the gate now — not just reputation tier
    isPrive: eligibility.hasAccess === true || eligibility.tier !== 'none',
    tier: eligibility.effectiveTier || eligibility.tier,
    refresh,
    markGlowSeen,
    // Invite-based access fields
    hasAccess: eligibility.hasAccess === true,
    accessSource: eligibility.accessSource || 'none',
    isWhitelisted: eligibility.isWhitelisted === true,
  };
};

/**
 * Get human-readable eligibility status
 */
export const getEligibilityStatus = (eligibility: PriveEligibility): {
  headline: string;
  subtext: string;
  showProgress: boolean;
} => {
  if (eligibility.trustScore < ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM) {
    return {
      headline: 'Privé Access Unavailable',
      subtext: 'Your account is under review',
      showProgress: false,
    };
  }

  if (eligibility.tier === 'elite') {
    return {
      headline: "You're Privé Elite",
      subtext: 'Top-tier access unlocked',
      showProgress: false,
    };
  }

  if (eligibility.tier === 'signature') {
    return {
      headline: "You're Privé Signature",
      subtext: 'Premium access granted',
      showProgress: true,
    };
  }

  if (eligibility.tier === 'entry') {
    return {
      headline: "You're Privé Entry",
      subtext: 'Welcome to the inner circle',
      showProgress: true,
    };
  }

  const pointsToEntry = ELIGIBILITY_THRESHOLDS.ENTRY_TIER - eligibility.score;
  if (pointsToEntry <= 10) {
    return {
      headline: "You're Almost There",
      subtext: 'Just a few more steps to Privé',
      showProgress: true,
    };
  }

  return {
    headline: 'Building Your Privé Profile',
    subtext: 'Keep engaging to unlock access',
    showProgress: true,
  };
};

/**
 * Get quick wins for improving eligibility
 */
export const getQuickWins = (pillars: PillarScore[]): string[] => {
  // Find the pillars with the most improvement potential
  const sorted = [...pillars].sort((a, b) => {
    // Prioritize by weighted potential gain
    const potentialA = (100 - a.score) * a.weight;
    const potentialB = (100 - b.score) * b.weight;
    return potentialB - potentialA;
  });

  // Get tips from top 2 improvable pillars
  const quickWins: string[] = [];
  for (const pillar of sorted.slice(0, 2)) {
    if (pillar.improvementTips.length > 0) {
      quickWins.push(pillar.improvementTips[0]);
    }
  }

  return quickWins;
};

export default usePriveEligibility;
