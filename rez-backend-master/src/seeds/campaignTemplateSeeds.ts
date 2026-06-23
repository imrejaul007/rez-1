/**
 * Campaign Template Seeds — Phase C.
 *
 * Idempotent upsert of the 4 launch-day templates documented in the
 * growth strategy plan. Run via admin script or as part of `ensureIndexes`
 * boot step. Safe to run multiple times — each seed key is unique on
 * templateId so a re-run is a no-op when nothing has changed.
 *
 * To add a new template: append to TEMPLATES + bump version in commit body
 * so ops know to re-seed in staging first.
 */

import CampaignTemplate, { type ICampaignTemplate } from '../models/CampaignTemplate';
import { logger } from '../config/logger';
import type { Document } from 'mongoose';

type SeedTemplate = Omit<ICampaignTemplate, '_id' | 'createdAt' | 'updatedAt' | keyof Document> & {
  templateId: string;
};

export const TEMPLATES: SeedTemplate[] = [
  {
    templateId: 'lunch-hour-boost',
    title: 'Lunch Hour Boost',
    description:
      '15% off for customers ordering between 12-3 PM today. Fills your afternoon lull without discounting dinner rush.',
    icon: 'restaurant',
    verticals: ['restaurant'],
    tags: ['time-based', 'afternoon', 'traffic-lift'],
    offer: {
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minOrderValue: 150,
      validityHours: 5, // valid through end of 5 PM
      maxDiscountCap: 100,
    },
    campaign: {
      name: '{{storeName}} — Lunch Hour Boost',
      messageBody:
        'Hungry? 🍱 {{storeName}} — 15% off all lunch orders 12-3 PM today. Code: LUNCH15. Tap to order: {{menuLink}}',
      audienceRule: 'all-customers',
      channels: ['whatsapp', 'push'],
      daysOfWeek: [1, 2, 3, 4, 5], // weekdays
      startHourLocal: 11, // send at 11 AM so customers see before lunch
      endHourLocal: 14,
    },
    predictedImpact: '+8-15% afternoon orders (restaurants with 200+ customers)',
    isActive: true,
  } as SeedTemplate,

  {
    templateId: 'weekend-rush',
    title: 'Weekend Rush Offer',
    description: 'Flat 10% off on Saturdays & Sundays — catches weekend walk-ins when spending intent is highest.',
    icon: 'calendar',
    verticals: [], // all verticals
    tags: ['weekend', 'all-verticals', 'easy-win'],
    offer: {
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 200,
      validityHours: 48, // Sat-Sun
      maxDiscountCap: 150,
    },
    campaign: {
      name: '{{storeName}} — Weekend Rush',
      messageBody:
        '🎉 Weekend treat from {{storeName}} — 10% off this Sat & Sun. Drop by or order online: {{menuLink}}',
      audienceRule: 'all-customers',
      channels: ['whatsapp'],
      daysOfWeek: [0, 6], // Sun + Sat
    },
    predictedImpact: '+5-12% weekend revenue',
    isActive: true,
  } as SeedTemplate,

  {
    templateId: 'first-visit-offer',
    title: 'First Visit Offer',
    description:
      '₹100 off for customers who have never ordered from your store. Converts QR-scanners and curious walk-ins into paying customers.',
    icon: 'sparkles',
    verticals: [],
    tags: ['acquisition', 'new-customer', 'cac'],
    offer: {
      discountType: 'FIXED',
      discountValue: 100,
      minOrderValue: 250,
      validityHours: 7 * 24, // 7 days
    },
    campaign: {
      name: '{{storeName}} — First Visit Gift',
      messageBody:
        'Welcome to {{storeName}} 👋 Your first order: ₹100 off on any bill above ₹250. Code: WELCOME100. Valid 7 days.',
      audienceRule: 'new-customers',
      channels: ['whatsapp', 'push'],
    },
    predictedImpact: '+20-35% first-time-scanner conversion',
    isActive: true,
  } as SeedTemplate,

  {
    templateId: 'bring-back-60d-lapsed',
    title: 'Bring Back 60-Day Lapsed',
    description:
      '25% off for customers who have not visited in 60+ days. High-intent re-engagement — aligned with Phase H Growth Score classify() definition of lapsed.',
    icon: 'refresh-circle',
    verticals: [],
    tags: ['retention', 'lapsed', 'reengagement'],
    offer: {
      discountType: 'PERCENTAGE',
      discountValue: 25,
      minOrderValue: 200,
      validityHours: 10 * 24, // 10 days to come back
      maxDiscountCap: 300,
    },
    campaign: {
      name: '{{storeName}} — We Miss You',
      messageBody:
        "We miss you at {{storeName}} 💙 Come back within 10 days for 25% off your order (max ₹300 off). Tap to see what's new: {{menuLink}}",
      audienceRule: 'lapsed-60d',
      channels: ['whatsapp'],
    },
    predictedImpact: '+12-25% of lapsed customers return (when sent within 60-90d of last visit)',
    isActive: true,
  } as SeedTemplate,
];

/**
 * Upserts all seed templates by templateId. Idempotent: running it twice
 * is a no-op on unchanged rows.
 *
 * Called from the ensureIndexes admin script + optionally at boot in dev.
 * In prod, run explicitly via a migration job so rollout is observable.
 */
export async function seedCampaignTemplates(): Promise<{ upserted: number; matched: number }> {
  let upserted = 0;
  let matched = 0;
  for (const t of TEMPLATES) {
    const result = await CampaignTemplate.updateOne({ templateId: t.templateId }, { $set: t }, { upsert: true });
    if (result.upsertedCount > 0) upserted++;
    else matched++;
  }
  logger.info('[campaignTemplateSeeds] upserted', {
    upserted,
    matched,
    total: TEMPLATES.length,
  });
  return { upserted, matched };
}
