import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICatalogItem extends Document {
  storeId: mongoose.Types.ObjectId;
  storeSlug: string;
  type: 'product' | 'service';
  name: string;
  description: string;
  basePrice: number; // in paise
  currency: string;
  images: string[];
  tags: string[];
  isAvailable: boolean;
  // Food-specific
  category?: string;
  isVeg?: boolean;
  spiceLevel?: 'mild' | 'medium' | 'spicy' | 'very_spicy';
  // Retail-specific
  variants?: Array<{
    name: string;
    type: 'color' | 'size' | 'text' | 'button';
    options: Array<{
      label: string;
      value: string;
      priceModifier: number;
      inStock: boolean;
      image?: string;
      color?: string;
    }>;
  }>;
  sku?: string;
  stock?: number;
  mrp?: number; // in paise
  bulkPricing?: Array<{ minQty: number; pricePerUnit: number }>;
  // Service-specific
  durationMinutes?: number;
  staff?: Array<{ id: string; name: string; rating: number }>;
  bookingRequiresDeposit?: boolean;
  depositAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogItemSchema = new Schema<ICatalogItem>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    storeSlug: { type: String, required: true, index: true },
    type: { type: String, enum: ['product', 'service'], required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    category: String,
    isVeg: Boolean,
    spiceLevel: String,
    variants: [
      {
        name: String,
        type: String,
        options: [
          {
            label: String,
            value: String,
            priceModifier: { type: Number, default: 0 },
            inStock: { type: Boolean, default: true },
            image: String,
            color: String,
          },
        ],
      },
    ],
    sku: String,
    stock: { type: Number, default: 0 },
    mrp: Number,
    bulkPricing: [
      {
        minQty: Number,
        pricePerUnit: Number,
      },
    ],
    durationMinutes: Number,
    staff: [
      {
        id: String,
        name: String,
        rating: Number,
      },
    ],
    bookingRequiresDeposit: Boolean,
    depositAmount: Number,
  },
  { timestamps: true },
);

CatalogItemSchema.index({ storeSlug: 1, type: 1 });
CatalogItemSchema.index({ storeSlug: 1, isAvailable: 1 });

export const CatalogItem: Model<ICatalogItem> =
  mongoose.models.CatalogItem || mongoose.model<ICatalogItem>('CatalogItem', CatalogItemSchema);
