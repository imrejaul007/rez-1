// ScratchCard Model
// Model for managing scratch card rewards and user participation

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IScratchCardPrize {
  id: string;
  type: 'discount' | 'cashback' | 'coin' | 'voucher';
  value: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface IScratchCard extends Document {
  userId: mongoose.Types.ObjectId;
  prize: IScratchCardPrize;
  isScratched: boolean;
  isClaimed: boolean;
  claimedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScratchCardModel extends Model<IScratchCard> {
  createScratchCard(userId: string): Promise<IScratchCard>;
  getUserScratchCards(userId: string): Promise<IScratchCard[]>;
  claimPrize(scratchCardId: string, userId: string): Promise<IScratchCard>;
  isEligibleForScratchCard(userId: string): Promise<boolean>;
}

const ScratchCardPrizeSchema = new Schema<IScratchCardPrize>({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['discount', 'cashback', 'coin', 'voucher'],
    required: true 
  },
  value: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const ScratchCardSchema = new Schema<IScratchCard, IScratchCardModel>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  prize: { type: ScratchCardPrizeSchema, required: true },
  isScratched: { type: Boolean, default: false },
  isClaimed: { type: Boolean, default: false },
  claimedAt: { type: Date },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: '0s' } // TTL index for automatic cleanup
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Static method to create a new scratch card
ScratchCardSchema.statics.createScratchCard = async function(userId: string): Promise<IScratchCard> {
  // Check if user is eligible
  const isEligible = await this.isEligibleForScratchCard(userId);
  if (!isEligible) {
    throw new Error('User is not eligible for scratch card');
  }

  // Available prizes
  const prizes: IScratchCardPrize[] = [
    {
      id: '1',
      type: 'discount',
      value: 10,
      title: '10% Discount',
      description: 'Get 10% off your next purchase',
      icon: 'pricetag',
      color: '#10B981',
      isActive: true
    },
    {
      id: '2',
      type: 'cashback',
      value: 50,
      title: '₹50 Cashback',
      description: 'Earn ₹50 cashback on your next order',
      icon: 'cash',
      color: '#F59E0B',
      isActive: true
    },
    {
      id: '3',
      type: 'coin',
      value: 100,
      title: '100 REZ Coins',
      description: 'Earn 100 REZ coins to your wallet',
      icon: 'diamond',
      color: '#8B5CF6',
      isActive: true
    },
    {
      id: '4',
      type: 'voucher',
      value: 200,
      title: '₹200 Voucher',
      description: 'Free ₹200 voucher for your next purchase',
      icon: 'gift',
      color: '#EF4444',
      isActive: true
    }
  ];

  // Select random prize
  const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
  
  // Create scratch card with 24-hour expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const scratchCard = new this({
    userId,
    prize: randomPrize,
    expiresAt
  });

  return await scratchCard.save();
};

// Static method to get user's scratch cards
ScratchCardSchema.statics.getUserScratchCards = async function(userId: string): Promise<IScratchCard[]> {
  return await this.find({ 
    userId,
    expiresAt: { $gt: new Date() } // Only active cards
  }).sort({ createdAt: -1 });
};

// Static method to claim prize
ScratchCardSchema.statics.claimPrize = async function(scratchCardId: string, userId: string): Promise<IScratchCard> {
  const scratchCard = await this.findOne({ 
    _id: scratchCardId, 
    userId,
    isScratched: true,
    isClaimed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!scratchCard) {
    throw new Error('Scratch card not found or already claimed');
  }

  scratchCard.isClaimed = true;
  scratchCard.claimedAt = new Date();
  await scratchCard.save();

  return scratchCard;
};

// Static method to check eligibility
ScratchCardSchema.statics.isEligibleForScratchCard = async function(userId: string): Promise<boolean> {
  // Check if user has completed at least 80% of their profile
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    return false;
  }

  const profile = user.profile || {};
  const totalFields = 9; // Updated to include website field
  let completedFields = 0;

  if (profile.firstName) completedFields++;
  if (user.email) completedFields++;
  if (user.phoneNumber) completedFields++;
  if (profile.avatar) completedFields++;
  if (profile.dateOfBirth) completedFields++;
  if (profile.gender) completedFields++;
  if (profile.location?.address) completedFields++;
  if (profile.bio) completedFields++;
  if (profile.website) completedFields++;

  const completionPercentage = (completedFields / totalFields) * 100;
  
  // Check if user already has an unclaimed scratch card
  const existingCard = await this.findOne({
    userId,
    isClaimed: false,
    expiresAt: { $gt: new Date() }
  });

  return completionPercentage >= 80 && !existingCard;
};

// Compound indexes
ScratchCardSchema.index({ userId: 1, isClaimed: 1, expiresAt: 1 });
ScratchCardSchema.index({ userId: 1, createdAt: -1 });

// Pre-save middleware
ScratchCardSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const ScratchCard = mongoose.model<IScratchCard, IScratchCardModel>('ScratchCard', ScratchCardSchema);
export default ScratchCard;
