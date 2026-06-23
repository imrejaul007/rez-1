import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupBuyMember {
  userId: mongoose.Types.ObjectId;
  amountPaise: number;
}

export interface IGroupBuy extends Document {
  creator: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  targetAmountPaise: number;
  pooledAmountPaise: number;
  members: IGroupBuyMember[];
  inviteCode: string;
  status: 'open' | 'confirmed' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GroupBuyMemberSchema = new Schema<IGroupBuyMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const GroupBuySchema = new Schema<IGroupBuy>(
  {
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    targetAmountPaise: { type: Number, required: true, min: 1 },
    pooledAmountPaise: { type: Number, default: 0, min: 0 },
    members: { type: [GroupBuyMemberSchema], default: [] },
    inviteCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    status: {
      type: String,
      enum: ['open', 'confirmed', 'expired'],
      default: 'open',
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    strict: false,
  },
);

GroupBuySchema.index({ creator: 1, status: 1 });
GroupBuySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export const GroupBuy = mongoose.model<IGroupBuy>('GroupBuy', GroupBuySchema);
