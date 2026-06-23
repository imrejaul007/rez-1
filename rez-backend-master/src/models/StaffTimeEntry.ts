import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffTimeEntry extends Document {
  storeId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  clockIn: Date;
  clockOut?: Date;
  breakMinutes: number;
  totalMinutes?: number; // computed: (clockOut - clockIn) in minutes - breakMinutes
  notes?: string;
  date: string; // YYYY-MM-DD for easy date filtering
  createdAt: Date;
  updatedAt: Date;
}

const StaffTimeEntrySchema = new Schema<IStaffTimeEntry>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    breakMinutes: { type: Number, default: 0, min: 0 },
    totalMinutes: { type: Number },
    notes: { type: String },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true },
);

StaffTimeEntrySchema.index({ storeId: 1, date: 1 });
StaffTimeEntrySchema.index({ staffId: 1, date: 1 });

// Auto-compute totalMinutes on save
StaffTimeEntrySchema.pre('save', function (next) {
  if (this.clockIn && this.clockOut) {
    const diffMs = this.clockOut.getTime() - this.clockIn.getTime();
    this.totalMinutes = Math.round(diffMs / 60000) - (this.breakMinutes || 0);
  }
  next();
});

export const StaffTimeEntry = mongoose.model<IStaffTimeEntry>('StaffTimeEntry', StaffTimeEntrySchema);
