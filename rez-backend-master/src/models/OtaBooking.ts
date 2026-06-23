import mongoose, { Schema, Document } from 'mongoose';

export interface IOtaBooking extends Document {
  otaBookingId: string;
  hotelId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  checkIn?: Date;
  checkOut?: Date;
  amountPaise: number;
  channelSource?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

const OtaBookingSchema = new Schema<IOtaBooking>(
  {
    otaBookingId: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'OtaHotel' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    amountPaise: { type: Number, required: true },
    channelSource: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

export const OtaBooking = mongoose.model<IOtaBooking>('OtaBooking', OtaBookingSchema);
export default OtaBooking;
