import mongoose, { Document, Schema } from 'mongoose';

export interface IClientPackage extends Document {
  storeId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled';
  purchasePrice: number;
  expiresAt?: Date;
  redemptions: Array<{
    appointmentId?: mongoose.Types.ObjectId;
    redeemedAt: Date;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ClientPackageSchema = new Schema<IClientPackage>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'ServicePackage', required: true },
    packageName: { type: String, required: true },
    totalSessions: { type: Number, required: true },
    usedSessions: { type: Number, default: 0 },
    remainingSessions: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'exhausted', 'expired', 'cancelled'],
      default: 'active',
    },
    purchasePrice: { type: Number, required: true },
    expiresAt: Date,
    redemptions: [
      {
        appointmentId: { type: Schema.Types.ObjectId, ref: 'ServiceAppointment' },
        redeemedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
  },
  { timestamps: true },
);

ClientPackageSchema.index({ storeId: 1, clientId: 1 });
ClientPackageSchema.index({ storeId: 1, status: 1 });

export default mongoose.model<IClientPackage>('ClientPackage', ClientPackageSchema);
