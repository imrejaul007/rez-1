import mongoose, { Schema, Document } from 'mongoose';

export interface IOtaHotel extends Document {
  name: string;
  city: string;
  starRating: number;
  brandCoinEnabled: boolean;
  brandCoinSymbol: string;
  totalBrandCoinLiabilityPaise: number;
  isActive: boolean;
  merchantId: mongoose.Types.ObjectId;
}

const OtaHotelSchema = new Schema<IOtaHotel>(
  {
    name: { type: String, required: true },
    city: { type: String },
    starRating: { type: Number, min: 1, max: 5 },
    brandCoinEnabled: { type: Boolean, default: false },
    brandCoinSymbol: { type: String },
    totalBrandCoinLiabilityPaise: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
  },
  { timestamps: true },
);

export const OtaHotel = mongoose.model<IOtaHotel>('OtaHotel', OtaHotelSchema);
export default OtaHotel;
