import mongoose, { Document, Schema, Types } from 'mongoose';

// Health Record Interface
export interface IHealthRecord extends Document {
  _id: Types.ObjectId;
  recordNumber: string;
  userId: Types.ObjectId;
  recordType: 'prescription' | 'lab_report' | 'diagnosis' | 'vaccination' | 'imaging' | 'discharge_summary' | 'other';
  title: string;
  description?: string;
  documentUrl: string;
  documentThumbnail?: string;
  documentType: 'pdf' | 'image' | 'other';
  fileSize: number;
  issuedBy?: {
    name: string;
    type: 'doctor' | 'lab' | 'hospital' | 'pharmacy';
    storeId?: Types.ObjectId;
  };
  issuedDate?: Date;
  expiryDate?: Date;
  tags: string[];
  sharedWith: Array<{
    odId: Types.ObjectId;
    userId: Types.ObjectId;
    sharedAt: Date;
    accessLevel: 'view' | 'download';
    expiresAt?: Date;
  }>;
  isArchived: boolean;
  metadata: {
    originalFileName: string;
    uploadedAt: Date;
    lastAccessedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  archive(): Promise<IHealthRecord>;
  unarchive(): Promise<IHealthRecord>;
  addShare(userId: Types.ObjectId, accessLevel: 'view' | 'download', expiresAt?: Date): Promise<IHealthRecord>;
  removeShare(shareId: Types.ObjectId): Promise<IHealthRecord>;
}

// Health Record Schema
const HealthRecordSchema = new Schema<IHealthRecord>({
  recordNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recordType: {
    type: String,
    enum: ['prescription', 'lab_report', 'diagnosis', 'vaccination', 'imaging', 'discharge_summary', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  documentUrl: {
    type: String,
    required: true
  },
  documentThumbnail: {
    type: String
  },
  documentType: {
    type: String,
    enum: ['pdf', 'image', 'other'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  issuedBy: {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['doctor', 'lab', 'hospital', 'pharmacy']
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store'
    }
  },
  issuedDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  sharedWith: [{
    odId: {
      type: Schema.Types.ObjectId,
      default: () => new Types.ObjectId()
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    accessLevel: {
      type: String,
      enum: ['view', 'download'],
      default: 'view'
    },
    expiresAt: {
      type: Date
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    originalFileName: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    lastAccessedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
HealthRecordSchema.index({ userId: 1, recordType: 1 });
HealthRecordSchema.index({ userId: 1, isArchived: 1 });
HealthRecordSchema.index({ userId: 1, createdAt: -1 });
HealthRecordSchema.index({ 'sharedWith.userId': 1 });
HealthRecordSchema.index({ tags: 1 });

// Pre-save middleware to generate record number
HealthRecordSchema.pre('save', function(next) {
  if (!this.recordNumber) {
    // Generate unique record number: HR-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.recordNumber = `HR-${timestamp}-${random}`;
  }
  next();
});

// Instance method: Archive record
HealthRecordSchema.methods.archive = async function(): Promise<IHealthRecord> {
  this.isArchived = true;
  return await this.save();
};

// Instance method: Unarchive record
HealthRecordSchema.methods.unarchive = async function(): Promise<IHealthRecord> {
  this.isArchived = false;
  return await this.save();
};

// Instance method: Add share
HealthRecordSchema.methods.addShare = async function(
  userId: Types.ObjectId,
  accessLevel: 'view' | 'download' = 'view',
  expiresAt?: Date
): Promise<IHealthRecord> {
  // Check if already shared with this user
  const existingShare = this.sharedWith.find(
    (share: any) => share.userId.toString() === userId.toString()
  );

  if (existingShare) {
    // Update existing share
    existingShare.accessLevel = accessLevel;
    existingShare.expiresAt = expiresAt;
    existingShare.sharedAt = new Date();
  } else {
    // Add new share
    this.sharedWith.push({
      odId: new Types.ObjectId(),
      userId,
      accessLevel,
      expiresAt,
      sharedAt: new Date()
    });
  }

  return await this.save();
};

// Instance method: Remove share
HealthRecordSchema.methods.removeShare = async function(shareId: Types.ObjectId): Promise<IHealthRecord> {
  this.sharedWith = this.sharedWith.filter(
    (share: any) => share.odId.toString() !== shareId.toString()
  );
  return await this.save();
};

// Static method: Find user's records
HealthRecordSchema.statics.findUserRecords = function(
  userId: string,
  options: {
    recordType?: string;
    isArchived?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const query: any = { userId };

  if (options.recordType) {
    query.recordType = options.recordType;
  }

  if (typeof options.isArchived === 'boolean') {
    query.isArchived = options.isArchived;
  }

  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }

  let queryBuilder = this.find(query)
    .sort({ createdAt: -1 });

  if (options.offset) {
    queryBuilder = queryBuilder.skip(options.offset);
  }

  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  return queryBuilder;
};

// Static method: Find records shared with user
HealthRecordSchema.statics.findSharedWithUser = function(userId: string) {
  const now = new Date();
  return this.find({
    'sharedWith.userId': userId,
    $or: [
      { 'sharedWith.expiresAt': { $exists: false } },
      { 'sharedWith.expiresAt': null },
      { 'sharedWith.expiresAt': { $gt: now } }
    ]
  })
    .populate('userId', 'name phoneNumber')
    .sort({ 'sharedWith.sharedAt': -1 });
};

// Static method: Get record counts by type
HealthRecordSchema.statics.getRecordCountsByType = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new Types.ObjectId(userId), isArchived: false } },
    { $group: { _id: '$recordType', count: { $sum: 1 } } }
  ]);
};

// Create and export the model
const HealthRecord = mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);

export default HealthRecord;
