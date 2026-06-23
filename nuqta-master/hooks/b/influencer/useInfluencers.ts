/**
 * useInfluencers — discover creators and act on their campaigns.
 *
 * Phase 4.7 of the REZ-vs-NUQTA migration. Wraps four B-side endpoints:
 *
 *   - `GET  /api/b/influencer`             — list creators.
 *   - `GET  /api/b/influencer/:id/campaigns` — campaigns for one creator.
 *   - `POST /api/b/influencer/campaigns/:id/join` — toggle a join.
 *   - `POST /api/b/influencer/:id/follow`  — toggle follow state.
 *
 * State model
 * -----------
 *   - `influencers` and `campaigns` are the canonical server-mirrored
 *     lists. They are loaded on demand and updated optimistically on
 *     mutations (follow / join), then reconciled by a refresh.
 *   - `isJoining` and `isFollowing` are in-flight flags that the UI
 *     uses to disable the corresponding buttons while a mutation is
 *     pending. They are independent of the global loading flag so a
 *     follow doesn't re-render the entire list.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { influencers, campaigns, list, join, followToggle, isJoining, isFollowing, error } =
 *    useInfluencers();
 *  ```
 */
import { useCallback, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  type Influencer,
  type InfluencerCampaign,
  type InfluencerCategory,
  normalizeInfluencers,
  normalizeInfluencerCampaigns,
} from '@/types/influencer.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Endpoint for the influencer list. */
const LIST_ENDPOINT = '/api/b/influencer';

/** Helper to build the per-influencer campaigns endpoint. */
function campaignsEndpoint(influencerId: string): string {
  return `/api/b/influencer/${encodeURIComponent(influencerId)}/campaigns`;
}

/** Helper to build the campaign-join endpoint. */
function joinEndpoint(campaignId: string): string {
  return `/api/b/influencer/campaigns/${encodeURIComponent(campaignId)}/join`;
}

/** Helper to build the follow endpoint. */
function followEndpoint(influencerId: string): string {
  return `/api/b/influencer/${encodeURIComponent(influencerId)}/follow`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Filters supported by the influencer list endpoint. */
export interface InfluencerListFilters {
  /** Optional category filter, e.g. `'beauty'`. */
  category?: InfluencerCategory;
}

export interface UseInfluencersResult {
  /** Current influencer list. */
  influencers: Influencer[];
  /** Campaigns loaded for the most recent influencer detail. */
  campaigns: InfluencerCampaign[];
  /** `true` while a list / campaigns fetch is in flight. */
  isLoading: boolean;
  /** `true` while a campaign-join mutation is in flight. */
  isJoining: boolean;
  /** `true` while a follow mutation is in flight. */
  isFollowing: boolean;
  /** Last error message, or `null`. */
  error: string | null;
  /** Fetch / re-fetch the influencer list with the supplied filters. */
  list: (filters?: InfluencerListFilters) => Promise<Influencer[]>;
  /** Fetch campaigns for a single influencer. */
  getCampaigns: (influencerId: string) => Promise<InfluencerCampaign[]>;
  /** Toggle the user's join on a campaign. */
  join: (campaignId: string) => Promise<InfluencerCampaign>;
  /** Toggle the user's follow on an influencer. */
  followToggle: (influencerId: string) => Promise<Influencer>;
  /** Re-fetch the most recent list query. */
  refresh: () => Promise<void>;
  /** Currently-applied list filters (echoed for UI). */
  filters: InfluencerListFilters;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

interface ListResponse {
  influencers: Influencer[];
}

interface CampaignsResponse {
  campaigns: InfluencerCampaign[];
}

interface JoinResponse {
  campaign: InfluencerCampaign;
}

interface FollowResponse {
  influencer: Influencer;
  following: boolean;
}

async function fetchList(
  filters: InfluencerListFilters,
): Promise<Influencer[]> {
  const params: Record<string, string> = {};
  if (
    typeof filters.category === 'string' &&
    filters.category.length > 0
  ) {
    params['category'] = filters.category;
  }
  const response = await apiClient.get<ListResponse>(
    LIST_ENDPOINT,
    Object.keys(params).length > 0 ? params : undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load influencers',
    );
    throw new Error(message);
  }
  return normalizeInfluencers(response.data.influencers);
}

async function fetchCampaigns(
  influencerId: string,
): Promise<InfluencerCampaign[]> {
  const response = await apiClient.get<CampaignsResponse>(
    campaignsEndpoint(influencerId),
    undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load campaigns',
    );
    throw new Error(message);
  }
  return normalizeInfluencerCampaigns(response.data.campaigns);
}

async function fetchJoin(campaignId: string): Promise<InfluencerCampaign> {
  const response = await apiClient.post<JoinResponse>(
    joinEndpoint(campaignId),
    undefined,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to join campaign',
    );
    throw new Error(message);
  }
  return response.data.campaign;
}

async function fetchFollow(influencerId: string): Promise<Influencer> {
  const response = await apiClient.post<FollowResponse>(
    followEndpoint(influencerId),
    undefined,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to toggle follow',
    );
    throw new Error(message);
  }
  return response.data.influencer;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `useInfluencers` — read and mutate the creator / campaign state.
 *
 * The hook is *not* backed by a Zustand store; it lives in component
 * state so each page has an independent copy. Optimistic updates are
 * applied to `influencers` and `campaigns` immediately on a successful
 * mutation so the UI feels snappy; the server response is then merged
 * back in to reconcile any drift.
 */
export function useInfluencers(): UseInfluencersResult {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InfluencerListFilters>({});

  // Latest filters ref — `refresh()` always re-runs the most recent
  // list query even though the state value may have been replaced.
  const filtersRef = useRef<InfluencerListFilters>(filters);
  filtersRef.current = filters;

  // Mount ref to guard against late setState after unmount.
  const mountedRef = useRef<boolean>(true);
  mountedRef.current = true;

  /**
   * Public: fetch / re-fetch the influencer list. Sets `isLoading`
   * and updates `influencers` in place. Throws on failure.
   */
  const list = useCallback(
    async (next: InfluencerListFilters = {}): Promise<Influencer[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchList(next);
        if (mountedRef.current) {
          setInfluencers(result);
          setFilters(next);
        }
        return result;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'influencer_list_failed',
          { filters: next, error: message },
          'B Features',
        );
        if (mountedRef.current) {
          setError(message);
        }
        throw err instanceof Error ? err : new Error(message);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  /**
   * Public: fetch campaigns for one influencer. Updates the `campaigns`
   * slice so the page can render a campaigns tab without an extra
   * store. Throws on failure.
   */
  const getCampaigns = useCallback(
    async (influencerId: string): Promise<InfluencerCampaign[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchCampaigns(influencerId);
        if (mountedRef.current) {
          setCampaigns(result);
        }
        return result;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'influencer_campaigns_failed',
          { influencerId, error: message },
          'B Features',
        );
        if (mountedRef.current) {
          setError(message);
        }
        throw err instanceof Error ? err : new Error(message);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  /**
   * Public: toggle the user's join on a campaign. Optimistically
   * updates the `campaigns` slice so the UI flips immediately, then
   * merges the server response.
   */
  const join = useCallback(
    async (campaignId: string): Promise<InfluencerCampaign> => {
      // Optimistic flip — easiest to use the previous value if the
      // campaign exists in the current slice.
      const previous = campaigns.find((c) => c.id === campaignId);
      if (previous !== undefined) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  isJoined: !c.isJoined,
                  participantsCount: c.isJoined
                    ? Math.max(0, c.participantsCount - 1)
                    : c.participantsCount + 1,
                }
              : c,
          ),
        );
      }
      setIsJoining(true);
      setError(null);
      try {
        const updated = await fetchJoin(campaignId);
        if (mountedRef.current) {
          setCampaigns((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
        }
        return updated;
      } catch (err) {
        // Roll back the optimistic flip on failure.
        if (previous !== undefined) {
          setCampaigns((prev) =>
            prev.map((c) => (c.id === campaignId ? previous : c)),
          );
        }
        const message = errorToString(err);
        logger.warn(
          'influencer_join_failed',
          { campaignId, error: message },
          'B Features',
        );
        if (mountedRef.current) {
          setError(message);
        }
        throw err instanceof Error ? err : new Error(message);
      } finally {
        if (mountedRef.current) {
          setIsJoining(false);
        }
      }
    },
    [campaigns],
  );

  /**
   * Public: toggle the user's follow state on an influencer.
   * Optimistically updates the `influencers` slice.
   */
  const followToggle = useCallback(
    async (influencerId: string): Promise<Influencer> => {
      // Optimistic flip on the influencers slice.
      const previous = influencers.find((i) => i.id === influencerId);
      if (previous !== undefined) {
        setInfluencers((prev) =>
          prev.map((i) =>
            i.id === influencerId ? { ...i, isFollowing: !i.isFollowing } : i,
          ),
        );
      }
      setIsFollowing(true);
      setError(null);
      try {
        const updated = await fetchFollow(influencerId);
        if (mountedRef.current) {
          setInfluencers((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i)),
          );
        }
        return updated;
      } catch (err) {
        if (previous !== undefined) {
          setInfluencers((prev) =>
            prev.map((i) => (i.id === influencerId ? previous : i)),
          );
        }
        const message = errorToString(err);
        logger.warn(
          'influencer_follow_failed',
          { influencerId, error: message },
          'B Features',
        );
        if (mountedRef.current) {
          setError(message);
        }
        throw err instanceof Error ? err : new Error(message);
      } finally {
        if (mountedRef.current) {
          setIsFollowing(false);
        }
      }
    },
    [influencers],
  );

  /** Public: re-run the most recent list query. */
  const refresh = useCallback(async (): Promise<void> => {
    await list(filtersRef.current);
  }, [list]);

  return {
    influencers,
    campaigns,
    isLoading,
    isJoining,
    isFollowing,
    error,
    list,
    getCampaigns,
    join,
    followToggle,
    refresh,
    filters,
  };
}

export default useInfluencers;
