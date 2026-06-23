import mongoose, { Schema, Document, Types } from 'mongoose';

// Visit Type Enum
export enum VisitType {
  SCHEDULED = 'scheduled',
  QUEUE = 'queue'
}

// Visit Status Enum
export enum VisitStatus {
  PENDING = 'pending',
  CHECKED_IN = 'checked_in',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Store Visit Interface
export interface IStoreVisit extends Document {
  visitNumber: string;
  storeId: Types.ObjectId;
  userId?: Types.ObjectId;
  visitType: VisitType;
  visitDate: Date;
  visitTime?: string; // For scheduled visits (e.g., "14:00")
  queueNumber?: number; // For queue type (3-digit number 100-999)
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: VisitStatus;
  estimatedDuration: number; // in minutes
  paymentMethod?: 'pay_at_store' | 'none';
  paymentStatus?: 'not_required' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  updateStatus(newStatus: VisitStatus): Promise<IStoreVisit>;
  formattedDateTime: string;
}

// Store Visit Schema
const StoreVisitSchema = new Schema<IStoreVisit>({
  visitNumber: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true,
    index: true
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  visitType: {
    type: String,
    enum: Object.values(VisitType),
    required: true,
    default: VisitType.QUEUE
  },
  visitDate: {
    type: Date,
    required: true,
    index: true
  },
  visitTime: {
    type: String,
    trim: true
  },
  queueNumber: {
    type: Number,
    min: 100,
    max: 999,
    sparse: true // Allows null values for scheduled visits
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: Object.values(VisitStatus),
    default: VisitStatus.PENDING,
    required: true,
    index: true
  },
  estimatedDuration: {
    type: Number,
    default: 30, // 30 minutes default
    min: 5,
    max: 480 // Max 8 hours
  },
  paymentMethod: {
    type: String,
    enum: ['pay_at_store', 'none'],
    default: 'none'
  },
  paymentStatus: {
    type: String,
    enum: ['not_required', 'pending'],
    default: 'not_required'
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
StoreVisitSchema.index({ storeId: 1, visitDate: 1 });
StoreVisitSchema.index({ storeId: 1, queueNumber: 1, visitDate: 1 }, { unique: true, sparse: true });
StoreVisitSchema.index({ userId: 1, createdAt: -1 });
StoreVisitSchema.index({ storeId: 1, visitDate: 1, visitType: 1, status: 1 });

// Generate visit number before saving
StoreVisitSchema.pre('save', async function(next) {
  if (this.isNew && !this.visitNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.visitNumber = `SV-${timestamp}-${random}`;
  }
  next();
});

// Virtual for formatted date/time
StoreVisitSchema.virtual('formattedDateTime').get(function(this: IStoreVisit) {
  const date = new Date(this.visitDate);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  if (this.visitType === VisitType.SCHEDULED && this.visitTime) {
    return `${formattedDate} at ${this.visitTime}`;
  } else if (this.visitType === VisitType.QUEUE && this.queueNumber) {
    return `${formattedDate} - Queue #${this.queueNumber}`;
  }

  return formattedDate;
});

// Ensure virtuals are included in JSON
StoreVisitSchema.set('toJSON', { virtuals: true });
StoreVisitSchema.set('toObject', { virtuals: true });

// Instance method: Update status
StoreVisitSchema.methods.updateStatus = async function(newStatus: VisitStatus): Promise<IStoreVisit> {
  this.status = newStatus;
  return await this.save();
};

// Static method: Find by visit number
StoreVisitSchema.statics.findByVisitNumber = async function(visitNumber: string) {
  return await this.findOne({ visitNumber })
    .populate('storeId', 'name location contact')
    .populate('userId', 'name phoneNumber email');
};

// Static method: Find store visits
StoreVisitSchema.statics.findStoreVisits = async function(storeId: string | Types.ObjectId, date?: Date) {
  const query: any = { storeId };

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query.visitDate = { $gte: startOfDay, $lte: endOfDay };
  }

  return await this.find(query)
    .populate('userId', 'name phoneNumber email')
    .sort({ createdAt: -1 });
};

// Static method: Find user visits
StoreVisitSchema.statics.findUserVisits = async function(userId: string | Types.ObjectId) {
  return await this.find({ userId })
    .populate('storeId', 'name location contact images')
    .sort({ createdAt: -1 });
};

// Static method: Get next available queue number (with collision prevention)
StoreVisitSchema.statics.getNextQueueNumber = async function(storeId: string | Types.ObjectId): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find the highest queue number for today
  const todayVisits = await this.find({
    storeId,
    visitType: VisitType.QUEUE,
    visitDate: { $gte: today, $lt: tomorrow }
  }).select('queueNumber').sort({ queueNumber: -1 }).limit(1);

  let nextNumber: number;
  if (todayVisits.length === 0) {
    nextNumber = 100; // Start from 100
  } else {
    const lastQueueNumber = todayVisits[0].queueNumber || 100;
    nextNumber = lastQueueNumber + 1;
  }

  // If we exceed 999, find the lowest unused number
  if (nextNumber > 999) {
    const usedNumbers = await this.distinct('queueNumber', {
      storeId,
      visitType: VisitType.QUEUE,
      visitDate: { $gte: today, $lt: tomorrow }
    });
    const usedSet = new Set(usedNumbers);
    for (let i = 100; i <= 999; i++) {
      if (!usedSet.has(i)) {
        nextNumber = i;
        break;
      }
    }
    // If all 900 numbers are used (unlikely), use 1000+
    if (nextNumber > 999) {
      nextNumber = 1000 + usedNumbers.length;
    }
  }

  return nextNumber;
};

// Helper: Parse time string like "02:00 PM" or "14:00" to minutes since midnight
function parseTimeToMinutes(timeStr: string): number {
  const trimmed = timeStr.trim();

  // Handle 12-hour format: "02:00 PM", "11:30 AM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Handle 24-hour format: "14:00", "09:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  return -1; // Invalid
}

// Helper: Convert minutes since midnight to "09:00 AM" format
function minutesToTimeString(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Static method: Check if a time slot is available (no overlap with existing visits)
StoreVisitSchema.statics.checkSlotAvailability = async function(
  storeId: string | Types.ObjectId,
  date: Date,
  visitTime: string,
  duration: number,
  excludeVisitId?: Types.ObjectId
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query: any = {
    storeId,
    visitDate: { $gte: startOfDay, $lte: endOfDay },
    visitType: VisitType.SCHEDULED,
    status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] }
  };

  if (excludeVisitId) {
    query._id = { $ne: excludeVisitId };
  }

  const existingVisits = await this.find(query).lean();

  const reqStart = parseTimeToMinutes(visitTime);
  if (reqStart < 0) return false; // Reject invalid time formats
  const reqEnd = reqStart + duration;

  for (const visit of existingVisits) {
    if (!visit.visitTime) continue;
    const bookStart = parseTimeToMinutes(visit.visitTime);
    if (bookStart < 0) continue;
    const bookEnd = bookStart + (visit.estimatedDuration || 30);

    // Check overlap
    if (
      (reqStart >= bookStart && reqStart < bookEnd) ||
      (reqEnd > bookStart && reqEnd <= bookEnd) ||
      (reqStart <= bookStart && reqEnd >= bookEnd)
    ) {
      return false; // Conflict found
    }
  }

  return true; // No conflicts
};

// Static method: Get available time slots for a given date
StoreVisitSchema.statics.getAvailableSlots = async function(
  storeId: string | Types.ObjectId,
  date: Date,
  duration: number,
  storeHours: { open: string; close: string }
): Promise<string[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingVisits = await this.find({
    storeId,
    visitDate: { $gte: startOfDay, $lte: endOfDay },
    visitType: VisitType.SCHEDULED,
    status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] }
  }).lean();

  // Parse store hours (24h format like "09:00")
  const openTime = parseTimeToMinutes(storeHours.open);
  const closeTime = parseTimeToMinutes(storeHours.close);
  if (openTime < 0 || closeTime < 0) return [];

  const slotInterval = 30; // 30-minute intervals
  const slots: string[] = [];

  for (let time = openTime; time + duration <= closeTime; time += slotInterval) {
    const slotEnd = time + duration;

    let hasConflict = false;
    for (const visit of existingVisits) {
      if (!visit.visitTime) continue;
      const bookStart = parseTimeToMinutes(visit.visitTime);
      if (bookStart < 0) continue;
      const bookEnd = bookStart + (visit.estimatedDuration || 30);

      if (
        (time >= bookStart && time < bookEnd) ||
        (slotEnd > bookStart && slotEnd <= bookEnd) ||
        (time <= bookStart && slotEnd >= bookEnd)
      ) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      slots.push(minutesToTimeString(time));
    }
  }

  return slots;
};

// Extend mongoose model interface
interface IStoreVisitModel extends mongoose.Model<IStoreVisit> {
  findByVisitNumber(visitNumber: string): Promise<IStoreVisit | null>;
  findStoreVisits(storeId: string | Types.ObjectId, date?: Date): Promise<IStoreVisit[]>;
  findUserVisits(userId: string | Types.ObjectId): Promise<IStoreVisit[]>;
  getNextQueueNumber(storeId: string | Types.ObjectId): Promise<number>;
  checkSlotAvailability(storeId: string | Types.ObjectId, date: Date, visitTime: string, duration: number, excludeVisitId?: Types.ObjectId): Promise<boolean>;
  getAvailableSlots(storeId: string | Types.ObjectId, date: Date, duration: number, storeHours: { open: string; close: string }): Promise<string[]>;
}

export const StoreVisit = mongoose.model<IStoreVisit, IStoreVisitModel>('StoreVisit', StoreVisitSchema);
