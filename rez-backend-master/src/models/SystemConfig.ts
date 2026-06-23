import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  description: string;
  category: 'operations' | 'notifications' | 'limits' | 'integrations';
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ISystemConfig>({
  key: { type: String, unique: true, required: true, index: true },
  value: Schema.Types.Mixed,
  type: { type: String, enum: ['string', 'number', 'boolean'] },
  description: String,
  category: { type: String, enum: ['operations', 'notifications', 'limits', 'integrations'] },
}, { timestamps: true });

export default mongoose.model<ISystemConfig>('SystemConfig', schema);
