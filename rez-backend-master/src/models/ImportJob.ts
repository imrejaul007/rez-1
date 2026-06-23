import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IImportJobRow {
  rowNumber: number;
  status: 'success' | 'error' | 'warning';
  data: any;
  errors: string[];
  warnings: string[];
  productId?: Types.ObjectId;
  action?: 'created' | 'updated' | 'skipped';
}

export interface IImportJob extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  fileName: string;
  fileType: 'csv' | 'excel';
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    warnings: number;
  };
  result?: {
    total: number;
    successful: number;
    failed: number;
    warnings: number;
    rows: IImportJobRow[];
    startTime: Date;
    endTime?: Date;
    duration?: number;
  };
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['csv', 'excel'],
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    progress: {
      total: {
        type: Number,
        default: 0
      },
      processed: {
        type: Number,
        default: 0
      },
      successful: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      },
      warnings: {
        type: Number,
        default: 0
      }
    },
    result: {
      total: Number,
      successful: Number,
      failed: Number,
      warnings: Number,
      rows: [{
        rowNumber: Number,
        status: {
          type: String,
          enum: ['success', 'error', 'warning']
        },
        data: Schema.Types.Mixed,
        errors: [String],
        warnings: [String],
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product'
        },
        action: {
          type: String,
          enum: ['created', 'updated', 'skipped']
        }
      }],
      startTime: Date,
      endTime: Date,
      duration: Number
    },
    error: String,
    startedAt: Date,
    completedAt: Date
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

// Indexes
ImportJobSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
ImportJobSchema.index({ storeId: 1, status: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1, createdAt: -1 });

// Auto-delete completed jobs after 30 days
ImportJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ImportJob =
  mongoose.models.ImportJob || mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
