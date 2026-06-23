import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAppointment extends Document {
  storeId: mongoose.Types.ObjectId;
  storeSlug: string;
  customerId?: string;
  customerPhone: string;
  customerName: string;
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
  staffId?: string;
  staffName?: string;
  date: string; // ISO date "2026-04-20"
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  status: 'booked' | 'completed' | 'cancelled' | 'no_show';
  depositPaid: boolean;
  depositAmount: number;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    storeSlug: { type: String, required: true, index: true },
    customerId: String,
    customerPhone: { type: String, required: true },
    customerName: { type: String, default: '' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    serviceName: { type: String, required: true },
    staffId: String,
    staffName: String,
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['booked', 'completed', 'cancelled', 'no_show'], default: 'booked' },
    depositPaid: { type: Boolean, default: false },
    depositAmount: { type: Number, default: 0 },
    paymentId: String,
    notes: String,
  },
  { timestamps: true },
);

// Unique index prevents double-booking: same store + date + startTime can only have one
// appointment. staffId is excluded from the index so that a staff member's slot is
// unique but two customers can book different staff for the same time window.
AppointmentSchema.index({ storeSlug: 1, date: 1, startTime: 1 }, { unique: true });
AppointmentSchema.index({ customerPhone: 1 });
AppointmentSchema.index({ storeSlug: 1, serviceId: 1, date: 1 });

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
