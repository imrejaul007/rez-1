import mongoose, { Schema, Document, Model } from 'mongoose';

export type AllocationEntryType = 'fund' | 'allocate' | 'disburse' | 'refund';

export interface ISponsorAllocation extends Document {
  sponsor: mongoose.Types.ObjectId;
  program?: mongoose.Types.ObjectId;
  type: AllocationEntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: {
    enrollmentId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    adminId?: mongoose.Types.ObjectId;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISponsorAllocationModel extends Model<ISponsorAllocation> {
  getSponsorBalance(sponsorId: string): Promise<number>;
  getEventBudgetSummary(sponsorId: string, programId: string): Promise<{
    allocated: number;
    disbursed: number;
    remaining: number;
  }>;
  recordFund(
    sponsorId: string,
    amount: number,
    adminId: string,
    description: string
  ): Promise<ISponsorAllocation>;
  recordAllocate(
    sponsorId: string,
    programId: string,
    amount: number,
    adminId: string
  ): Promise<ISponsorAllocation>;
  recordDisburse(
    sponsorId: string,
    programId: string,
    enrollmentId: string,
    userId: string,
    amount: number
  ): Promise<ISponsorAllocation>;
  recordRefund(
    sponsorId: string,
    programId: string | null,
    amount: number,
    adminId: string,
    description: string
  ): Promise<ISponsorAllocation>;
}

const SponsorAllocationSchema: Schema = new Schema(
  {
    sponsor: {
      type: Schema.Types.ObjectId,
      ref: 'Sponsor',
      required: true,
      index: true
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program'
    },
    type: {
      type: String,
      enum: ['fund', 'allocate', 'disburse', 'refund'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true
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

// Indexes
SponsorAllocationSchema.index({ sponsor: 1, createdAt: -1 });
SponsorAllocationSchema.index({ sponsor: 1, program: 1, type: 1 });

// Get current sponsor balance from most recent entry
SponsorAllocationSchema.statics.getSponsorBalance = async function (
  sponsorId: string
): Promise<number> {
  const latest = await this.findOne({ sponsor: sponsorId })
    .sort({ createdAt: -1 })
    .select('balanceAfter');
  return latest?.balanceAfter || 0;
};

// Get event-specific budget summary
SponsorAllocationSchema.statics.getEventBudgetSummary = async function (
  sponsorId: string,
  programId: string
): Promise<{ allocated: number; disbursed: number; remaining: number }> {
  const result = await this.aggregate([
    {
      $match: {
        sponsor: new mongoose.Types.ObjectId(sponsorId),
        program: new mongoose.Types.ObjectId(programId),
        type: { $in: ['allocate', 'disburse'] }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const allocated = result.find((r: any) => r._id === 'allocate')?.total || 0;
  const disbursed = result.find((r: any) => r._id === 'disburse')?.total || 0;

  return { allocated, disbursed, remaining: allocated - disbursed };
};

// Record a funding entry (admin deposits coins into sponsor budget)
SponsorAllocationSchema.statics.recordFund = async function (
  sponsorId: string,
  amount: number,
  adminId: string,
  description: string
): Promise<ISponsorAllocation> {
  const currentBalance = await (this as unknown as ISponsorAllocationModel).getSponsorBalance(sponsorId);
  const newBalance = currentBalance + amount;

  const entry = await this.create({
    sponsor: sponsorId,
    type: 'fund',
    amount,
    balanceAfter: newBalance,
    description,
    metadata: { adminId: new mongoose.Types.ObjectId(adminId) }
  });

  // Update sponsor cached balance
  const Sponsor = mongoose.model('Sponsor');
  await Sponsor.findByIdAndUpdate(sponsorId, {
    $inc: { totalBudgetFunded: amount },
    $set: { currentBalance: newBalance }
  });

  return entry;
};

// Record a budget allocation to a specific event
SponsorAllocationSchema.statics.recordAllocate = async function (
  sponsorId: string,
  programId: string,
  amount: number,
  adminId: string
): Promise<ISponsorAllocation> {
  const currentBalance = await (this as unknown as ISponsorAllocationModel).getSponsorBalance(sponsorId);
  if (currentBalance < amount) {
    throw new Error(`Insufficient sponsor balance: ${currentBalance} < ${amount}`);
  }

  const newBalance = currentBalance - amount;

  const entry = await this.create({
    sponsor: sponsorId,
    program: programId,
    type: 'allocate',
    amount,
    balanceAfter: newBalance,
    description: `Budget allocated to event`,
    metadata: { adminId: new mongoose.Types.ObjectId(adminId) }
  });

  // Update sponsor cached balance
  const Sponsor = mongoose.model('Sponsor');
  await Sponsor.findByIdAndUpdate(sponsorId, {
    $set: { currentBalance: newBalance }
  });

  // Update program's sponsor budget
  const Program = mongoose.model('Program');
  await Program.findByIdAndUpdate(programId, {
    $inc: { 'sponsorBudget.allocated': amount }
  });

  return entry;
};

// Record a disburse (coins awarded to participant)
SponsorAllocationSchema.statics.recordDisburse = async function (
  sponsorId: string,
  programId: string,
  enrollmentId: string,
  userId: string,
  amount: number
): Promise<ISponsorAllocation> {
  // Check event budget remaining
  const budgetSummary = await (this as unknown as ISponsorAllocationModel).getEventBudgetSummary(sponsorId, programId);
  if (budgetSummary.remaining < amount) {
    throw new Error(`Insufficient event budget: ${budgetSummary.remaining} < ${amount}`);
  }

  const currentBalance = await (this as unknown as ISponsorAllocationModel).getSponsorBalance(sponsorId);

  const entry = await this.create({
    sponsor: sponsorId,
    program: programId,
    type: 'disburse',
    amount,
    balanceAfter: currentBalance, // Sponsor balance doesn't change on disburse (already deducted during allocate)
    description: `Branded coins awarded to participant`,
    metadata: {
      enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId)
    }
  });

  // Update program's sponsor budget disbursed
  const Program = mongoose.model('Program');
  await Program.findByIdAndUpdate(programId, {
    $inc: { 'sponsorBudget.disbursed': amount }
  });

  return entry;
};

// Record a refund (coins returned to sponsor)
SponsorAllocationSchema.statics.recordRefund = async function (
  sponsorId: string,
  programId: string | null,
  amount: number,
  adminId: string,
  description: string
): Promise<ISponsorAllocation> {
  const currentBalance = await (this as unknown as ISponsorAllocationModel).getSponsorBalance(sponsorId);
  const newBalance = currentBalance + amount;

  const entry = await this.create({
    sponsor: sponsorId,
    program: programId || undefined,
    type: 'refund',
    amount,
    balanceAfter: newBalance,
    description,
    metadata: { adminId: new mongoose.Types.ObjectId(adminId) }
  });

  // Update sponsor cached balance
  const Sponsor = mongoose.model('Sponsor');
  await Sponsor.findByIdAndUpdate(sponsorId, {
    $set: { currentBalance: newBalance }
  });

  return entry;
};

export const SponsorAllocation = mongoose.model<ISponsorAllocation, ISponsorAllocationModel>(
  'SponsorAllocation',
  SponsorAllocationSchema
);
