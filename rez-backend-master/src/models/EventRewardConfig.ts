import mongoose, { Document, Schema, Types } from 'mongoose';

// Reward action types for event lifecycle
export type EventRewardAction =
  | 'entry_reward'        // Coins earned on successful booking/entry
  | 'purchase_reward'     // Coins earned from paid event purchase
  | 'sharing_reward'      // Coins earned for sharing event
  | 'voting_reward'       // Coins earned for voting/rating event
  | 'participation_reward' // Coins earned for completing event activities
  | 'checkin_reward'      // Coins earned for verified check-in
  | 'review_reward';      // Coins earned for writing a review

export interface IEventRewardRule {
  action: EventRewardAction;
  coins: number;
  brandedCoins?: number; // Optional branded/sponsor coins
  multiplier?: number; // Multiplier for special programs (default 1)
  dailyLimit: number;
  requiresVerification: boolean; // Whether check-in/attendance is required
  description?: string;
}

export interface IEventRewardConfig extends Document {
  _id: Types.ObjectId;
  eventId?: Types.ObjectId; // null = global default config
  name: string; // Config name for admin reference
  rewards: IEventRewardRule[];
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventRewardRuleSchema = new Schema<IEventRewardRule>({
  action: {
    type: String,
    required: true,
    enum: [
      'entry_reward',
      'purchase_reward',
      'sharing_reward',
      'voting_reward',
      'participation_reward',
      'checkin_reward',
      'review_reward',
    ],
  },
  coins: {
    type: Number,
    required: true,
    min: 0,
    max: 10000,
  },
  brandedCoins: {
    type: Number,
    min: 0,
    default: 0,
  },
  multiplier: {
    type: Number,
    min: 1,
    max: 10,
    default: 1,
  },
  dailyLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 1,
  },
  requiresVerification: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    maxlength: 200,
  },
}, { _id: false });

const EventRewardConfigSchema = new Schema<IEventRewardConfig>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    default: null, // null = global default
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  rewards: {
    type: [EventRewardRuleSchema],
    required: true,
    validate: {
      validator: function (rules: IEventRewardRule[]) {
        // No duplicate actions in a single config
        const actions = rules.map(r => r.action);
        return new Set(actions).size === actions.length;
      },
      message: 'Duplicate reward actions are not allowed in a single config',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  validFrom: { type: Date },
  validUntil: { type: Date },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
EventRewardConfigSchema.index({ eventId: 1 });
EventRewardConfigSchema.index({ isActive: 1 });
EventRewardConfigSchema.index({ eventId: 1, isActive: 1 });

// Static: get config for a specific event, falling back to global default
EventRewardConfigSchema.statics.getForEvent = async function (eventId?: Types.ObjectId | string | null) {
  const now = new Date();

  // Try event-specific config first
  if (eventId) {
    const eventConfig = await this.findOne({
      eventId,
      isActive: true,
      $or: [
        { validFrom: null, validUntil: null },
        { validFrom: { $lte: now }, validUntil: null },
        { validFrom: null, validUntil: { $gte: now } },
        { validFrom: { $lte: now }, validUntil: { $gte: now } },
      ],
    });
    if (eventConfig) return eventConfig;
  }

  // Fall back to global default (eventId = null)
  return this.findOne({
    eventId: null,
    isActive: true,
    $or: [
      { validFrom: null, validUntil: null },
      { validFrom: { $lte: now }, validUntil: null },
      { validFrom: null, validUntil: { $gte: now } },
      { validFrom: { $lte: now }, validUntil: { $gte: now } },
    ],
  });
};

// Static: get the global default config
EventRewardConfigSchema.statics.getGlobalDefault = function () {
  return this.findOne({ eventId: null, isActive: true });
};

const EventRewardConfig = mongoose.model<IEventRewardConfig>('EventRewardConfig', EventRewardConfigSchema);

export default EventRewardConfig;
