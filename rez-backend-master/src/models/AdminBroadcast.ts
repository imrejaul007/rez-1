import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminBroadcast extends Document {
  adminId: mongoose.Types.ObjectId;
  audience: string;
  title: string;
  body: string;
  sentAt: Date;
  userCount: number;
}

const AdminBroadcastSchema = new Schema<IAdminBroadcast>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    audience: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    userCount: { type: Number, default: 0 },
  },
  { strict: false, timestamps: false },
);

export const AdminBroadcast = mongoose.model<IAdminBroadcast>('AdminBroadcast', AdminBroadcastSchema);
export default AdminBroadcast;
