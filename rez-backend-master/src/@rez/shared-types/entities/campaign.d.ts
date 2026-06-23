// @ts-nocheck
/**
 * Campaign entity types — unified surface across three services:
 *
 *   - rez-marketing-service/src/models/MarketingCampaign.ts
 *   - rez-merchant-service/src/models/AdCampaign.ts
 *   - rez-ads-service/src/models/AdCampaign.ts
 *
 * Each service extends `IBaseCampaign` with domain-specific fields. The
 * disc union `ICampaign` lets callers narrow by the `type` literal.
 *
 * v2 hardening: `any` and `Record<string, any>` replaced with typed
 * shapes (`IAudienceTargeting`, `ICampaignCondition`, `ICampaignAction`,
 * `ICampaignTrigger`). Anything still truly opaque uses the
 * `ICampaignMetadata` scalar-only catchall.
 */
import { CampaignStatus, CampaignChannel } from '../enums/index';
/**
 * Scalar-only metadata bag — primitives and arrays of primitives. For
 * anything richer, give it its own field or a typed interface.
 */
export type ICampaignMetadata = Record<string, string | number | boolean | null | string[] | number[]>;
/**
 * Audience targeting — union of the five supported segment rules plus
 * location / interest overlays. Extend with a new variant rather than
 * widening existing ones.
 */
export interface IAudienceTargeting {
  segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
  /** Used with `segment: 'lapsed'`. */
  daysInactive?: number;
  /** Used with `segment: 'high_value'`. */
  minSpend?: number;
  location?: {
    city?: string;
    area?: string;
    pincode?: string;
    radiusKm?: number;
  };
  interests?: string[];
  institution?: string;
  /** Arbitrary keyword match on product / order history. */
  keyword?: string;
  /** Estimated reachable count (populated at dispatch time). */
  estimatedCount?: number;
}
export interface ICampaignStats {
  sent?: number;
  delivered?: number;
  failed?: number;
  deduped?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
}
/**
 * Condition row for rules-engine campaigns. `field` is a dotted path
 * into the evaluation context (e.g. "user.age", "order.total").
 */
export interface ICampaignCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
  value?: string | number | boolean | null | Array<string | number>;
}
export interface ICampaignAction {
  kind: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
  params?: ICampaignMetadata;
}
export interface ICampaignTrigger {
  event: 'order.placed' | 'order.delivered' | 'visit.completed' | 'signup' | 'referral.invite' | 'cron' | 'manual';
  /** Only fire if these conditions all match at trigger time. */
  filters?: ICampaignCondition[];
}
/** Base campaign — minimal fields shared by all three services. */
export interface IBaseCampaign {
  _id?: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  startDate: Date | string;
  endDate?: Date | string;
  channel?: CampaignChannel;
  targetAudience?: IAudienceTargeting;
  budget?: number;
  spent?: number;
  createdBy?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
/**
 * Marketing campaign — rez-marketing-service.
 */
export interface IMarketingCampaign extends IBaseCampaign {
  type?: 'marketing';
  merchantId?: string;
  objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
  message?: string;
  templateName?: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaText?: string;
  audience?: IAudienceTargeting;
  scheduledAt?: Date | string;
  sentAt?: Date | string;
  stats?: ICampaignStats;
  errorMessage?: string;
  dailyBudget?: number;
  totalSpent?: number;
  attributionWindowDays?: number;
}
/**
 * Ad campaign — rez-ads-service and rez-merchant-service share this collection.
 */
export interface IAdCampaign extends IBaseCampaign {
  type?: 'ad';
  merchantId?: string;
  storeId?: string;
  title?: string;
  headline?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
  targetSegment?: 'all' | 'new' | 'loyal' | 'lapsed' | 'nearby';
  targetLocation?: {
    city?: string;
    radiusKm?: number;
  };
  targetInterests?: string[];
  bidType?: 'CPC' | 'CPM';
  bidAmount?: number;
  dailyBudget?: number;
  totalBudget?: number;
  totalSpent?: number;
  frequencyCapDays?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  reviewedBy?: string;
  reviewedAt?: Date | string;
  rejectionReason?: string;
}
/**
 * Merchant loyalty / promotion campaign — rez-merchant-service.
 *
 * Rules-engine shaped: array of triggers + conditions + actions.
 */
export interface IMerchantCampaign extends IBaseCampaign {
  type?: 'merchant';
  merchantId?: string;
  storeId?: string;
  title?: string;
  discountPercentage?: number;
  maxRedemptions?: number;
  redemptionCount?: number;
  appliedProducts?: string[];
  rewardValue?: number;
  rewardType?: string;
  durationDays?: number;
  conditions?: ICampaignCondition[];
  actions?: ICampaignAction[];
  triggers?: ICampaignTrigger[];
  priority?: number;
  cooldownDays?: number;
}
export type ICampaign = IMarketingCampaign | IAdCampaign | IMerchantCampaign;
//# sourceMappingURL=campaign.d.ts.map
