import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFinancialLead extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  serviceType: string;
  applicantName: string;
  phone: string;
  annualIncome?: number;
  loanAmount?: number;
  documents: { name: string; url: string; uploadedAt: Date }[];
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialLeadSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    annualIncome: {
      type: Number,
    },
    loanAmount: {
      type: Number,
    },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected'],
      default: 'submitted',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

FinancialLeadSchema.index({ userId: 1, createdAt: -1 });
FinancialLeadSchema.index({ storeId: 1, status: 1 });

export const FinancialLead = mongoose.model<IFinancialLead>('FinancialLead', FinancialLeadSchema);
export default FinancialLead;
