import mongoose, { Schema, Document } from 'mongoose';

export interface IPatchTest {
  serviceCategory: string;
  testedAt: Date;
  expiresAt: Date;
  result: 'pass' | 'reaction';
  conductedBy?: string;
}

export interface IUser extends Document {
  phoneNumber: string;
  email?: string;
  name?: string;
  profileImage?: string;
  role: string;
  isActive: boolean;
  isSuspended?: boolean;
  patchTests?: IPatchTest[];
  referralCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PatchTestSchema = new Schema<IPatchTest>({
  serviceCategory: { type: String, required: true },
  testedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  result: { type: String, enum: ['pass', 'reaction'], required: true },
  conductedBy: { type: String, default: 'staff' },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  email: { type: String, sparse: true },
  name: { type: String },
  profileImage: { type: String },
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  patchTests: { type: [PatchTestSchema], default: [] },
  referralCode: { type: String },
}, {
  timestamps: true,
  strict: false, // Allow extra fields from canonical schema
});

export const User = mongoose.model<IUser>('User', UserSchema);
