import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * User Zone Verification interface
 * Tracks verification requests for exclusive zones
 */
export interface IUserZoneVerification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  zoneSlug: string;
  verificationType: 'student' | 'corporate' | 'defence' | 'healthcare' | 'senior' | 'teacher' | 'government' | 'differentlyAbled';
  status: 'pending' | 'approved' | 'rejected';

  // Submitted verification data
  submittedData: {
    documentType?: string;      // 'student_id', 'corporate_email', 'service_id', 'age_proof'
    documentUrl?: string;       // URL to uploaded document
    email?: string;             // For corporate email verification
    dateOfBirth?: Date;         // For birthday/senior verification
    instituteName?: string;     // For student/teacher verification
    companyName?: string;       // For corporate verification
    serviceNumber?: string;     // For defence verification
    gender?: string;            // For women verification
    profession?: string;        // For healthcare (nurse, doctor, etc.)
    department?: string;        // For government verification
    disabilityType?: string;    // For differentlyAbled verification
    licenseNumber?: string;     // For healthcare (medical council, nursing license)
  };

  // Review information
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;

  // Verification validity
  expiresAt?: Date;             // When verification expires (e.g., student verification)

  // Metadata
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

const UserZoneVerificationSchema = new Schema<IUserZoneVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    zoneSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    verificationType: {
      type: String,
      required: true,
      enum: ['student', 'corporate', 'defence', 'healthcare', 'senior', 'teacher', 'government', 'differentlyAbled'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    submittedData: {
      documentType: String,
      documentUrl: String,
      email: String,
      dateOfBirth: Date,
      instituteName: String,
      companyName: String,
      serviceNumber: String,
      gender: String,
      profession: String,
      department: String,
      disabilityType: String,
      licenseNumber: String,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    rejectionReason: String,
    expiresAt: Date,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user+zone lookups
UserZoneVerificationSchema.index({ userId: 1, zoneSlug: 1 });
UserZoneVerificationSchema.index({ userId: 1, verificationType: 1 });
UserZoneVerificationSchema.index({ status: 1, createdAt: -1 });

// Static method to check if user has active verification for a zone
UserZoneVerificationSchema.statics.hasActiveVerification = async function (
  userId: Types.ObjectId,
  zoneSlug: string
): Promise<boolean> {
  const verification = await this.findOne({
    userId,
    zoneSlug,
    status: 'approved',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  });
  return !!verification;
};

// Static method to get user's pending verifications
UserZoneVerificationSchema.statics.getPendingForUser = function (userId: Types.ObjectId) {
  return this.find({ userId, status: 'pending' }).sort({ createdAt: -1 });
};

// Static method to get all pending verifications (for admin)
UserZoneVerificationSchema.statics.getAllPending = function (limit = 50) {
  return this.find({ status: 'pending' })
    .populate('userId', 'fullName profile.firstName profile.lastName email phoneNumber')
    .sort({ createdAt: 1 })
    .limit(limit);
};

const UserZoneVerification = mongoose.model<IUserZoneVerification>(
  'UserZoneVerification',
  UserZoneVerificationSchema
);

export default UserZoneVerification;
