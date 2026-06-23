import mongoose, { Schema, Document } from 'mongoose';

export interface ITournamentParticipant {
  user: mongoose.Types.ObjectId;
  score: number;
  gamesPlayed: number;
  rank?: number;
  joinedAt: Date;
  lastPlayedAt?: Date;
  prizeAwarded?: boolean;
  prizeDetails?: {
    rank: number;
    coins: number;
    badge?: string;
    exclusiveDeal?: string;
    awardedAt: Date;
  };
}

export interface ITournament extends Document {
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  gameType: 'quiz' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'mixed';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  entryFee: number; // 0 for free tournaments
  maxParticipants: number;
  minParticipants: number;
  participants: ITournamentParticipant[];
  prizes: Array<{
    rank: number;
    coins: number;
    badge?: string;
    description: string;
    exclusiveDeal?: string;
  }>;
  rules: string[];
  totalPrizePool: number;
  image?: string;
  featured: boolean;
  endingSoonNotified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentParticipantSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  rank: Number,
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastPlayedAt: Date,
  prizeAwarded: {
    type: Boolean,
    default: false
  },
  prizeDetails: {
    rank: Number,
    coins: Number,
    badge: String,
    exclusiveDeal: String,
    awardedAt: Date
  }
});

const TournamentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'special'],
      required: true
    },
    gameType: {
      type: String,
      enum: ['quiz', 'memory_match', 'coin_hunt', 'guess_price', 'mixed'],
      required: true
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    maxParticipants: {
      type: Number,
      default: 1000
    },
    minParticipants: {
      type: Number,
      default: 10
    },
    participants: [TournamentParticipantSchema],
    prizes: [{
      rank: {
        type: Number,
        required: true
      },
      coins: {
        type: Number,
        required: true,
        min: 0
      },
      badge: String,
      description: {
        type: String,
        required: true
      },
      exclusiveDeal: String
    }],
    rules: [{
      type: String
    }],
    totalPrizePool: {
      type: Number,
      default: 0,
      min: 0
    },
    image: String,
    featured: {
      type: Boolean,
      default: false
    },
    endingSoonNotified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
TournamentSchema.index({ status: 1, startDate: 1 });
TournamentSchema.index({ 'participants.user': 1 });
TournamentSchema.index({ type: 1, status: 1 });

export default mongoose.model<ITournament>('Tournament', TournamentSchema);
