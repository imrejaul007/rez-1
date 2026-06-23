import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPosBillItemModifier {
  name: string; // e.g. "Extra cheese"
  price: number; // additional cost
}

export interface IPosBillItem {
  productId?: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  modifiers?: IPosBillItemModifier[];
  imageUrl?: string;
  // GST per-line breakdown for GSTR-1 compliance.
  // BUG FIX (P2-C9): Previously the frontend computed `gstRate` and
  // `gstAmount` per line via `calcLineGST` but the schema had no fields
  // for them, so Mongoose silently stripped them on save. Without these
  // fields, GSTR-1 export cannot produce a per-HSN breakdown, which is
  // mandatory for filing.
  gstRate?: number;
  gstAmount?: number;
  hsn?: string;
  sac?: string;
}

export interface IPosBill extends Document {
  storeId: Types.ObjectId;
  merchantId: Types.ObjectId;
  billNumber: string;
  items: IPosBillItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  /**
   * B7 (Sprint 0): stable User._id link for the customer on this bill.
   * Set at create time by `resolveCustomerIdentity` — either an existing
   * User._id (cashier picked from directory / phone matched an existing
   * row) or a freshly-upserted User for a new phone. Null for walk-ins
   * per the hybrid-nullable canonical event contract.
   *
   * Replaces the legacy phone-only linkage that `creditCustomerCoinsForBill`
   * still does in `markBillPaid`. Sprint 1 audit moves that path to prefer
   * `bill.customerId` when set.
   */
  customerId?: Types.ObjectId | null;
  notes?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'partial_refund';
  paidAt?: Date;
  paymentMethod?: 'cash' | 'card' | 'qr' | 'upi';
  cancelledAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  // P2-H5: audit trail — merchant user or owner id who triggered the refund
  refundedBy?: Types.ObjectId | string;
  cancelledBy?: Types.ObjectId | string;
  isQuickBill: boolean;
  tableNumber?: string;
  // Bill splitting
  splitCount?: number; // how many ways the bill was split (1 = no split)
  splitAmount?: number; // per-person base amount (last person pays base + remainder)
  splitRemainder?: number; // penny remainder after even division (assigned to last payer)
  tipAmount?: number; // optional gratuity added after bill is created
  // Coin rewards — see schema block for the full rationale
  coinsEarned?: number;
  coinRedemptionAmount?: number;
  coinsCreditedUserId?: Types.ObjectId;
  coinsCreditTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PosBillItemModifierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PosBillItemSchema = new Schema<IPosBillItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    modifiers: { type: [PosBillItemModifierSchema], default: [] },
    // Preserve the receipt image when the FE sends it. Previously this
    // field was silently stripped by strict-mode Mongoose on save.
    imageUrl: { type: String, trim: true },
    // Per-line GST fields for GSTR-1 compliance (P2-C9).
    gstRate: { type: Number, min: 0, max: 100 },
    gstAmount: { type: Number, min: 0 },
    hsn: { type: String, trim: true, maxlength: 12 },
    sac: { type: String, trim: true, maxlength: 12 },
  },
  { _id: false, strict: false },
);

const PosBillSchema = new Schema<IPosBill>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'Merchant ID is required'],
      index: true,
    },
    billNumber: {
      type: String,
      required: [true, 'Bill number is required'],
      trim: true,
    },
    items: {
      type: [PosBillItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      // Allow ₹0 bills (100% coin redemption, full-discount promo).
      // Previously this was min: 1 which rejected legitimate free orders.
      min: [0, 'Total amount cannot be negative'],
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    customerPhone: {
      type: String,
      trim: true,
      maxlength: 15,
    },
    // B7 (Sprint 0): stable User._id link — see interface comment.
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'refunded', 'partial_refund'],
      default: 'pending',
      required: true,
    },
    paidAt: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'qr', 'upi'],
    },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0 },
    refundReason: { type: String, trim: true, maxlength: 500 },
    // P2-H5 audit trail: who did the refund/cancellation
    refundedBy: { type: Schema.Types.Mixed },
    cancelledBy: { type: Schema.Types.Mixed },
    isQuickBill: {
      type: Boolean,
      default: false,
    },
    tableNumber: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    splitCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    splitAmount: {
      type: Number,
      min: 0,
    },
    splitRemainder: {
      type: Number,
      min: 0,
      default: 0,
    },
    tipAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Coin earning / redemption fields.
    //
    // `coinsEarned` is credited to the customer's wallet when the bill is
    // marked paid and the customer is resolvable (via phone → User). We
    // persist it on the bill so the success screen and invoice PDFs can
    // display exactly what was issued, even if the wallet write races.
    //
    // `coinRedemptionAmount` records coins the customer spent against this
    // bill (applied as a discount). We persist it here so the refund flow
    // can reverse the redemption without re-derivation.
    coinsEarned: {
      type: Number,
      min: 0,
      default: 0,
    },
    coinRedemptionAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    coinsCreditedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    coinsCreditTransactionId: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for common queries
PosBillSchema.index({ storeId: 1, createdAt: -1 });
PosBillSchema.index({ merchantId: 1, createdAt: -1 });
PosBillSchema.index({ storeId: 1, status: 1 });
// B7 (Sprint 0): customer bill-history lookup — supports per-customer POS
// lifetime value queries without scanning by phone.
PosBillSchema.index({ customerId: 1, createdAt: -1 }, { sparse: true });

export const PosBill = mongoose.model<IPosBill>('PosBill', PosBillSchema);
