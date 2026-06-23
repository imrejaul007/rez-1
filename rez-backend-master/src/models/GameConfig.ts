import mongoose, { Schema, Document } from 'mongoose';

export interface IGameConfig extends Document {
  gameType: 'spin_wheel' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'quiz' | 'scratch_card';
  displayName: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  dailyLimit: number;
  cooldownMinutes: number;
  rewards: {
    minCoins: number;
    maxCoins: number;
    bonusMultiplier: number;
  };
  difficulty: {
    easy: { timeLimit: number; gridSize?: number; lives?: number; };
    medium: { timeLimit: number; gridSize?: number; lives?: number; };
    hard: { timeLimit: number; gridSize?: number; lives?: number; };
  };
  config: Record<string, any>; // Game-specific settings (spin wheel segments, quiz categories, etc.)
  schedule: {
    availableFrom?: Date;
    availableUntil?: Date;
    availableDays: number[]; // 0=Sun...6=Sat, empty=all days
    availableHours?: { start: number; end: number; };
  };
  sortOrder: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GameConfigSchema = new Schema({
  gameType: {
    type: String,
    enum: ['spin_wheel', 'memory_match', 'coin_hunt', 'guess_price', 'quiz', 'scratch_card'],
    required: true,
    unique: true,
    index: true
  },
  displayName: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  isEnabled: { type: Boolean, default: true, index: true },
  dailyLimit: { type: Number, default: 3, min: 0 },
  cooldownMinutes: { type: Number, default: 0, min: 0 },
  rewards: {
    minCoins: { type: Number, default: 0, min: 0 },
    maxCoins: { type: Number, default: 100, min: 0 },
    bonusMultiplier: { type: Number, default: 1, min: 1 }
  },
  difficulty: {
    easy: {
      timeLimit: { type: Number, default: 60 },
      gridSize: Number,
      lives: Number
    },
    medium: {
      timeLimit: { type: Number, default: 45 },
      gridSize: Number,
      lives: Number
    },
    hard: {
      timeLimit: { type: Number, default: 30 },
      gridSize: Number,
      lives: Number
    }
  },
  config: { type: Schema.Types.Mixed, default: {} },
  schedule: {
    availableFrom: Date,
    availableUntil: Date,
    availableDays: { type: [Number], default: [] },
    availableHours: {
      start: Number,
      end: Number
    }
  },
  sortOrder: { type: Number, default: 0 },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

GameConfigSchema.index({ isEnabled: 1, sortOrder: 1 });

export default mongoose.model<IGameConfig>('GameConfig', GameConfigSchema);
