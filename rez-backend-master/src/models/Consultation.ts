import mongoose, { Document, Schema, Types } from 'mongoose';

// Consultation Interface
export interface IConsultation extends Document {
  _id: Types.ObjectId;
  consultationNumber: string;
  storeId: Types.ObjectId;
  userId: Types.ObjectId;
  consultationType: string;
  consultationDate: Date;
  consultationTime: string;
  duration: number; // in minutes
  patientName: string;
  patientAge: number;
  patientPhone: string;
  patientEmail?: string;
  reasonForConsultation: string;
  medicalHistory?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  doctorName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateStatus(newStatus: string): Promise<IConsultation>;
  getFormattedDateTime(): string;
}

// Consultation Schema
const ConsultationSchema = new Schema<IConsultation>({
  consultationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consultationType: {
    type: String,
    required: true,
    trim: true
  },
  consultationDate: {
    type: Date,
    required: true
  },
  consultationTime: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number,
    default: 30,
    min: 15,
    max: 120
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientAge: {
    type: Number,
    required: true,
    min: 0,
    max: 150
  },
  patientPhone: {
    type: String,
    required: true,
    trim: true
  },
  patientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  reasonForConsultation: {
    type: String,
    required: true,
    trim: true
  },
  medicalHistory: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  doctorName: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ConsultationSchema.index({ storeId: 1, consultationDate: 1 });
ConsultationSchema.index({ userId: 1, status: 1 });
ConsultationSchema.index({ status: 1, consultationDate: 1 });
ConsultationSchema.index({ storeId: 1, status: 1 });

// Pre-save middleware to generate consultation number
ConsultationSchema.pre('save', function(next) {
  if (!this.consultationNumber) {
    // Generate unique consultation number: CN-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.consultationNumber = `CN-${timestamp}-${random}`;
  }
  next();
});

// Virtual for formatted date/time
ConsultationSchema.virtual('formattedDateTime').get(function() {
  return this.getFormattedDateTime();
});

// Instance method: Update status
ConsultationSchema.methods.updateStatus = async function(newStatus: string): Promise<IConsultation> {
  const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  this.status = newStatus;
  return await this.save();
};

// Instance method: Get formatted date/time
ConsultationSchema.methods.getFormattedDateTime = function(): string {
  const date = new Date(this.consultationDate);
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return `${dateStr} at ${this.consultationTime}`;
};

// Static method: Find by consultation number
ConsultationSchema.statics.findByConsultationNumber = function(consultationNumber: string) {
  return this.findOne({ consultationNumber })
    .populate('storeId', 'name location contact')
    .populate('userId', 'name phoneNumber email');
};

// Static method: Find store consultations
ConsultationSchema.statics.findStoreConsultations = function(
  storeId: string,
  date?: Date
) {
  const query: any = { storeId };

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query.consultationDate = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }

  return this.find(query)
    .populate('userId', 'name phoneNumber email')
    .sort({ consultationDate: 1, consultationTime: 1 });
};

// Static method: Find user consultations
ConsultationSchema.statics.findUserConsultations = function(userId: string) {
  return this.find({ userId })
    .populate('storeId', 'name location contact')
    .sort({ consultationDate: -1, createdAt: -1 });
};

// Create and export the model
const Consultation = mongoose.model<IConsultation>('Consultation', ConsultationSchema);

export default Consultation;
