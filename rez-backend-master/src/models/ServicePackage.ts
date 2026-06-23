import mongoose, { Document, Schema } from 'mongoose';

export interface IServicePackage extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  services: Array<{
    serviceId: mongoose.Types.ObjectId;
    serviceName: string;
    sessions: number;
  }>;
  price: number;
  validityDays: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServicePackageSchema = new Schema<IServicePackage>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    services: [
      {
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
        serviceName: { type: String, required: true, trim: true },
        sessions: { type: Number, required: true, min: 1, default: 1 },
      },
    ],
    price: { type: Number, required: true, min: 0 },
    validityDays: { type: Number, required: true, min: 1, default: 365 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ServicePackageSchema.index({ storeId: 1, active: 1 });

export default mongoose.model<IServicePackage>('ServicePackage', ServicePackageSchema);
