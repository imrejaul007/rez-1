/**
 * Source → UI category mapping for CoinTransaction aggregation
 * Maps CoinTransaction.source enum values to frontend display categories
 *
 * Shared between earningsController and priveController
 */
export const SOURCE_TO_CATEGORY: Record<string, string> = {
  creator_pick_reward: 'videos',
  order: 'projects',
  referral: 'referrals',
  cashback: 'cashback',
  purchase_reward: 'cashback',
  social_share_reward: 'socialMedia',
  poll_vote: 'socialMedia',
  offer_comment: 'socialMedia',
  photo_upload: 'socialMedia',
  ugc_reel: 'socialMedia',
  spin_wheel: 'games',
  scratch_card: 'games',
  quiz_game: 'games',
  memory_match: 'games',
  coin_hunt: 'games',
  guess_price: 'games',
  daily_login: 'dailyCheckIn',
  achievement: 'bonus',
  challenge: 'bonus',
  admin: 'bonus',
  review: 'bonus',
  bill_upload: 'bonus',
  survey: 'bonus',
  merchant_award: 'bonus',
  bonus_campaign: 'bonus',
  social_impact_reward: 'socialImpact',
  program_task_reward: 'programs',
  program_multiplier_bonus: 'programs',
  event_booking: 'events',
  event_checkin: 'events',
  event_participation: 'events',
  event_sharing: 'events',
  event_entry: 'events',
  event_review: 'events',
  event_rating: 'events',
  smart_spend_reward: 'smartSpend',
};
