/**
 * Influencer / Creator module — shared type definitions (Phase 4.7).
 *
 * The Influencer module lets users discover creators on the platform
 * (lifestyle, food, beauty, tech, etc.), follow them, and join brand
 * campaigns that the creators are running. Joining a campaign earns the
 * user a coin reward and counts toward creator campaign metrics.
 *
 * Types are duplicated between frontend and backend so either side can
 * evolve the contract in lock-step. Frontend definitions are the
 * canonical read shape; the backend (`src/routes/b/salonInfluencer.ts`)
 * produces equivalent payloads.
 *
 * Money convention
 * ----------------
 *  - Campaign rewards on the wire are integer paise (1/100 of a rupee).
 *  - The UI is responsible for dividing by 100 and formatting via
 *    `formatPrice(...)` from `@/utils/priceFormatter`.
 */

/**
 * Top-level creator categories exposed in the influencer catalogue.
 *
 * Order is the render order on the chip strip. Add new values here AND
 * in the backend's `INFLUENCER_CATEGORIES` tuple — they must stay in
 * sync.
 */
export const INFLUENCER_CATEGORIES = [
  'lifestyle',
  'food',
  'beauty',
  'fashion',
  'tech',
  'fitness',
  'travel',
  'finance',
] as const;

/** Union of valid category strings. */
export type InfluencerCategory = (typeof INFLUENCER_CATEGORIES)[number];

/** Human-readable label for a category. */
export const INFLUENCER_CATEGORY_LABELS: Record<InfluencerCategory, string> = {
  lifestyle: 'Lifestyle',
  food: 'Food',
  beauty: 'Beauty',
  fashion: 'Fashion',
  tech: 'Tech',
  fitness: 'Fitness',
  travel: 'Travel',
  finance: 'Finance',
};

/**
 * A creator surfaced in the discovery feed.
 *
 * `avatarUrl` is optional — the UI falls back to the first letter of
 * `name` rendered inside a coloured circle.
 */
export interface Influencer {
  /** Stable opaque id used as a `FlatList` key and analytics id. */
  id: string;
  /** Display name, e.g. "Aanya Sharma". */
  name: string;
  /** Platform handle, e.g. "@aanyas". */
  handle: string;
  /** Optional avatar image URL. */
  avatarUrl?: string;
  /** Total follower count across the creator's connected channels. */
  followerCount: number;
  /** Creator vertical. */
  category: InfluencerCategory;
  /** One-or-two-line bio. */
  bio: string;
  /** Whether the current user already follows this creator. */
  isFollowing: boolean;
  /** Number of campaigns the creator has run on the platform. */
  campaignCount: number;
}

/**
 * A brand campaign run by a creator that the user can join.
 *
 * Joining a campaign credits `rewardPaise` coins to the user's wallet
 * and counts the user toward `participantsCount`. The `endDate` is the
 * deadline after which the campaign is no longer joinable.
 */
export interface InfluencerCampaign {
  id: string;
  /** Foreign key into `Influencer.id`. */
  influencerId: string;
  /** Campaign headline, e.g. "Try the new Lakme Skin Gloss and share your review". */
  title: string;
  /** Brand sponsoring the campaign, e.g. "Lakme". */
  brand: string;
  /** One-or-two-line description of what the user needs to do. */
  description: string;
  /** Coin reward credited on joining, in paise. */
  rewardPaise: number;
  /** ISO-8601 timestamp the campaign opens. */
  startDate: string;
  /** ISO-8601 timestamp the campaign closes. */
  endDate: string;
  /** How many users have joined so far. */
  participantsCount: number;
  /** Whether the current user has already joined this campaign. */
  isJoined: boolean;
}

// ---------------------------------------------------------------------------
// Type-guards
// ---------------------------------------------------------------------------

/** Type-guard — `InfluencerCategory`. */
export function isInfluencerCategory(
  value: unknown,
): value is InfluencerCategory {
  return (
    typeof value === 'string' &&
    (INFLUENCER_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

/** Type-guard — `Influencer`. Extra fields are allowed and ignored. */
export function isInfluencer(value: unknown): value is Influencer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.handle === 'string' &&
    (v.avatarUrl === undefined || typeof v.avatarUrl === 'string') &&
    typeof v.followerCount === 'number' &&
    Number.isFinite(v.followerCount) &&
    v.followerCount >= 0 &&
    isInfluencerCategory(v.category) &&
    typeof v.bio === 'string' &&
    typeof v.isFollowing === 'boolean' &&
    typeof v.campaignCount === 'number' &&
    Number.isFinite(v.campaignCount) &&
    v.campaignCount >= 0
  );
}

/** Type-guard — `InfluencerCampaign`. */
export function isInfluencerCampaign(
  value: unknown,
): value is InfluencerCampaign {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.influencerId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.brand === 'string' &&
    typeof v.description === 'string' &&
    typeof v.rewardPaise === 'number' &&
    Number.isFinite(v.rewardPaise) &&
    v.rewardPaise >= 0 &&
    typeof v.startDate === 'string' &&
    typeof v.endDate === 'string' &&
    typeof v.participantsCount === 'number' &&
    Number.isFinite(v.participantsCount) &&
    v.participantsCount >= 0 &&
    typeof v.isJoined === 'boolean'
  );
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/**
 * Normalise a raw backend payload into clean `Influencer[]`.
 *
 * Drops invalid entries, deduplicates by `id`, preserves the order the
 * backend emitted them in. Returns an empty array if nothing valid is
 * present — never throws.
 */
export function normalizeInfluencers(raw: unknown): Influencer[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: Influencer[] = [];
  for (const value of raw) {
    if (!isInfluencer(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `InfluencerCampaign[]`. */
export function normalizeInfluencerCampaigns(
  raw: unknown,
): InfluencerCampaign[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: InfluencerCampaign[] = [];
  for (const value of raw) {
    if (!isInfluencerCampaign(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  // Earliest-ending first — drives urgency for the user.
  clean.sort((a, b) => {
    const aMs = new Date(a.endDate).getTime();
    const bMs = new Date(b.endDate).getTime();
    return aMs - bMs;
  });
  return clean;
}
