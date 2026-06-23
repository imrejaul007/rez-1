import { Schema, model, Document, Types } from 'mongoose';

/**
 * Expense — operational expenses tracked by category and payment method.
 * Supports recurring expenses and GST tracking.
 */
export interface IExpense extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  date: Date;
  category: 'rent' | 'salary' | 'utilities' | 'marketing' | 'inventory' | 'maintenance' | 'equipment' | 'other';
  description: string;
  amount: number;
  paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'card';
  receipt?: string; // Cloudinary URL
  gstAmount?: number;
  isRecurring: boolean;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    category: {
      type: String,
      enum: ['rent', 'salary', 'utilities', 'marketing', 'inventory', 'maintenance', 'equipment', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card'],
      required: true,
    },
    receipt: { type: String },
    gstAmount: { type: Number, default: 0 },
    isRecurring: { type: Boolean, default: false },
    addedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

ExpenseSchema.index({ merchantId: 1, date: -1 });
ExpenseSchema.index({ storeId: 1, date: -1 });
ExpenseSchema.index({ merchantId: 1, category: 1 });

export const Expense = model<IExpense>('Expense', ExpenseSchema);

export default Expense;
