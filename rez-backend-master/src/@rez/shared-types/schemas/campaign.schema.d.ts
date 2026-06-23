// @ts-nocheck
/**
 * Campaign zod schemas — unified surface for three services:
 *
 *   - rez-marketing-service
 *   - rez-merchant-service
 *   - rez-ads-service
 *
 * v2 hardening: `z.record(z.any())` replaced with typed audience /
 * condition / action / trigger sub-schemas so drift can't hide here
 * either. Anything still opaque rides on `ICampaignMetadata` —
 * scalar-only index signature.
 */
import { z } from 'zod';
export declare const CAMPAIGN_STATUS: z.ZodEnum<
  [
    'draft',
    'scheduled',
    'sending',
    'sent',
    'pending_review',
    'active',
    'paused',
    'completed',
    'expired',
    'rejected',
    'failed',
    'cancelled',
  ]
>;
export declare const CAMPAIGN_CHANNEL: z.ZodEnum<
  ['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']
>;
export declare const AudienceTargetingSchema: z.ZodObject<
  {
    segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
    daysInactive: z.ZodOptional<z.ZodNumber>;
    minSpend: z.ZodOptional<z.ZodNumber>;
    location: z.ZodOptional<
      z.ZodObject<
        {
          city: z.ZodOptional<z.ZodString>;
          area: z.ZodOptional<z.ZodString>;
          pincode: z.ZodOptional<z.ZodString>;
          radiusKm: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          city?: string;
          pincode?: string;
          area?: string;
          radiusKm?: number;
        },
        {
          city?: string;
          pincode?: string;
          area?: string;
          radiusKm?: number;
        }
      >
    >;
    interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    institution: z.ZodOptional<z.ZodString>;
    keyword: z.ZodOptional<z.ZodString>;
    estimatedCount: z.ZodOptional<z.ZodNumber>;
  },
  'strict',
  z.ZodTypeAny,
  {
    segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
    daysInactive?: number;
    minSpend?: number;
    location?: {
      city?: string;
      pincode?: string;
      area?: string;
      radiusKm?: number;
    };
    interests?: string[];
    institution?: string;
    keyword?: string;
    estimatedCount?: number;
  },
  {
    segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
    daysInactive?: number;
    minSpend?: number;
    location?: {
      city?: string;
      pincode?: string;
      area?: string;
      radiusKm?: number;
    };
    interests?: string[];
    institution?: string;
    keyword?: string;
    estimatedCount?: number;
  }
>;
export declare const CampaignConditionSchema: z.ZodObject<
  {
    field: z.ZodString;
    operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
    value: z.ZodOptional<
      z.ZodUnion<
        [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>]
      >
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    value?: string | number | boolean | (string | number)[];
    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
    field?: string;
  },
  {
    value?: string | number | boolean | (string | number)[];
    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
    field?: string;
  }
>;
export declare const CampaignActionSchema: z.ZodObject<
  {
    kind: z.ZodEnum<['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']>;
    params: z.ZodOptional<
      z.ZodRecord<
        z.ZodString,
        z.ZodUnion<
          [
            z.ZodString,
            z.ZodNumber,
            z.ZodBoolean,
            z.ZodNull,
            z.ZodArray<z.ZodString, 'many'>,
            z.ZodArray<z.ZodNumber, 'many'>,
          ]
        >
      >
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    params?: Record<string, string | number | boolean | string[] | number[]>;
    kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
  },
  {
    params?: Record<string, string | number | boolean | string[] | number[]>;
    kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
  }
>;
export declare const CampaignTriggerSchema: z.ZodObject<
  {
    event: z.ZodEnum<
      ['order.placed', 'order.delivered', 'visit.completed', 'signup', 'referral.invite', 'cron', 'manual']
    >;
    filters: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            field: z.ZodString;
            operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
            value: z.ZodOptional<
              z.ZodUnion<
                [
                  z.ZodString,
                  z.ZodNumber,
                  z.ZodBoolean,
                  z.ZodNull,
                  z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                ]
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          },
          {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }
        >,
        'many'
      >
    >;
  },
  'strict',
  z.ZodTypeAny,
  {
    event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
    filters?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
  },
  {
    event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
    filters?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
  }
>;
export declare const BaseCampaignSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    description?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
  },
  {
    name?: string;
    description?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
  }
>;
export declare const CreateMarketingCampaignSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  } & {
    type: z.ZodOptional<z.ZodLiteral<'marketing'>>;
    merchantId: z.ZodOptional<z.ZodString>;
    objective: z.ZodOptional<z.ZodEnum<['awareness', 'engagement', 'sales', 'win_back']>>;
    message: z.ZodOptional<z.ZodString>;
    templateName: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    ctaUrl: z.ZodOptional<z.ZodString>;
    ctaText: z.ZodOptional<z.ZodString>;
    audience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    scheduledAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    dailyBudget: z.ZodOptional<z.ZodNumber>;
    attributionWindowDays: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    message?: string;
    type?: 'marketing';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
    templateName?: string;
    ctaUrl?: string;
    audience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    scheduledAt?: string | Date;
    dailyBudget?: number;
    attributionWindowDays?: number;
  },
  {
    name?: string;
    message?: string;
    type?: 'marketing';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
    templateName?: string;
    ctaUrl?: string;
    audience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    scheduledAt?: string | Date;
    dailyBudget?: number;
    attributionWindowDays?: number;
  }
>;
export declare const UpdateMarketingCampaignSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<
      z.ZodEnum<
        [
          'draft',
          'scheduled',
          'sending',
          'sent',
          'pending_review',
          'active',
          'paused',
          'completed',
          'expired',
          'rejected',
          'failed',
          'cancelled',
        ]
      >
    >;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>>;
    channel: z.ZodOptional<
      z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>
    >;
    targetAudience: z.ZodOptional<
      z.ZodOptional<
        z.ZodObject<
          {
            segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
            daysInactive: z.ZodOptional<z.ZodNumber>;
            minSpend: z.ZodOptional<z.ZodNumber>;
            location: z.ZodOptional<
              z.ZodObject<
                {
                  city: z.ZodOptional<z.ZodString>;
                  area: z.ZodOptional<z.ZodString>;
                  pincode: z.ZodOptional<z.ZodString>;
                  radiusKm: z.ZodOptional<z.ZodNumber>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                },
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                }
              >
            >;
            interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            institution: z.ZodOptional<z.ZodString>;
            keyword: z.ZodOptional<z.ZodString>;
            estimatedCount: z.ZodOptional<z.ZodNumber>;
          },
          'strict',
          z.ZodTypeAny,
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          },
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          }
        >
      >
    >;
    budget: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    spent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    createdBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodLiteral<'marketing'>>>;
    merchantId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    objective: z.ZodOptional<z.ZodOptional<z.ZodEnum<['awareness', 'engagement', 'sales', 'win_back']>>>;
    message: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    templateName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ctaUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ctaText: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    audience: z.ZodOptional<
      z.ZodOptional<
        z.ZodObject<
          {
            segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
            daysInactive: z.ZodOptional<z.ZodNumber>;
            minSpend: z.ZodOptional<z.ZodNumber>;
            location: z.ZodOptional<
              z.ZodObject<
                {
                  city: z.ZodOptional<z.ZodString>;
                  area: z.ZodOptional<z.ZodString>;
                  pincode: z.ZodOptional<z.ZodString>;
                  radiusKm: z.ZodOptional<z.ZodNumber>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                },
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                }
              >
            >;
            interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            institution: z.ZodOptional<z.ZodString>;
            keyword: z.ZodOptional<z.ZodString>;
            estimatedCount: z.ZodOptional<z.ZodNumber>;
          },
          'strict',
          z.ZodTypeAny,
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          },
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          }
        >
      >
    >;
    scheduledAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>>;
    dailyBudget: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    attributionWindowDays: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    message?: string;
    type?: 'marketing';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
    templateName?: string;
    ctaUrl?: string;
    audience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    scheduledAt?: string | Date;
    dailyBudget?: number;
    attributionWindowDays?: number;
  },
  {
    name?: string;
    message?: string;
    type?: 'marketing';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
    templateName?: string;
    ctaUrl?: string;
    audience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    scheduledAt?: string | Date;
    dailyBudget?: number;
    attributionWindowDays?: number;
  }
>;
export declare const MarketingCampaignResponseSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  } & {
    type: z.ZodOptional<z.ZodLiteral<'marketing'>>;
    merchantId: z.ZodOptional<z.ZodString>;
    objective: z.ZodOptional<z.ZodEnum<['awareness', 'engagement', 'sales', 'win_back']>>;
    message: z.ZodOptional<z.ZodString>;
    templateName: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    ctaUrl: z.ZodOptional<z.ZodString>;
    ctaText: z.ZodOptional<z.ZodString>;
    audience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    scheduledAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    dailyBudget: z.ZodOptional<z.ZodNumber>;
    attributionWindowDays: z.ZodOptional<z.ZodNumber>;
  } & {
    _id: z.ZodOptional<z.ZodString>;
    sentAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    stats: z.ZodOptional<
      z.ZodObject<
        {
          sent: z.ZodOptional<z.ZodNumber>;
          delivered: z.ZodOptional<z.ZodNumber>;
          failed: z.ZodOptional<z.ZodNumber>;
          deduped: z.ZodOptional<z.ZodNumber>;
          opened: z.ZodOptional<z.ZodNumber>;
          clicked: z.ZodOptional<z.ZodNumber>;
          converted: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          failed?: number;
          delivered?: number;
          sent?: number;
          deduped?: number;
          opened?: number;
          clicked?: number;
          converted?: number;
        },
        {
          failed?: number;
          delivered?: number;
          sent?: number;
          deduped?: number;
          opened?: number;
          clicked?: number;
          converted?: number;
        }
      >
    >;
    errorMessage: z.ZodOptional<z.ZodString>;
    totalSpent: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    message?: string;
    type?: 'marketing';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    totalSpent?: number;
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
    templateName?: string;
    ctaUrl?: string;
    audience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    scheduledAt?: string | Date;
    dailyBudget?: number;
    attributionWindowDays?: number;
    sentAt?: string | Date;
    stats?: {
      failed?: number;
      delivered?: number;
      sent?: number;
      deduped?: number;
      opened?: number;
      clicked?: number;
      converted?: number;
    };
    errorMessage?: string;
  },
  {
    name?: string;
    message?: string;
    type?: 'marketing';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    totalSpent?: number;
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
    templateName?: string;
    ctaUrl?: string;
    audience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    scheduledAt?: string | Date;
    dailyBudget?: number;
    attributionWindowDays?: number;
    sentAt?: string | Date;
    stats?: {
      failed?: number;
      delivered?: number;
      sent?: number;
      deduped?: number;
      opened?: number;
      clicked?: number;
      converted?: number;
    };
    errorMessage?: string;
  }
>;
export declare const CreateAdCampaignSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  } & {
    type: z.ZodOptional<z.ZodLiteral<'ad'>>;
    merchantId: z.ZodOptional<z.ZodString>;
    storeId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    headline: z.ZodOptional<z.ZodString>;
    ctaText: z.ZodOptional<z.ZodString>;
    ctaUrl: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    placement: z.ZodOptional<z.ZodEnum<['home_banner', 'explore_feed', 'store_listing', 'search_result']>>;
    targetSegment: z.ZodOptional<z.ZodEnum<['all', 'new', 'loyal', 'lapsed', 'nearby']>>;
    targetLocation: z.ZodOptional<
      z.ZodObject<
        {
          city: z.ZodOptional<z.ZodString>;
          radiusKm: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          city?: string;
          radiusKm?: number;
        },
        {
          city?: string;
          radiusKm?: number;
        }
      >
    >;
    targetInterests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    bidType: z.ZodOptional<z.ZodEnum<['CPC', 'CPM']>>;
    bidAmount: z.ZodOptional<z.ZodNumber>;
    dailyBudget: z.ZodOptional<z.ZodNumber>;
    totalBudget: z.ZodOptional<z.ZodNumber>;
    frequencyCapDays: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    type?: 'ad';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    ctaUrl?: string;
    dailyBudget?: number;
    storeId?: string;
    title?: string;
    headline?: string;
    placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
    targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
    targetLocation?: {
      city?: string;
      radiusKm?: number;
    };
    targetInterests?: string[];
    bidType?: 'CPC' | 'CPM';
    bidAmount?: number;
    totalBudget?: number;
    frequencyCapDays?: number;
  },
  {
    name?: string;
    type?: 'ad';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    ctaUrl?: string;
    dailyBudget?: number;
    storeId?: string;
    title?: string;
    headline?: string;
    placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
    targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
    targetLocation?: {
      city?: string;
      radiusKm?: number;
    };
    targetInterests?: string[];
    bidType?: 'CPC' | 'CPM';
    bidAmount?: number;
    totalBudget?: number;
    frequencyCapDays?: number;
  }
>;
export declare const UpdateAdCampaignSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<
      z.ZodEnum<
        [
          'draft',
          'scheduled',
          'sending',
          'sent',
          'pending_review',
          'active',
          'paused',
          'completed',
          'expired',
          'rejected',
          'failed',
          'cancelled',
        ]
      >
    >;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>>;
    channel: z.ZodOptional<
      z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>
    >;
    targetAudience: z.ZodOptional<
      z.ZodOptional<
        z.ZodObject<
          {
            segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
            daysInactive: z.ZodOptional<z.ZodNumber>;
            minSpend: z.ZodOptional<z.ZodNumber>;
            location: z.ZodOptional<
              z.ZodObject<
                {
                  city: z.ZodOptional<z.ZodString>;
                  area: z.ZodOptional<z.ZodString>;
                  pincode: z.ZodOptional<z.ZodString>;
                  radiusKm: z.ZodOptional<z.ZodNumber>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                },
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                }
              >
            >;
            interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            institution: z.ZodOptional<z.ZodString>;
            keyword: z.ZodOptional<z.ZodString>;
            estimatedCount: z.ZodOptional<z.ZodNumber>;
          },
          'strict',
          z.ZodTypeAny,
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          },
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          }
        >
      >
    >;
    budget: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    spent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    createdBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodLiteral<'ad'>>>;
    merchantId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    storeId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    headline: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ctaText: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ctaUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    placement: z.ZodOptional<
      z.ZodOptional<z.ZodEnum<['home_banner', 'explore_feed', 'store_listing', 'search_result']>>
    >;
    targetSegment: z.ZodOptional<z.ZodOptional<z.ZodEnum<['all', 'new', 'loyal', 'lapsed', 'nearby']>>>;
    targetLocation: z.ZodOptional<
      z.ZodOptional<
        z.ZodObject<
          {
            city: z.ZodOptional<z.ZodString>;
            radiusKm: z.ZodOptional<z.ZodNumber>;
          },
          'strip',
          z.ZodTypeAny,
          {
            city?: string;
            radiusKm?: number;
          },
          {
            city?: string;
            radiusKm?: number;
          }
        >
      >
    >;
    targetInterests: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>>;
    bidType: z.ZodOptional<z.ZodOptional<z.ZodEnum<['CPC', 'CPM']>>>;
    bidAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    dailyBudget: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    totalBudget: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    frequencyCapDays: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    type?: 'ad';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    ctaUrl?: string;
    dailyBudget?: number;
    storeId?: string;
    title?: string;
    headline?: string;
    placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
    targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
    targetLocation?: {
      city?: string;
      radiusKm?: number;
    };
    targetInterests?: string[];
    bidType?: 'CPC' | 'CPM';
    bidAmount?: number;
    totalBudget?: number;
    frequencyCapDays?: number;
  },
  {
    name?: string;
    type?: 'ad';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    ctaUrl?: string;
    dailyBudget?: number;
    storeId?: string;
    title?: string;
    headline?: string;
    placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
    targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
    targetLocation?: {
      city?: string;
      radiusKm?: number;
    };
    targetInterests?: string[];
    bidType?: 'CPC' | 'CPM';
    bidAmount?: number;
    totalBudget?: number;
    frequencyCapDays?: number;
  }
>;
export declare const AdCampaignResponseSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  } & {
    type: z.ZodOptional<z.ZodLiteral<'ad'>>;
    merchantId: z.ZodOptional<z.ZodString>;
    storeId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    headline: z.ZodOptional<z.ZodString>;
    ctaText: z.ZodOptional<z.ZodString>;
    ctaUrl: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    placement: z.ZodOptional<z.ZodEnum<['home_banner', 'explore_feed', 'store_listing', 'search_result']>>;
    targetSegment: z.ZodOptional<z.ZodEnum<['all', 'new', 'loyal', 'lapsed', 'nearby']>>;
    targetLocation: z.ZodOptional<
      z.ZodObject<
        {
          city: z.ZodOptional<z.ZodString>;
          radiusKm: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          city?: string;
          radiusKm?: number;
        },
        {
          city?: string;
          radiusKm?: number;
        }
      >
    >;
    targetInterests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    bidType: z.ZodOptional<z.ZodEnum<['CPC', 'CPM']>>;
    bidAmount: z.ZodOptional<z.ZodNumber>;
    dailyBudget: z.ZodOptional<z.ZodNumber>;
    totalBudget: z.ZodOptional<z.ZodNumber>;
    frequencyCapDays: z.ZodOptional<z.ZodNumber>;
  } & {
    _id: z.ZodOptional<z.ZodString>;
    totalSpent: z.ZodOptional<z.ZodNumber>;
    impressions: z.ZodOptional<z.ZodNumber>;
    clicks: z.ZodOptional<z.ZodNumber>;
    ctr: z.ZodOptional<z.ZodNumber>;
    reviewedBy: z.ZodOptional<z.ZodString>;
    reviewedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    rejectionReason: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    type?: 'ad';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    totalSpent?: number;
    spent?: number;
    ctr?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    ctaUrl?: string;
    dailyBudget?: number;
    storeId?: string;
    title?: string;
    headline?: string;
    placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
    targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
    targetLocation?: {
      city?: string;
      radiusKm?: number;
    };
    targetInterests?: string[];
    bidType?: 'CPC' | 'CPM';
    bidAmount?: number;
    totalBudget?: number;
    frequencyCapDays?: number;
    impressions?: number;
    clicks?: number;
    reviewedBy?: string;
    reviewedAt?: string | Date;
    rejectionReason?: string;
  },
  {
    name?: string;
    type?: 'ad';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    totalSpent?: number;
    spent?: number;
    ctr?: number;
    ctaText?: string;
    imageUrl?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    ctaUrl?: string;
    dailyBudget?: number;
    storeId?: string;
    title?: string;
    headline?: string;
    placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
    targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
    targetLocation?: {
      city?: string;
      radiusKm?: number;
    };
    targetInterests?: string[];
    bidType?: 'CPC' | 'CPM';
    bidAmount?: number;
    totalBudget?: number;
    frequencyCapDays?: number;
    impressions?: number;
    clicks?: number;
    reviewedBy?: string;
    reviewedAt?: string | Date;
    rejectionReason?: string;
  }
>;
export declare const CreateMerchantCampaignSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  } & {
    type: z.ZodOptional<z.ZodLiteral<'merchant'>>;
    merchantId: z.ZodOptional<z.ZodString>;
    storeId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    discountPercentage: z.ZodOptional<z.ZodNumber>;
    maxRedemptions: z.ZodOptional<z.ZodNumber>;
    appliedProducts: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    rewardValue: z.ZodOptional<z.ZodNumber>;
    rewardType: z.ZodOptional<z.ZodString>;
    durationDays: z.ZodOptional<z.ZodNumber>;
    conditions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            field: z.ZodString;
            operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
            value: z.ZodOptional<
              z.ZodUnion<
                [
                  z.ZodString,
                  z.ZodNumber,
                  z.ZodBoolean,
                  z.ZodNull,
                  z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                ]
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          },
          {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }
        >,
        'many'
      >
    >;
    actions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            kind: z.ZodEnum<['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']>;
            params: z.ZodOptional<
              z.ZodRecord<
                z.ZodString,
                z.ZodUnion<
                  [
                    z.ZodString,
                    z.ZodNumber,
                    z.ZodBoolean,
                    z.ZodNull,
                    z.ZodArray<z.ZodString, 'many'>,
                    z.ZodArray<z.ZodNumber, 'many'>,
                  ]
                >
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            params?: Record<string, string | number | boolean | string[] | number[]>;
            kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
          },
          {
            params?: Record<string, string | number | boolean | string[] | number[]>;
            kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
          }
        >,
        'many'
      >
    >;
    triggers: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            event: z.ZodEnum<
              ['order.placed', 'order.delivered', 'visit.completed', 'signup', 'referral.invite', 'cron', 'manual']
            >;
            filters: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    field: z.ZodString;
                    operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
                    value: z.ZodOptional<
                      z.ZodUnion<
                        [
                          z.ZodString,
                          z.ZodNumber,
                          z.ZodBoolean,
                          z.ZodNull,
                          z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                        ]
                      >
                    >;
                  },
                  'strict',
                  z.ZodTypeAny,
                  {
                    value?: string | number | boolean | (string | number)[];
                    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                    field?: string;
                  },
                  {
                    value?: string | number | boolean | (string | number)[];
                    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                    field?: string;
                  }
                >,
                'many'
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            event?:
              | 'manual'
              | 'signup'
              | 'order.placed'
              | 'order.delivered'
              | 'visit.completed'
              | 'referral.invite'
              | 'cron';
            filters?: {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }[];
          },
          {
            event?:
              | 'manual'
              | 'signup'
              | 'order.placed'
              | 'order.delivered'
              | 'visit.completed'
              | 'referral.invite'
              | 'cron';
            filters?: {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }[];
          }
        >,
        'many'
      >
    >;
    priority: z.ZodOptional<z.ZodNumber>;
    cooldownDays: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    type?: 'merchant';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    storeId?: string;
    title?: string;
    discountPercentage?: number;
    maxRedemptions?: number;
    appliedProducts?: string[];
    rewardValue?: number;
    rewardType?: string;
    durationDays?: number;
    conditions?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
    actions?: {
      params?: Record<string, string | number | boolean | string[] | number[]>;
      kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
    }[];
    triggers?: {
      event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
      filters?: {
        value?: string | number | boolean | (string | number)[];
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
        field?: string;
      }[];
    }[];
    priority?: number;
    cooldownDays?: number;
  },
  {
    name?: string;
    type?: 'merchant';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    storeId?: string;
    title?: string;
    discountPercentage?: number;
    maxRedemptions?: number;
    appliedProducts?: string[];
    rewardValue?: number;
    rewardType?: string;
    durationDays?: number;
    conditions?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
    actions?: {
      params?: Record<string, string | number | boolean | string[] | number[]>;
      kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
    }[];
    triggers?: {
      event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
      filters?: {
        value?: string | number | boolean | (string | number)[];
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
        field?: string;
      }[];
    }[];
    priority?: number;
    cooldownDays?: number;
  }
>;
export declare const UpdateMerchantCampaignSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<
      z.ZodEnum<
        [
          'draft',
          'scheduled',
          'sending',
          'sent',
          'pending_review',
          'active',
          'paused',
          'completed',
          'expired',
          'rejected',
          'failed',
          'cancelled',
        ]
      >
    >;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>>;
    channel: z.ZodOptional<
      z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>
    >;
    targetAudience: z.ZodOptional<
      z.ZodOptional<
        z.ZodObject<
          {
            segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
            daysInactive: z.ZodOptional<z.ZodNumber>;
            minSpend: z.ZodOptional<z.ZodNumber>;
            location: z.ZodOptional<
              z.ZodObject<
                {
                  city: z.ZodOptional<z.ZodString>;
                  area: z.ZodOptional<z.ZodString>;
                  pincode: z.ZodOptional<z.ZodString>;
                  radiusKm: z.ZodOptional<z.ZodNumber>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                },
                {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                }
              >
            >;
            interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            institution: z.ZodOptional<z.ZodString>;
            keyword: z.ZodOptional<z.ZodString>;
            estimatedCount: z.ZodOptional<z.ZodNumber>;
          },
          'strict',
          z.ZodTypeAny,
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          },
          {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          }
        >
      >
    >;
    budget: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    spent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    createdBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    type: z.ZodOptional<z.ZodOptional<z.ZodLiteral<'merchant'>>>;
    merchantId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    storeId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    discountPercentage: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maxRedemptions: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    appliedProducts: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>>;
    rewardValue: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    rewardType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    durationDays: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    conditions: z.ZodOptional<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              field: z.ZodString;
              operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
              value: z.ZodOptional<
                z.ZodUnion<
                  [
                    z.ZodString,
                    z.ZodNumber,
                    z.ZodBoolean,
                    z.ZodNull,
                    z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                  ]
                >
              >;
            },
            'strict',
            z.ZodTypeAny,
            {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            },
            {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }
          >,
          'many'
        >
      >
    >;
    actions: z.ZodOptional<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']>;
              params: z.ZodOptional<
                z.ZodRecord<
                  z.ZodString,
                  z.ZodUnion<
                    [
                      z.ZodString,
                      z.ZodNumber,
                      z.ZodBoolean,
                      z.ZodNull,
                      z.ZodArray<z.ZodString, 'many'>,
                      z.ZodArray<z.ZodNumber, 'many'>,
                    ]
                  >
                >
              >;
            },
            'strict',
            z.ZodTypeAny,
            {
              params?: Record<string, string | number | boolean | string[] | number[]>;
              kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
            },
            {
              params?: Record<string, string | number | boolean | string[] | number[]>;
              kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
            }
          >,
          'many'
        >
      >
    >;
    triggers: z.ZodOptional<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              event: z.ZodEnum<
                ['order.placed', 'order.delivered', 'visit.completed', 'signup', 'referral.invite', 'cron', 'manual']
              >;
              filters: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      field: z.ZodString;
                      operator: z.ZodEnum<
                        ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']
                      >;
                      value: z.ZodOptional<
                        z.ZodUnion<
                          [
                            z.ZodString,
                            z.ZodNumber,
                            z.ZodBoolean,
                            z.ZodNull,
                            z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                          ]
                        >
                      >;
                    },
                    'strict',
                    z.ZodTypeAny,
                    {
                      value?: string | number | boolean | (string | number)[];
                      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                      field?: string;
                    },
                    {
                      value?: string | number | boolean | (string | number)[];
                      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                      field?: string;
                    }
                  >,
                  'many'
                >
              >;
            },
            'strict',
            z.ZodTypeAny,
            {
              event?:
                | 'manual'
                | 'signup'
                | 'order.placed'
                | 'order.delivered'
                | 'visit.completed'
                | 'referral.invite'
                | 'cron';
              filters?: {
                value?: string | number | boolean | (string | number)[];
                operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                field?: string;
              }[];
            },
            {
              event?:
                | 'manual'
                | 'signup'
                | 'order.placed'
                | 'order.delivered'
                | 'visit.completed'
                | 'referral.invite'
                | 'cron';
              filters?: {
                value?: string | number | boolean | (string | number)[];
                operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                field?: string;
              }[];
            }
          >,
          'many'
        >
      >
    >;
    priority: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    cooldownDays: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    type?: 'merchant';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    storeId?: string;
    title?: string;
    discountPercentage?: number;
    maxRedemptions?: number;
    appliedProducts?: string[];
    rewardValue?: number;
    rewardType?: string;
    durationDays?: number;
    conditions?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
    actions?: {
      params?: Record<string, string | number | boolean | string[] | number[]>;
      kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
    }[];
    triggers?: {
      event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
      filters?: {
        value?: string | number | boolean | (string | number)[];
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
        field?: string;
      }[];
    }[];
    priority?: number;
    cooldownDays?: number;
  },
  {
    name?: string;
    type?: 'merchant';
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    storeId?: string;
    title?: string;
    discountPercentage?: number;
    maxRedemptions?: number;
    appliedProducts?: string[];
    rewardValue?: number;
    rewardType?: string;
    durationDays?: number;
    conditions?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
    actions?: {
      params?: Record<string, string | number | boolean | string[] | number[]>;
      kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
    }[];
    triggers?: {
      event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
      filters?: {
        value?: string | number | boolean | (string | number)[];
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
        field?: string;
      }[];
    }[];
    priority?: number;
    cooldownDays?: number;
  }
>;
export declare const MerchantCampaignResponseSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<
      [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'pending_review',
        'active',
        'paused',
        'completed',
        'expired',
        'rejected',
        'failed',
        'cancelled',
      ]
    >;
    startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
    targetAudience: z.ZodOptional<
      z.ZodObject<
        {
          segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
          daysInactive: z.ZodOptional<z.ZodNumber>;
          minSpend: z.ZodOptional<z.ZodNumber>;
          location: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                area: z.ZodOptional<z.ZodString>;
                pincode: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              }
            >
          >;
          interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          institution: z.ZodOptional<z.ZodString>;
          keyword: z.ZodOptional<z.ZodString>;
          estimatedCount: z.ZodOptional<z.ZodNumber>;
        },
        'strict',
        z.ZodTypeAny,
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        },
        {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        }
      >
    >;
    budget: z.ZodOptional<z.ZodNumber>;
    spent: z.ZodOptional<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
  } & {
    type: z.ZodOptional<z.ZodLiteral<'merchant'>>;
    merchantId: z.ZodOptional<z.ZodString>;
    storeId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    discountPercentage: z.ZodOptional<z.ZodNumber>;
    maxRedemptions: z.ZodOptional<z.ZodNumber>;
    appliedProducts: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    rewardValue: z.ZodOptional<z.ZodNumber>;
    rewardType: z.ZodOptional<z.ZodString>;
    durationDays: z.ZodOptional<z.ZodNumber>;
    conditions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            field: z.ZodString;
            operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
            value: z.ZodOptional<
              z.ZodUnion<
                [
                  z.ZodString,
                  z.ZodNumber,
                  z.ZodBoolean,
                  z.ZodNull,
                  z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                ]
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          },
          {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }
        >,
        'many'
      >
    >;
    actions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            kind: z.ZodEnum<['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']>;
            params: z.ZodOptional<
              z.ZodRecord<
                z.ZodString,
                z.ZodUnion<
                  [
                    z.ZodString,
                    z.ZodNumber,
                    z.ZodBoolean,
                    z.ZodNull,
                    z.ZodArray<z.ZodString, 'many'>,
                    z.ZodArray<z.ZodNumber, 'many'>,
                  ]
                >
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            params?: Record<string, string | number | boolean | string[] | number[]>;
            kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
          },
          {
            params?: Record<string, string | number | boolean | string[] | number[]>;
            kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
          }
        >,
        'many'
      >
    >;
    triggers: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            event: z.ZodEnum<
              ['order.placed', 'order.delivered', 'visit.completed', 'signup', 'referral.invite', 'cron', 'manual']
            >;
            filters: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    field: z.ZodString;
                    operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
                    value: z.ZodOptional<
                      z.ZodUnion<
                        [
                          z.ZodString,
                          z.ZodNumber,
                          z.ZodBoolean,
                          z.ZodNull,
                          z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                        ]
                      >
                    >;
                  },
                  'strict',
                  z.ZodTypeAny,
                  {
                    value?: string | number | boolean | (string | number)[];
                    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                    field?: string;
                  },
                  {
                    value?: string | number | boolean | (string | number)[];
                    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                    field?: string;
                  }
                >,
                'many'
              >
            >;
          },
          'strict',
          z.ZodTypeAny,
          {
            event?:
              | 'manual'
              | 'signup'
              | 'order.placed'
              | 'order.delivered'
              | 'visit.completed'
              | 'referral.invite'
              | 'cron';
            filters?: {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }[];
          },
          {
            event?:
              | 'manual'
              | 'signup'
              | 'order.placed'
              | 'order.delivered'
              | 'visit.completed'
              | 'referral.invite'
              | 'cron';
            filters?: {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }[];
          }
        >,
        'many'
      >
    >;
    priority: z.ZodOptional<z.ZodNumber>;
    cooldownDays: z.ZodOptional<z.ZodNumber>;
  } & {
    _id: z.ZodOptional<z.ZodString>;
    redemptionCount: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string;
    type?: 'merchant';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    storeId?: string;
    title?: string;
    discountPercentage?: number;
    maxRedemptions?: number;
    appliedProducts?: string[];
    rewardValue?: number;
    rewardType?: string;
    durationDays?: number;
    conditions?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
    actions?: {
      params?: Record<string, string | number | boolean | string[] | number[]>;
      kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
    }[];
    triggers?: {
      event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
      filters?: {
        value?: string | number | boolean | (string | number)[];
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
        field?: string;
      }[];
    }[];
    priority?: number;
    cooldownDays?: number;
    redemptionCount?: number;
  },
  {
    name?: string;
    type?: 'merchant';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?:
      | 'expired'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | 'rejected'
      | 'draft'
      | 'scheduled'
      | 'sending'
      | 'sent'
      | 'pending_review'
      | 'active'
      | 'paused';
    spent?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
    targetAudience?: {
      segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
      daysInactive?: number;
      minSpend?: number;
      location?: {
        city?: string;
        pincode?: string;
        area?: string;
        radiusKm?: number;
      };
      interests?: string[];
      institution?: string;
      keyword?: string;
      estimatedCount?: number;
    };
    budget?: number;
    createdBy?: string;
    storeId?: string;
    title?: string;
    discountPercentage?: number;
    maxRedemptions?: number;
    appliedProducts?: string[];
    rewardValue?: number;
    rewardType?: string;
    durationDays?: number;
    conditions?: {
      value?: string | number | boolean | (string | number)[];
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
      field?: string;
    }[];
    actions?: {
      params?: Record<string, string | number | boolean | string[] | number[]>;
      kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
    }[];
    triggers?: {
      event?: 'manual' | 'signup' | 'order.placed' | 'order.delivered' | 'visit.completed' | 'referral.invite' | 'cron';
      filters?: {
        value?: string | number | boolean | (string | number)[];
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
        field?: string;
      }[];
    }[];
    priority?: number;
    cooldownDays?: number;
    redemptionCount?: number;
  }
>;
export declare const CampaignResponseSchema: z.ZodUnion<
  [
    z.ZodObject<
      {
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<
          [
            'draft',
            'scheduled',
            'sending',
            'sent',
            'pending_review',
            'active',
            'paused',
            'completed',
            'expired',
            'rejected',
            'failed',
            'cancelled',
          ]
        >;
        startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
        endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
        targetAudience: z.ZodOptional<
          z.ZodObject<
            {
              segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
              daysInactive: z.ZodOptional<z.ZodNumber>;
              minSpend: z.ZodOptional<z.ZodNumber>;
              location: z.ZodOptional<
                z.ZodObject<
                  {
                    city: z.ZodOptional<z.ZodString>;
                    area: z.ZodOptional<z.ZodString>;
                    pincode: z.ZodOptional<z.ZodString>;
                    radiusKm: z.ZodOptional<z.ZodNumber>;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  },
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  }
                >
              >;
              interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
              institution: z.ZodOptional<z.ZodString>;
              keyword: z.ZodOptional<z.ZodString>;
              estimatedCount: z.ZodOptional<z.ZodNumber>;
            },
            'strict',
            z.ZodTypeAny,
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            },
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            }
          >
        >;
        budget: z.ZodOptional<z.ZodNumber>;
        spent: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodString>;
      } & {
        type: z.ZodOptional<z.ZodLiteral<'marketing'>>;
        merchantId: z.ZodOptional<z.ZodString>;
        objective: z.ZodOptional<z.ZodEnum<['awareness', 'engagement', 'sales', 'win_back']>>;
        message: z.ZodOptional<z.ZodString>;
        templateName: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        ctaUrl: z.ZodOptional<z.ZodString>;
        ctaText: z.ZodOptional<z.ZodString>;
        audience: z.ZodOptional<
          z.ZodObject<
            {
              segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
              daysInactive: z.ZodOptional<z.ZodNumber>;
              minSpend: z.ZodOptional<z.ZodNumber>;
              location: z.ZodOptional<
                z.ZodObject<
                  {
                    city: z.ZodOptional<z.ZodString>;
                    area: z.ZodOptional<z.ZodString>;
                    pincode: z.ZodOptional<z.ZodString>;
                    radiusKm: z.ZodOptional<z.ZodNumber>;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  },
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  }
                >
              >;
              interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
              institution: z.ZodOptional<z.ZodString>;
              keyword: z.ZodOptional<z.ZodString>;
              estimatedCount: z.ZodOptional<z.ZodNumber>;
            },
            'strict',
            z.ZodTypeAny,
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            },
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            }
          >
        >;
        scheduledAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        dailyBudget: z.ZodOptional<z.ZodNumber>;
        attributionWindowDays: z.ZodOptional<z.ZodNumber>;
      } & {
        _id: z.ZodOptional<z.ZodString>;
        sentAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        stats: z.ZodOptional<
          z.ZodObject<
            {
              sent: z.ZodOptional<z.ZodNumber>;
              delivered: z.ZodOptional<z.ZodNumber>;
              failed: z.ZodOptional<z.ZodNumber>;
              deduped: z.ZodOptional<z.ZodNumber>;
              opened: z.ZodOptional<z.ZodNumber>;
              clicked: z.ZodOptional<z.ZodNumber>;
              converted: z.ZodOptional<z.ZodNumber>;
            },
            'strip',
            z.ZodTypeAny,
            {
              failed?: number;
              delivered?: number;
              sent?: number;
              deduped?: number;
              opened?: number;
              clicked?: number;
              converted?: number;
            },
            {
              failed?: number;
              delivered?: number;
              sent?: number;
              deduped?: number;
              opened?: number;
              clicked?: number;
              converted?: number;
            }
          >
        >;
        errorMessage: z.ZodOptional<z.ZodString>;
        totalSpent: z.ZodOptional<z.ZodNumber>;
        createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        name?: string;
        message?: string;
        type?: 'marketing';
        _id?: string;
        createdAt?: string | Date;
        updatedAt?: string | Date;
        description?: string;
        merchantId?: string;
        status?:
          | 'expired'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | 'rejected'
          | 'draft'
          | 'scheduled'
          | 'sending'
          | 'sent'
          | 'pending_review'
          | 'active'
          | 'paused';
        totalSpent?: number;
        spent?: number;
        ctaText?: string;
        imageUrl?: string;
        startDate?: string | Date;
        endDate?: string | Date;
        channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
        targetAudience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        budget?: number;
        createdBy?: string;
        objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
        templateName?: string;
        ctaUrl?: string;
        audience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        scheduledAt?: string | Date;
        dailyBudget?: number;
        attributionWindowDays?: number;
        sentAt?: string | Date;
        stats?: {
          failed?: number;
          delivered?: number;
          sent?: number;
          deduped?: number;
          opened?: number;
          clicked?: number;
          converted?: number;
        };
        errorMessage?: string;
      },
      {
        name?: string;
        message?: string;
        type?: 'marketing';
        _id?: string;
        createdAt?: string | Date;
        updatedAt?: string | Date;
        description?: string;
        merchantId?: string;
        status?:
          | 'expired'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | 'rejected'
          | 'draft'
          | 'scheduled'
          | 'sending'
          | 'sent'
          | 'pending_review'
          | 'active'
          | 'paused';
        totalSpent?: number;
        spent?: number;
        ctaText?: string;
        imageUrl?: string;
        startDate?: string | Date;
        endDate?: string | Date;
        channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
        targetAudience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        budget?: number;
        createdBy?: string;
        objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
        templateName?: string;
        ctaUrl?: string;
        audience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        scheduledAt?: string | Date;
        dailyBudget?: number;
        attributionWindowDays?: number;
        sentAt?: string | Date;
        stats?: {
          failed?: number;
          delivered?: number;
          sent?: number;
          deduped?: number;
          opened?: number;
          clicked?: number;
          converted?: number;
        };
        errorMessage?: string;
      }
    >,
    z.ZodObject<
      {
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<
          [
            'draft',
            'scheduled',
            'sending',
            'sent',
            'pending_review',
            'active',
            'paused',
            'completed',
            'expired',
            'rejected',
            'failed',
            'cancelled',
          ]
        >;
        startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
        endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
        targetAudience: z.ZodOptional<
          z.ZodObject<
            {
              segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
              daysInactive: z.ZodOptional<z.ZodNumber>;
              minSpend: z.ZodOptional<z.ZodNumber>;
              location: z.ZodOptional<
                z.ZodObject<
                  {
                    city: z.ZodOptional<z.ZodString>;
                    area: z.ZodOptional<z.ZodString>;
                    pincode: z.ZodOptional<z.ZodString>;
                    radiusKm: z.ZodOptional<z.ZodNumber>;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  },
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  }
                >
              >;
              interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
              institution: z.ZodOptional<z.ZodString>;
              keyword: z.ZodOptional<z.ZodString>;
              estimatedCount: z.ZodOptional<z.ZodNumber>;
            },
            'strict',
            z.ZodTypeAny,
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            },
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            }
          >
        >;
        budget: z.ZodOptional<z.ZodNumber>;
        spent: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodString>;
      } & {
        type: z.ZodOptional<z.ZodLiteral<'ad'>>;
        merchantId: z.ZodOptional<z.ZodString>;
        storeId: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        headline: z.ZodOptional<z.ZodString>;
        ctaText: z.ZodOptional<z.ZodString>;
        ctaUrl: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        placement: z.ZodOptional<z.ZodEnum<['home_banner', 'explore_feed', 'store_listing', 'search_result']>>;
        targetSegment: z.ZodOptional<z.ZodEnum<['all', 'new', 'loyal', 'lapsed', 'nearby']>>;
        targetLocation: z.ZodOptional<
          z.ZodObject<
            {
              city: z.ZodOptional<z.ZodString>;
              radiusKm: z.ZodOptional<z.ZodNumber>;
            },
            'strip',
            z.ZodTypeAny,
            {
              city?: string;
              radiusKm?: number;
            },
            {
              city?: string;
              radiusKm?: number;
            }
          >
        >;
        targetInterests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
        bidType: z.ZodOptional<z.ZodEnum<['CPC', 'CPM']>>;
        bidAmount: z.ZodOptional<z.ZodNumber>;
        dailyBudget: z.ZodOptional<z.ZodNumber>;
        totalBudget: z.ZodOptional<z.ZodNumber>;
        frequencyCapDays: z.ZodOptional<z.ZodNumber>;
      } & {
        _id: z.ZodOptional<z.ZodString>;
        totalSpent: z.ZodOptional<z.ZodNumber>;
        impressions: z.ZodOptional<z.ZodNumber>;
        clicks: z.ZodOptional<z.ZodNumber>;
        ctr: z.ZodOptional<z.ZodNumber>;
        reviewedBy: z.ZodOptional<z.ZodString>;
        reviewedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        rejectionReason: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        name?: string;
        type?: 'ad';
        _id?: string;
        createdAt?: string | Date;
        updatedAt?: string | Date;
        description?: string;
        merchantId?: string;
        status?:
          | 'expired'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | 'rejected'
          | 'draft'
          | 'scheduled'
          | 'sending'
          | 'sent'
          | 'pending_review'
          | 'active'
          | 'paused';
        totalSpent?: number;
        spent?: number;
        ctr?: number;
        ctaText?: string;
        imageUrl?: string;
        startDate?: string | Date;
        endDate?: string | Date;
        channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
        targetAudience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        budget?: number;
        createdBy?: string;
        ctaUrl?: string;
        dailyBudget?: number;
        storeId?: string;
        title?: string;
        headline?: string;
        placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
        targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
        targetLocation?: {
          city?: string;
          radiusKm?: number;
        };
        targetInterests?: string[];
        bidType?: 'CPC' | 'CPM';
        bidAmount?: number;
        totalBudget?: number;
        frequencyCapDays?: number;
        impressions?: number;
        clicks?: number;
        reviewedBy?: string;
        reviewedAt?: string | Date;
        rejectionReason?: string;
      },
      {
        name?: string;
        type?: 'ad';
        _id?: string;
        createdAt?: string | Date;
        updatedAt?: string | Date;
        description?: string;
        merchantId?: string;
        status?:
          | 'expired'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | 'rejected'
          | 'draft'
          | 'scheduled'
          | 'sending'
          | 'sent'
          | 'pending_review'
          | 'active'
          | 'paused';
        totalSpent?: number;
        spent?: number;
        ctr?: number;
        ctaText?: string;
        imageUrl?: string;
        startDate?: string | Date;
        endDate?: string | Date;
        channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
        targetAudience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        budget?: number;
        createdBy?: string;
        ctaUrl?: string;
        dailyBudget?: number;
        storeId?: string;
        title?: string;
        headline?: string;
        placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
        targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
        targetLocation?: {
          city?: string;
          radiusKm?: number;
        };
        targetInterests?: string[];
        bidType?: 'CPC' | 'CPM';
        bidAmount?: number;
        totalBudget?: number;
        frequencyCapDays?: number;
        impressions?: number;
        clicks?: number;
        reviewedBy?: string;
        reviewedAt?: string | Date;
        rejectionReason?: string;
      }
    >,
    z.ZodObject<
      {
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<
          [
            'draft',
            'scheduled',
            'sending',
            'sent',
            'pending_review',
            'active',
            'paused',
            'completed',
            'expired',
            'rejected',
            'failed',
            'cancelled',
          ]
        >;
        startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
        endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
        targetAudience: z.ZodOptional<
          z.ZodObject<
            {
              segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
              daysInactive: z.ZodOptional<z.ZodNumber>;
              minSpend: z.ZodOptional<z.ZodNumber>;
              location: z.ZodOptional<
                z.ZodObject<
                  {
                    city: z.ZodOptional<z.ZodString>;
                    area: z.ZodOptional<z.ZodString>;
                    pincode: z.ZodOptional<z.ZodString>;
                    radiusKm: z.ZodOptional<z.ZodNumber>;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  },
                  {
                    city?: string;
                    pincode?: string;
                    area?: string;
                    radiusKm?: number;
                  }
                >
              >;
              interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
              institution: z.ZodOptional<z.ZodString>;
              keyword: z.ZodOptional<z.ZodString>;
              estimatedCount: z.ZodOptional<z.ZodNumber>;
            },
            'strict',
            z.ZodTypeAny,
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            },
            {
              segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
              daysInactive?: number;
              minSpend?: number;
              location?: {
                city?: string;
                pincode?: string;
                area?: string;
                radiusKm?: number;
              };
              interests?: string[];
              institution?: string;
              keyword?: string;
              estimatedCount?: number;
            }
          >
        >;
        budget: z.ZodOptional<z.ZodNumber>;
        spent: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodString>;
      } & {
        type: z.ZodOptional<z.ZodLiteral<'merchant'>>;
        merchantId: z.ZodOptional<z.ZodString>;
        storeId: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        discountPercentage: z.ZodOptional<z.ZodNumber>;
        maxRedemptions: z.ZodOptional<z.ZodNumber>;
        appliedProducts: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
        rewardValue: z.ZodOptional<z.ZodNumber>;
        rewardType: z.ZodOptional<z.ZodString>;
        durationDays: z.ZodOptional<z.ZodNumber>;
        conditions: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                field: z.ZodString;
                operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
                value: z.ZodOptional<
                  z.ZodUnion<
                    [
                      z.ZodString,
                      z.ZodNumber,
                      z.ZodBoolean,
                      z.ZodNull,
                      z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                    ]
                  >
                >;
              },
              'strict',
              z.ZodTypeAny,
              {
                value?: string | number | boolean | (string | number)[];
                operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                field?: string;
              },
              {
                value?: string | number | boolean | (string | number)[];
                operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                field?: string;
              }
            >,
            'many'
          >
        >;
        actions: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']>;
                params: z.ZodOptional<
                  z.ZodRecord<
                    z.ZodString,
                    z.ZodUnion<
                      [
                        z.ZodString,
                        z.ZodNumber,
                        z.ZodBoolean,
                        z.ZodNull,
                        z.ZodArray<z.ZodString, 'many'>,
                        z.ZodArray<z.ZodNumber, 'many'>,
                      ]
                    >
                  >
                >;
              },
              'strict',
              z.ZodTypeAny,
              {
                params?: Record<string, string | number | boolean | string[] | number[]>;
                kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
              },
              {
                params?: Record<string, string | number | boolean | string[] | number[]>;
                kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
              }
            >,
            'many'
          >
        >;
        triggers: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                event: z.ZodEnum<
                  ['order.placed', 'order.delivered', 'visit.completed', 'signup', 'referral.invite', 'cron', 'manual']
                >;
                filters: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        field: z.ZodString;
                        operator: z.ZodEnum<
                          ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']
                        >;
                        value: z.ZodOptional<
                          z.ZodUnion<
                            [
                              z.ZodString,
                              z.ZodNumber,
                              z.ZodBoolean,
                              z.ZodNull,
                              z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                            ]
                          >
                        >;
                      },
                      'strict',
                      z.ZodTypeAny,
                      {
                        value?: string | number | boolean | (string | number)[];
                        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                        field?: string;
                      },
                      {
                        value?: string | number | boolean | (string | number)[];
                        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                        field?: string;
                      }
                    >,
                    'many'
                  >
                >;
              },
              'strict',
              z.ZodTypeAny,
              {
                event?:
                  | 'manual'
                  | 'signup'
                  | 'order.placed'
                  | 'order.delivered'
                  | 'visit.completed'
                  | 'referral.invite'
                  | 'cron';
                filters?: {
                  value?: string | number | boolean | (string | number)[];
                  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                  field?: string;
                }[];
              },
              {
                event?:
                  | 'manual'
                  | 'signup'
                  | 'order.placed'
                  | 'order.delivered'
                  | 'visit.completed'
                  | 'referral.invite'
                  | 'cron';
                filters?: {
                  value?: string | number | boolean | (string | number)[];
                  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                  field?: string;
                }[];
              }
            >,
            'many'
          >
        >;
        priority: z.ZodOptional<z.ZodNumber>;
        cooldownDays: z.ZodOptional<z.ZodNumber>;
      } & {
        _id: z.ZodOptional<z.ZodString>;
        redemptionCount: z.ZodOptional<z.ZodNumber>;
        createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        name?: string;
        type?: 'merchant';
        _id?: string;
        createdAt?: string | Date;
        updatedAt?: string | Date;
        description?: string;
        merchantId?: string;
        status?:
          | 'expired'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | 'rejected'
          | 'draft'
          | 'scheduled'
          | 'sending'
          | 'sent'
          | 'pending_review'
          | 'active'
          | 'paused';
        spent?: number;
        startDate?: string | Date;
        endDate?: string | Date;
        channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
        targetAudience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        budget?: number;
        createdBy?: string;
        storeId?: string;
        title?: string;
        discountPercentage?: number;
        maxRedemptions?: number;
        appliedProducts?: string[];
        rewardValue?: number;
        rewardType?: string;
        durationDays?: number;
        conditions?: {
          value?: string | number | boolean | (string | number)[];
          operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
          field?: string;
        }[];
        actions?: {
          params?: Record<string, string | number | boolean | string[] | number[]>;
          kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
        }[];
        triggers?: {
          event?:
            | 'manual'
            | 'signup'
            | 'order.placed'
            | 'order.delivered'
            | 'visit.completed'
            | 'referral.invite'
            | 'cron';
          filters?: {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }[];
        }[];
        priority?: number;
        cooldownDays?: number;
        redemptionCount?: number;
      },
      {
        name?: string;
        type?: 'merchant';
        _id?: string;
        createdAt?: string | Date;
        updatedAt?: string | Date;
        description?: string;
        merchantId?: string;
        status?:
          | 'expired'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | 'rejected'
          | 'draft'
          | 'scheduled'
          | 'sending'
          | 'sent'
          | 'pending_review'
          | 'active'
          | 'paused';
        spent?: number;
        startDate?: string | Date;
        endDate?: string | Date;
        channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
        targetAudience?: {
          segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
          daysInactive?: number;
          minSpend?: number;
          location?: {
            city?: string;
            pincode?: string;
            area?: string;
            radiusKm?: number;
          };
          interests?: string[];
          institution?: string;
          keyword?: string;
          estimatedCount?: number;
        };
        budget?: number;
        createdBy?: string;
        storeId?: string;
        title?: string;
        discountPercentage?: number;
        maxRedemptions?: number;
        appliedProducts?: string[];
        rewardValue?: number;
        rewardType?: string;
        durationDays?: number;
        conditions?: {
          value?: string | number | boolean | (string | number)[];
          operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
          field?: string;
        }[];
        actions?: {
          params?: Record<string, string | number | boolean | string[] | number[]>;
          kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
        }[];
        triggers?: {
          event?:
            | 'manual'
            | 'signup'
            | 'order.placed'
            | 'order.delivered'
            | 'visit.completed'
            | 'referral.invite'
            | 'cron';
          filters?: {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }[];
        }[];
        priority?: number;
        cooldownDays?: number;
        redemptionCount?: number;
      }
    >,
  ]
>;
export declare const CampaignListResponseSchema: z.ZodArray<
  z.ZodUnion<
    [
      z.ZodObject<
        {
          name: z.ZodString;
          description: z.ZodOptional<z.ZodString>;
          status: z.ZodEnum<
            [
              'draft',
              'scheduled',
              'sending',
              'sent',
              'pending_review',
              'active',
              'paused',
              'completed',
              'expired',
              'rejected',
              'failed',
              'cancelled',
            ]
          >;
          startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
          endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
          targetAudience: z.ZodOptional<
            z.ZodObject<
              {
                segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
                daysInactive: z.ZodOptional<z.ZodNumber>;
                minSpend: z.ZodOptional<z.ZodNumber>;
                location: z.ZodOptional<
                  z.ZodObject<
                    {
                      city: z.ZodOptional<z.ZodString>;
                      area: z.ZodOptional<z.ZodString>;
                      pincode: z.ZodOptional<z.ZodString>;
                      radiusKm: z.ZodOptional<z.ZodNumber>;
                    },
                    'strip',
                    z.ZodTypeAny,
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    },
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    }
                  >
                >;
                interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                institution: z.ZodOptional<z.ZodString>;
                keyword: z.ZodOptional<z.ZodString>;
                estimatedCount: z.ZodOptional<z.ZodNumber>;
              },
              'strict',
              z.ZodTypeAny,
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              },
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              }
            >
          >;
          budget: z.ZodOptional<z.ZodNumber>;
          spent: z.ZodOptional<z.ZodNumber>;
          createdBy: z.ZodOptional<z.ZodString>;
        } & {
          type: z.ZodOptional<z.ZodLiteral<'marketing'>>;
          merchantId: z.ZodOptional<z.ZodString>;
          objective: z.ZodOptional<z.ZodEnum<['awareness', 'engagement', 'sales', 'win_back']>>;
          message: z.ZodOptional<z.ZodString>;
          templateName: z.ZodOptional<z.ZodString>;
          imageUrl: z.ZodOptional<z.ZodString>;
          ctaUrl: z.ZodOptional<z.ZodString>;
          ctaText: z.ZodOptional<z.ZodString>;
          audience: z.ZodOptional<
            z.ZodObject<
              {
                segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
                daysInactive: z.ZodOptional<z.ZodNumber>;
                minSpend: z.ZodOptional<z.ZodNumber>;
                location: z.ZodOptional<
                  z.ZodObject<
                    {
                      city: z.ZodOptional<z.ZodString>;
                      area: z.ZodOptional<z.ZodString>;
                      pincode: z.ZodOptional<z.ZodString>;
                      radiusKm: z.ZodOptional<z.ZodNumber>;
                    },
                    'strip',
                    z.ZodTypeAny,
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    },
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    }
                  >
                >;
                interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                institution: z.ZodOptional<z.ZodString>;
                keyword: z.ZodOptional<z.ZodString>;
                estimatedCount: z.ZodOptional<z.ZodNumber>;
              },
              'strict',
              z.ZodTypeAny,
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              },
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              }
            >
          >;
          scheduledAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          dailyBudget: z.ZodOptional<z.ZodNumber>;
          attributionWindowDays: z.ZodOptional<z.ZodNumber>;
        } & {
          _id: z.ZodOptional<z.ZodString>;
          sentAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          stats: z.ZodOptional<
            z.ZodObject<
              {
                sent: z.ZodOptional<z.ZodNumber>;
                delivered: z.ZodOptional<z.ZodNumber>;
                failed: z.ZodOptional<z.ZodNumber>;
                deduped: z.ZodOptional<z.ZodNumber>;
                opened: z.ZodOptional<z.ZodNumber>;
                clicked: z.ZodOptional<z.ZodNumber>;
                converted: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                failed?: number;
                delivered?: number;
                sent?: number;
                deduped?: number;
                opened?: number;
                clicked?: number;
                converted?: number;
              },
              {
                failed?: number;
                delivered?: number;
                sent?: number;
                deduped?: number;
                opened?: number;
                clicked?: number;
                converted?: number;
              }
            >
          >;
          errorMessage: z.ZodOptional<z.ZodString>;
          totalSpent: z.ZodOptional<z.ZodNumber>;
          createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name?: string;
          message?: string;
          type?: 'marketing';
          _id?: string;
          createdAt?: string | Date;
          updatedAt?: string | Date;
          description?: string;
          merchantId?: string;
          status?:
            | 'expired'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'rejected'
            | 'draft'
            | 'scheduled'
            | 'sending'
            | 'sent'
            | 'pending_review'
            | 'active'
            | 'paused';
          totalSpent?: number;
          spent?: number;
          ctaText?: string;
          imageUrl?: string;
          startDate?: string | Date;
          endDate?: string | Date;
          channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
          targetAudience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          budget?: number;
          createdBy?: string;
          objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
          templateName?: string;
          ctaUrl?: string;
          audience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          scheduledAt?: string | Date;
          dailyBudget?: number;
          attributionWindowDays?: number;
          sentAt?: string | Date;
          stats?: {
            failed?: number;
            delivered?: number;
            sent?: number;
            deduped?: number;
            opened?: number;
            clicked?: number;
            converted?: number;
          };
          errorMessage?: string;
        },
        {
          name?: string;
          message?: string;
          type?: 'marketing';
          _id?: string;
          createdAt?: string | Date;
          updatedAt?: string | Date;
          description?: string;
          merchantId?: string;
          status?:
            | 'expired'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'rejected'
            | 'draft'
            | 'scheduled'
            | 'sending'
            | 'sent'
            | 'pending_review'
            | 'active'
            | 'paused';
          totalSpent?: number;
          spent?: number;
          ctaText?: string;
          imageUrl?: string;
          startDate?: string | Date;
          endDate?: string | Date;
          channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
          targetAudience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          budget?: number;
          createdBy?: string;
          objective?: 'awareness' | 'engagement' | 'sales' | 'win_back';
          templateName?: string;
          ctaUrl?: string;
          audience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          scheduledAt?: string | Date;
          dailyBudget?: number;
          attributionWindowDays?: number;
          sentAt?: string | Date;
          stats?: {
            failed?: number;
            delivered?: number;
            sent?: number;
            deduped?: number;
            opened?: number;
            clicked?: number;
            converted?: number;
          };
          errorMessage?: string;
        }
      >,
      z.ZodObject<
        {
          name: z.ZodString;
          description: z.ZodOptional<z.ZodString>;
          status: z.ZodEnum<
            [
              'draft',
              'scheduled',
              'sending',
              'sent',
              'pending_review',
              'active',
              'paused',
              'completed',
              'expired',
              'rejected',
              'failed',
              'cancelled',
            ]
          >;
          startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
          endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
          targetAudience: z.ZodOptional<
            z.ZodObject<
              {
                segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
                daysInactive: z.ZodOptional<z.ZodNumber>;
                minSpend: z.ZodOptional<z.ZodNumber>;
                location: z.ZodOptional<
                  z.ZodObject<
                    {
                      city: z.ZodOptional<z.ZodString>;
                      area: z.ZodOptional<z.ZodString>;
                      pincode: z.ZodOptional<z.ZodString>;
                      radiusKm: z.ZodOptional<z.ZodNumber>;
                    },
                    'strip',
                    z.ZodTypeAny,
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    },
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    }
                  >
                >;
                interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                institution: z.ZodOptional<z.ZodString>;
                keyword: z.ZodOptional<z.ZodString>;
                estimatedCount: z.ZodOptional<z.ZodNumber>;
              },
              'strict',
              z.ZodTypeAny,
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              },
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              }
            >
          >;
          budget: z.ZodOptional<z.ZodNumber>;
          spent: z.ZodOptional<z.ZodNumber>;
          createdBy: z.ZodOptional<z.ZodString>;
        } & {
          type: z.ZodOptional<z.ZodLiteral<'ad'>>;
          merchantId: z.ZodOptional<z.ZodString>;
          storeId: z.ZodOptional<z.ZodString>;
          title: z.ZodOptional<z.ZodString>;
          headline: z.ZodOptional<z.ZodString>;
          ctaText: z.ZodOptional<z.ZodString>;
          ctaUrl: z.ZodOptional<z.ZodString>;
          imageUrl: z.ZodOptional<z.ZodString>;
          placement: z.ZodOptional<z.ZodEnum<['home_banner', 'explore_feed', 'store_listing', 'search_result']>>;
          targetSegment: z.ZodOptional<z.ZodEnum<['all', 'new', 'loyal', 'lapsed', 'nearby']>>;
          targetLocation: z.ZodOptional<
            z.ZodObject<
              {
                city: z.ZodOptional<z.ZodString>;
                radiusKm: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                city?: string;
                radiusKm?: number;
              },
              {
                city?: string;
                radiusKm?: number;
              }
            >
          >;
          targetInterests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          bidType: z.ZodOptional<z.ZodEnum<['CPC', 'CPM']>>;
          bidAmount: z.ZodOptional<z.ZodNumber>;
          dailyBudget: z.ZodOptional<z.ZodNumber>;
          totalBudget: z.ZodOptional<z.ZodNumber>;
          frequencyCapDays: z.ZodOptional<z.ZodNumber>;
        } & {
          _id: z.ZodOptional<z.ZodString>;
          totalSpent: z.ZodOptional<z.ZodNumber>;
          impressions: z.ZodOptional<z.ZodNumber>;
          clicks: z.ZodOptional<z.ZodNumber>;
          ctr: z.ZodOptional<z.ZodNumber>;
          reviewedBy: z.ZodOptional<z.ZodString>;
          reviewedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          rejectionReason: z.ZodOptional<z.ZodString>;
          createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name?: string;
          type?: 'ad';
          _id?: string;
          createdAt?: string | Date;
          updatedAt?: string | Date;
          description?: string;
          merchantId?: string;
          status?:
            | 'expired'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'rejected'
            | 'draft'
            | 'scheduled'
            | 'sending'
            | 'sent'
            | 'pending_review'
            | 'active'
            | 'paused';
          totalSpent?: number;
          spent?: number;
          ctr?: number;
          ctaText?: string;
          imageUrl?: string;
          startDate?: string | Date;
          endDate?: string | Date;
          channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
          targetAudience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          budget?: number;
          createdBy?: string;
          ctaUrl?: string;
          dailyBudget?: number;
          storeId?: string;
          title?: string;
          headline?: string;
          placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
          targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
          targetLocation?: {
            city?: string;
            radiusKm?: number;
          };
          targetInterests?: string[];
          bidType?: 'CPC' | 'CPM';
          bidAmount?: number;
          totalBudget?: number;
          frequencyCapDays?: number;
          impressions?: number;
          clicks?: number;
          reviewedBy?: string;
          reviewedAt?: string | Date;
          rejectionReason?: string;
        },
        {
          name?: string;
          type?: 'ad';
          _id?: string;
          createdAt?: string | Date;
          updatedAt?: string | Date;
          description?: string;
          merchantId?: string;
          status?:
            | 'expired'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'rejected'
            | 'draft'
            | 'scheduled'
            | 'sending'
            | 'sent'
            | 'pending_review'
            | 'active'
            | 'paused';
          totalSpent?: number;
          spent?: number;
          ctr?: number;
          ctaText?: string;
          imageUrl?: string;
          startDate?: string | Date;
          endDate?: string | Date;
          channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
          targetAudience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          budget?: number;
          createdBy?: string;
          ctaUrl?: string;
          dailyBudget?: number;
          storeId?: string;
          title?: string;
          headline?: string;
          placement?: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
          targetSegment?: 'new' | 'all' | 'lapsed' | 'loyal' | 'nearby';
          targetLocation?: {
            city?: string;
            radiusKm?: number;
          };
          targetInterests?: string[];
          bidType?: 'CPC' | 'CPM';
          bidAmount?: number;
          totalBudget?: number;
          frequencyCapDays?: number;
          impressions?: number;
          clicks?: number;
          reviewedBy?: string;
          reviewedAt?: string | Date;
          rejectionReason?: string;
        }
      >,
      z.ZodObject<
        {
          name: z.ZodString;
          description: z.ZodOptional<z.ZodString>;
          status: z.ZodEnum<
            [
              'draft',
              'scheduled',
              'sending',
              'sent',
              'pending_review',
              'active',
              'paused',
              'completed',
              'expired',
              'rejected',
              'failed',
              'cancelled',
            ]
          >;
          startDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
          endDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          channel: z.ZodOptional<z.ZodEnum<['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']>>;
          targetAudience: z.ZodOptional<
            z.ZodObject<
              {
                segment: z.ZodOptional<z.ZodEnum<['all', 'recent', 'lapsed', 'high_value', 'stamp_card']>>;
                daysInactive: z.ZodOptional<z.ZodNumber>;
                minSpend: z.ZodOptional<z.ZodNumber>;
                location: z.ZodOptional<
                  z.ZodObject<
                    {
                      city: z.ZodOptional<z.ZodString>;
                      area: z.ZodOptional<z.ZodString>;
                      pincode: z.ZodOptional<z.ZodString>;
                      radiusKm: z.ZodOptional<z.ZodNumber>;
                    },
                    'strip',
                    z.ZodTypeAny,
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    },
                    {
                      city?: string;
                      pincode?: string;
                      area?: string;
                      radiusKm?: number;
                    }
                  >
                >;
                interests: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                institution: z.ZodOptional<z.ZodString>;
                keyword: z.ZodOptional<z.ZodString>;
                estimatedCount: z.ZodOptional<z.ZodNumber>;
              },
              'strict',
              z.ZodTypeAny,
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              },
              {
                segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
                daysInactive?: number;
                minSpend?: number;
                location?: {
                  city?: string;
                  pincode?: string;
                  area?: string;
                  radiusKm?: number;
                };
                interests?: string[];
                institution?: string;
                keyword?: string;
                estimatedCount?: number;
              }
            >
          >;
          budget: z.ZodOptional<z.ZodNumber>;
          spent: z.ZodOptional<z.ZodNumber>;
          createdBy: z.ZodOptional<z.ZodString>;
        } & {
          type: z.ZodOptional<z.ZodLiteral<'merchant'>>;
          merchantId: z.ZodOptional<z.ZodString>;
          storeId: z.ZodOptional<z.ZodString>;
          title: z.ZodOptional<z.ZodString>;
          discountPercentage: z.ZodOptional<z.ZodNumber>;
          maxRedemptions: z.ZodOptional<z.ZodNumber>;
          appliedProducts: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          rewardValue: z.ZodOptional<z.ZodNumber>;
          rewardType: z.ZodOptional<z.ZodString>;
          durationDays: z.ZodOptional<z.ZodNumber>;
          conditions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  field: z.ZodString;
                  operator: z.ZodEnum<['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']>;
                  value: z.ZodOptional<
                    z.ZodUnion<
                      [
                        z.ZodString,
                        z.ZodNumber,
                        z.ZodBoolean,
                        z.ZodNull,
                        z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                      ]
                    >
                  >;
                },
                'strict',
                z.ZodTypeAny,
                {
                  value?: string | number | boolean | (string | number)[];
                  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                  field?: string;
                },
                {
                  value?: string | number | boolean | (string | number)[];
                  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                  field?: string;
                }
              >,
              'many'
            >
          >;
          actions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<
                    ['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']
                  >;
                  params: z.ZodOptional<
                    z.ZodRecord<
                      z.ZodString,
                      z.ZodUnion<
                        [
                          z.ZodString,
                          z.ZodNumber,
                          z.ZodBoolean,
                          z.ZodNull,
                          z.ZodArray<z.ZodString, 'many'>,
                          z.ZodArray<z.ZodNumber, 'many'>,
                        ]
                      >
                    >
                  >;
                },
                'strict',
                z.ZodTypeAny,
                {
                  params?: Record<string, string | number | boolean | string[] | number[]>;
                  kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
                },
                {
                  params?: Record<string, string | number | boolean | string[] | number[]>;
                  kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
                }
              >,
              'many'
            >
          >;
          triggers: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  event: z.ZodEnum<
                    [
                      'order.placed',
                      'order.delivered',
                      'visit.completed',
                      'signup',
                      'referral.invite',
                      'cron',
                      'manual',
                    ]
                  >;
                  filters: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          field: z.ZodString;
                          operator: z.ZodEnum<
                            ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']
                          >;
                          value: z.ZodOptional<
                            z.ZodUnion<
                              [
                                z.ZodString,
                                z.ZodNumber,
                                z.ZodBoolean,
                                z.ZodNull,
                                z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, 'many'>,
                              ]
                            >
                          >;
                        },
                        'strict',
                        z.ZodTypeAny,
                        {
                          value?: string | number | boolean | (string | number)[];
                          operator?:
                            | 'eq'
                            | 'neq'
                            | 'gt'
                            | 'gte'
                            | 'lt'
                            | 'lte'
                            | 'in'
                            | 'not_in'
                            | 'contains'
                            | 'exists';
                          field?: string;
                        },
                        {
                          value?: string | number | boolean | (string | number)[];
                          operator?:
                            | 'eq'
                            | 'neq'
                            | 'gt'
                            | 'gte'
                            | 'lt'
                            | 'lte'
                            | 'in'
                            | 'not_in'
                            | 'contains'
                            | 'exists';
                          field?: string;
                        }
                      >,
                      'many'
                    >
                  >;
                },
                'strict',
                z.ZodTypeAny,
                {
                  event?:
                    | 'manual'
                    | 'signup'
                    | 'order.placed'
                    | 'order.delivered'
                    | 'visit.completed'
                    | 'referral.invite'
                    | 'cron';
                  filters?: {
                    value?: string | number | boolean | (string | number)[];
                    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                    field?: string;
                  }[];
                },
                {
                  event?:
                    | 'manual'
                    | 'signup'
                    | 'order.placed'
                    | 'order.delivered'
                    | 'visit.completed'
                    | 'referral.invite'
                    | 'cron';
                  filters?: {
                    value?: string | number | boolean | (string | number)[];
                    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
                    field?: string;
                  }[];
                }
              >,
              'many'
            >
          >;
          priority: z.ZodOptional<z.ZodNumber>;
          cooldownDays: z.ZodOptional<z.ZodNumber>;
        } & {
          _id: z.ZodOptional<z.ZodString>;
          redemptionCount: z.ZodOptional<z.ZodNumber>;
          createdAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name?: string;
          type?: 'merchant';
          _id?: string;
          createdAt?: string | Date;
          updatedAt?: string | Date;
          description?: string;
          merchantId?: string;
          status?:
            | 'expired'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'rejected'
            | 'draft'
            | 'scheduled'
            | 'sending'
            | 'sent'
            | 'pending_review'
            | 'active'
            | 'paused';
          spent?: number;
          startDate?: string | Date;
          endDate?: string | Date;
          channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
          targetAudience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          budget?: number;
          createdBy?: string;
          storeId?: string;
          title?: string;
          discountPercentage?: number;
          maxRedemptions?: number;
          appliedProducts?: string[];
          rewardValue?: number;
          rewardType?: string;
          durationDays?: number;
          conditions?: {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }[];
          actions?: {
            params?: Record<string, string | number | boolean | string[] | number[]>;
            kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
          }[];
          triggers?: {
            event?:
              | 'manual'
              | 'signup'
              | 'order.placed'
              | 'order.delivered'
              | 'visit.completed'
              | 'referral.invite'
              | 'cron';
            filters?: {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }[];
          }[];
          priority?: number;
          cooldownDays?: number;
          redemptionCount?: number;
        },
        {
          name?: string;
          type?: 'merchant';
          _id?: string;
          createdAt?: string | Date;
          updatedAt?: string | Date;
          description?: string;
          merchantId?: string;
          status?:
            | 'expired'
            | 'completed'
            | 'failed'
            | 'cancelled'
            | 'rejected'
            | 'draft'
            | 'scheduled'
            | 'sending'
            | 'sent'
            | 'pending_review'
            | 'active'
            | 'paused';
          spent?: number;
          startDate?: string | Date;
          endDate?: string | Date;
          channel?: 'push' | 'email' | 'sms' | 'in_app' | 'whatsapp' | 'social' | 'web' | 'api';
          targetAudience?: {
            segment?: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
            daysInactive?: number;
            minSpend?: number;
            location?: {
              city?: string;
              pincode?: string;
              area?: string;
              radiusKm?: number;
            };
            interests?: string[];
            institution?: string;
            keyword?: string;
            estimatedCount?: number;
          };
          budget?: number;
          createdBy?: string;
          storeId?: string;
          title?: string;
          discountPercentage?: number;
          maxRedemptions?: number;
          appliedProducts?: string[];
          rewardValue?: number;
          rewardType?: string;
          durationDays?: number;
          conditions?: {
            value?: string | number | boolean | (string | number)[];
            operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
            field?: string;
          }[];
          actions?: {
            params?: Record<string, string | number | boolean | string[] | number[]>;
            kind?: 'credit_coins' | 'grant_badge' | 'send_notification' | 'award_voucher' | 'issue_coupon';
          }[];
          triggers?: {
            event?:
              | 'manual'
              | 'signup'
              | 'order.placed'
              | 'order.delivered'
              | 'visit.completed'
              | 'referral.invite'
              | 'cron';
            filters?: {
              value?: string | number | boolean | (string | number)[];
              operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
              field?: string;
            }[];
          }[];
          priority?: number;
          cooldownDays?: number;
          redemptionCount?: number;
        }
      >,
    ]
  >,
  'many'
>;
export type CreateMarketingCampaignRequest = z.infer<typeof CreateMarketingCampaignSchema>;
export type UpdateMarketingCampaignRequest = z.infer<typeof UpdateMarketingCampaignSchema>;
export type MarketingCampaignResponse = z.infer<typeof MarketingCampaignResponseSchema>;
export type CreateAdCampaignRequest = z.infer<typeof CreateAdCampaignSchema>;
export type UpdateAdCampaignRequest = z.infer<typeof UpdateAdCampaignSchema>;
export type AdCampaignResponse = z.infer<typeof AdCampaignResponseSchema>;
export type CreateMerchantCampaignRequest = z.infer<typeof CreateMerchantCampaignSchema>;
export type UpdateMerchantCampaignRequest = z.infer<typeof UpdateMerchantCampaignSchema>;
export type MerchantCampaignResponse = z.infer<typeof MerchantCampaignResponseSchema>;
export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;
export type CampaignListResponse = z.infer<typeof CampaignListResponseSchema>;
export type CampaignStatus = z.infer<typeof CAMPAIGN_STATUS>;
export type CampaignChannel = z.infer<typeof CAMPAIGN_CHANNEL>;
//# sourceMappingURL=campaign.schema.d.ts.map
