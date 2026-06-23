import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSession extends Document {
  user: mongoose.Types.ObjectId;
  gameType: 'spin_wheel' | 'scratch_card' | 'quiz' | 'daily_trivia' | 'memory_match' | 'coin_hunt' | 'guess_price';
  sessionId: string;
  status: 'pending' | 'playing' | 'completed' | 'expired';
  startedAt: Date;
  completedAt?: Date;
  result?: {
    won: boolean;
    prize?: {
      type: 'coins' | 'discount' | 'free_delivery' | 'cashback_multiplier' | 'badge';
      value: number | string;
      description: string;
    };
    score?: number;
  };
  metadata?: Record<string, any>;
  earnedFrom?: string; // e.g., 'daily_free', 'order_123', 'premium_membership'
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  complete(result: any): Promise<IGameSession>;
}

export interface IGameSessionModel extends mongoose.Model<IGameSession> {
  expireSessions(): Promise<any>;
}

const GameSessionSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    gameType: {
      type: String,
      enum: ['spin_wheel', 'scratch_card', 'quiz', 'daily_trivia', 'memory_match', 'coin_hunt', 'guess_price'],
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'playing', 'completed', 'expired'],
      default: 'pending',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    result: {
      won: Boolean,
      prize: {
        type: {
          type: String,
          enum: ['coins', 'discount', 'free_delivery', 'cashback_multiplier', 'badge']
        },
        value: Schema.Types.Mixed,
        description: String
      },
      score: Number
    },
    earnedFrom: String,
    metadata: {
      type: Schema.Types.Mixed
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
GameSessionSchema.index({ user: 1, gameType: 1, status: 1 });
GameSessionSchema.index({ user: 1, createdAt: -1 });
GameSessionSchema.index({ user: 1, gameType: 1, createdAt: -1 });
GameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

// Method to complete game session
GameSessionSchema.methods.complete = async function(result: any) {
  if (this.status === 'completed') {
    throw new Error('Game session already completed');
  }

  if (this.status === 'expired') {
    throw new Error('Game session has expired');
  }

  this.status = 'completed';
  this.completedAt = new Date();
  this.result = result;

  return this.save();
};

// Static method to check expired sessions
GameSessionSchema.statics.expireSessions = async function() {
  const now = new Date();

  return this.updateMany(
    {
      status: { $in: ['pending', 'playing'] },
      expiresAt: { $lt: now }
    },
    {
      status: 'expired'
    }
  );
};

export default mongoose.model<IGameSession, IGameSessionModel>('GameSession', GameSessionSchema);
