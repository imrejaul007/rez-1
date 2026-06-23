import SystemConfig from '../models/SystemConfig';

export async function seedSystemConfig(): Promise<void> {
  const systemConfigDefaults = [
    {
      key: 'max_active_campaigns_per_merchant',
      value: 3,
      type: 'number',
      description: 'Max simultaneous active campaigns a merchant can run',
      category: 'limits',
    },
    {
      key: 'trial_coin_redemption_window_days',
      value: 7,
      type: 'number',
      description: 'Days to use trial reward before expiry',
      category: 'operations',
    },
    {
      key: 'order_auto_cancel_minutes',
      value: 30,
      type: 'number',
      description: 'Auto-cancel unpaid orders after N minutes',
      category: 'operations',
    },
    {
      key: 'review_request_delay_hours',
      value: 2,
      type: 'number',
      description: 'Hours after appointment to send review request',
      category: 'notifications',
    },
    {
      key: 'razorpay_payment_link_expiry_minutes',
      value: 15,
      type: 'number',
      description: 'Razorpay payment link expiry window',
      category: 'integrations',
    },
    {
      key: 'rebooking_nudge_weeks',
      value: 6,
      type: 'number',
      description: 'Weeks after appointment to send rebooking nudge',
      category: 'notifications',
    },
    {
      key: 'gift_expiry_days',
      value: 7,
      type: 'number',
      description: 'Days to claim a gift before expiry',
      category: 'operations',
    },
    {
      key: 'scheduled_gift_max_days_ahead',
      value: 30,
      type: 'number',
      description: 'Maximum days ahead to schedule a gift delivery',
      category: 'operations',
    },
    {
      key: 'appointment_reminder_24h_enabled',
      value: true,
      type: 'boolean',
      description: 'Enable 24-hour appointment reminders',
      category: 'notifications',
    },
    {
      key: 'appointment_reminder_1h_enabled',
      value: true,
      type: 'boolean',
      description: 'Enable 1-hour appointment reminders',
      category: 'notifications',
    },
    {
      key: 'appointment_review_request_enabled',
      value: true,
      type: 'boolean',
      description: 'Enable post-appointment review requests',
      category: 'notifications',
    },
    {
      key: 'maintenance_mode',
      value: false,
      type: 'boolean',
      description: 'Global maintenance mode — returns 503 on all endpoints',
      category: 'operations',
    },
  ];

  // Cast to any — TS strict typing of bulkWrite's $setOnInsert with a union
  // of literal types is overly strict; the runtime accepts any plain object.
  await SystemConfig.bulkWrite(
    systemConfigDefaults.map((config) => ({
      updateOne: {
        filter: { key: config.key },
        update: { $setOnInsert: config },
        upsert: true,
      },
    })) as any,
    { ordered: false },
  );
}
