import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffAttendance extends Document {
  merchantId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  hoursWorked: number;
  status: 'present' | 'absent' | 'half_day' | 'holiday';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAttendanceSchema = new Schema<IStaffAttendance>({
  merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
  staffId: { type: Schema.Types.ObjectId, ref: 'MerchantUser', required: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  date: { type: Date, required: true },
  clockIn: Date,
  clockOut: Date,
  hoursWorked: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'holiday'],
    default: 'absent',
  },
  notes: String,
}, { timestamps: true });

StaffAttendanceSchema.index({ storeId: 1, date: 1 });
StaffAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

// Composite indexes for analytics and reporting
StaffAttendanceSchema.index({ merchantId: 1, date: -1 }); // For merchant attendance tracking
StaffAttendanceSchema.index({ staffId: 1, date: -1 }); // For staff history

// Auto-calculate hoursWorked when clockOut is set
StaffAttendanceSchema.pre('save', function (next) {
  if (this.clockIn && this.clockOut) {
    const ms = this.clockOut.getTime() - this.clockIn.getTime();
    this.hoursWorked = parseFloat((ms / 3600000).toFixed(2));
    if (this.hoursWorked >= 8) {
      this.status = 'present';
    } else if (this.hoursWorked >= 4) {
      this.status = 'half_day';
    }
  }
  next();
});

export const StaffAttendance = mongoose.model<IStaffAttendance>('StaffAttendance', StaffAttendanceSchema);
export default StaffAttendance;
