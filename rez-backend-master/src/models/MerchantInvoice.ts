import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface IMerchantInvoice extends Document {
  merchantId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  items: IInvoiceItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const MerchantInvoiceSchema = new Schema<IMerchantInvoice>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
    },
    items: {
      type: [InvoiceItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid'],
      default: 'draft',
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

MerchantInvoiceSchema.index({ merchantId: 1, createdAt: -1 });
MerchantInvoiceSchema.index({ merchantId: 1, status: 1 });

// Pre-save: auto-generate invoiceNumber as unknown as INV-{year}-{padded sequential count}
MerchantInvoiceSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await (this.constructor as mongoose.Model<IMerchantInvoice>).countDocuments({
      invoiceNumber: new RegExp(`^INV-${year}-`),
    });
    const padded = String(count + 1).padStart(4, '0');
    this.invoiceNumber = `INV-${year}-${padded}`;
  }
  next();
});

export const MerchantInvoice = mongoose.model<IMerchantInvoice>('MerchantInvoice', MerchantInvoiceSchema);
export default MerchantInvoice;
