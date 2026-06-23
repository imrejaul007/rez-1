import mongoose, { Schema, Document } from 'mongoose';

export interface IMiniGame extends Document {
  user: mongoose.Types.ObjectId;
  gameType: 'spin_wheel' | 'scratch_card' | 'quiz';
  status: 'active' | 'completed' | 'expired';
  difficulty?: 'easy' | 'medium' | 'hard';
  startedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  reward?: {
    coins?: number;
    cashback?: number;
    discount?: number;
    voucher?: string;
    badge?: string;
  };
  metadata?: {
    // Spin Wheel
    segment?: number;
    prize?: string;
    couponMetadata?: {
      source?: string;
      isProductSpecific?: boolean;
      storeName?: string;
      storeId?: string;
      productName?: string | null;
      productId?: string | null;
      productImage?: string | null;
    } | null;

    // Scratch Card
    grid?: Array<{
      index: number;
      prize: string;
      type: string;
      value: number;
      revealed: boolean;
    }>;
    scratchedCells?: number[];
    winningCells?: number[];
    winningPrize?: {
      type: 'coins' | 'cashback' | 'discount' | 'voucher' | 'nothing';
      value: number;
      label: string;
      color: string;
    };
    revealed?: boolean;
    revealedPrize?: boolean;
    gridSize?: number;

    // Quiz
    questions?: any[];
    answers?: any[];
    score?: number;
    currentQuestion?: number;
    correctAnswers?: number;
    totalQuestions?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MiniGameSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    gameType: {
      type: String,
      enum: ['spin_wheel', 'scratch_card', 'quiz'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired'],
      default: 'active',
      index: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    reward: {
      coins: Number,
      cashback: Number,
      discount: Number,
      voucher: String,
      badge: String
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
MiniGameSchema.index({ user: 1, gameType: 1, status: 1 });
MiniGameSchema.index({ user: 1, createdAt: -1 });
MiniGameSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Daily limit check: count completed spins/games per user per day
MiniGameSchema.index({ user: 1, gameType: 1, status: 1, completedAt: -1 });

// Method to complete mini-game
MiniGameSchema.methods.complete = async function(reward: any) {
  if (this.status === 'completed') {
    throw new Error('Mini-game already completed');
  }

  if (this.status === 'expired') {
    throw new Error('Mini-game has expired');
  }

  this.status = 'completed';
  this.completedAt = new Date();
  this.reward = reward;

  return this.save();
};

// Static method to expire old games
MiniGameSchema.statics.expireGames = async function() {
  const now = new Date();

  return this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: now }
    },
    {
      status: 'expired'
    }
  );
};

export const MiniGame = mongoose.model<IMiniGame>('MiniGame', MiniGameSchema);
