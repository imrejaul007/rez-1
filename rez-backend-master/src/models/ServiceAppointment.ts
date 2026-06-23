import { logger } from '../config/logger';
// ServiceAppointment Model
// Tracks service appointments for stores (salons, spas, consultations, etc.)

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IServiceAppointment extends Document {
  _id: Types.ObjectId;
  appointmentNumber: string;
  store: Types.ObjectId;
  user: Types.ObjectId;
  serviceType: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number; // in minutes
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialInstructions?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  staffMember?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  coinsEarned: number;
  // Virtual properties
  formattedDateTime?: string;
  // Instance methods
  updateStatus(newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<IServiceAppointment>;
  cancel(reason?: string): Promise<IServiceAppointment>;
  confirm(): Promise<IServiceAppointment>;
}

const ServiceAppointmentSchema = new Schema(
  {
    appointmentNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    appointmentTime: {
      type: String,
      required: true,
      trim: true,
      // Format: "HH:MM" (e.g., "14:30")
    },
    duration: {
      type: Number,
      required: true,
      default: 60,
      min: 15,
      max: 480, // max 8 hours
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    staffMember: {
      type: String,
      trim: true,
    },
    confirmedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    coinsEarned: {
      type: Number,
      default: 0,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound Indexes for better query performance
ServiceAppointmentSchema.index({ store: 1, appointmentDate: 1 });
ServiceAppointmentSchema.index({ user: 1, status: 1 });
ServiceAppointmentSchema.index({ user: 1, createdAt: -1 });
ServiceAppointmentSchema.index({ store: 1, status: 1, appointmentDate: 1 });
ServiceAppointmentSchema.index({ appointmentDate: 1, status: 1 });

// Virtual: Formatted date and time
ServiceAppointmentSchema.virtual('formattedDateTime').get(function(this: IServiceAppointment) {
  const date = new Date(this.appointmentDate);
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  return `${dateStr} at ${this.appointmentTime}`;
});

// Static method: Generate appointment number
ServiceAppointmentSchema.statics.generateAppointmentNumber = async function(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SA-${timestamp}-${random}`;
};

// Static method: Find appointment by appointment number
ServiceAppointmentSchema.statics.findByAppointmentNumber = async function(
  appointmentNumber: string
): Promise<IServiceAppointment | null> {
  return this.findOne({ appointmentNumber })
    .populate('store', 'name logo location contact')
    .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
    .lean();
};

// Static method: Get store's appointments
ServiceAppointmentSchema.statics.findStoreAppointments = async function(
  storeId: Types.ObjectId,
  date?: Date
): Promise<IServiceAppointment[]> {
  const query: any = { store: storeId };

  if (date) {
    // Get appointments for specific date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query.appointmentDate = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  }

  return this.find(query)
    .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .lean();
};

// Static method: Get user's appointments
ServiceAppointmentSchema.statics.findUserAppointments = async function(
  userId: Types.ObjectId
): Promise<IServiceAppointment[]> {
  return this.find({ user: userId })
    .populate('store', 'name logo location contact operationalInfo')
    .sort({ appointmentDate: -1, createdAt: -1 })
    .lean();
};

// Static method: Check availability for a time slot
ServiceAppointmentSchema.statics.checkAvailability = async function(
  storeId: Types.ObjectId,
  date: Date,
  time: string,
  duration: number = 60
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all appointments for the day
  const appointments = await this.find({
    store: storeId,
    appointmentDate: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
  }).lean();

  // Parse requested time
  const [reqHour, reqMin] = time.split(':').map(Number);
  const reqStartTime = reqHour * 60 + reqMin; // minutes from midnight
  const reqEndTime = reqStartTime + duration;

  // Check for conflicts
  for (const appt of appointments) {
    const [apptHour, apptMin] = appt.appointmentTime.split(':').map(Number);
    const apptStartTime = apptHour * 60 + apptMin;
    const apptEndTime = apptStartTime + appt.duration;

    // Check if times overlap
    if (
      (reqStartTime >= apptStartTime && reqStartTime < apptEndTime) ||
      (reqEndTime > apptStartTime && reqEndTime <= apptEndTime) ||
      (reqStartTime <= apptStartTime && reqEndTime >= apptEndTime)
    ) {
      return false; // Conflict found
    }
  }

  return true; // No conflicts
};

// Instance method: Update status
ServiceAppointmentSchema.methods.updateStatus = async function(
  newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
): Promise<IServiceAppointment> {
  this.status = newStatus;

  if (newStatus === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  } else if (newStatus === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }

  await this.save();

  logger.info(`✅ Appointment ${this.appointmentNumber} status updated to: ${newStatus}`);
  return this as unknown as IServiceAppointment;
};

// Instance method: Cancel appointment
ServiceAppointmentSchema.methods.cancel = async function(
  reason?: string
): Promise<IServiceAppointment> {
  this.status = 'cancelled';
  this.cancelledAt = new Date();

  if (reason) {
    this.cancellationReason = reason;
  }

  await this.save();

  logger.info(`✅ Appointment ${this.appointmentNumber} cancelled`);
  return this as unknown as IServiceAppointment;
};

// Instance method: Confirm appointment
ServiceAppointmentSchema.methods.confirm = async function(): Promise<IServiceAppointment> {
  this.status = 'confirmed';
  this.confirmedAt = new Date();

  await this.save();

  logger.info(`✅ Appointment ${this.appointmentNumber} confirmed`);
  return this as unknown as IServiceAppointment;
};

export const ServiceAppointment = mongoose.model<IServiceAppointment>(
  'ServiceAppointment',
  ServiceAppointmentSchema
);
