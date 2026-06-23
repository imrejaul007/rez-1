import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction {
  amount: number;
  type: 'credit' | 'payment';
  note?: string;
  date: Date;
  recordedBy?: string;
}

export interface ICustomerCredit extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  customerPhone: string;
  customerName: string;
  balance: number;
  transactions: ITransaction[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'payment'], required: true },
  note: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  recordedBy: { type: String, trim: true },
});

const CustomerCreditSchema = new Schema<ICustomerCredit>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    customerPhone: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    balance: { type: Number, default: 0 },
    transactions: [TransactionSchema],
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CustomerCreditSchema.index({ merchantId: 1, customerPhone: 1 }, { unique: true });

export const CustomerCredit = mongoose.model<ICustomerCredit>('CustomerCredit', CustomerCreditSchema);
