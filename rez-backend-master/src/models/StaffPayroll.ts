import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffPayroll extends Document {
  merchantId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  month: string; // "2026-03"
  baseSalary: number;
  workingDays: number;
  daysPresent: number;
  daysAbsent: number;
  halfDays: number;
  overtimeHours: number;
  overtimePay: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  paidAt?: Date;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffPayrollSchema = new Schema<IStaffPayroll>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'MerchantUser', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    month: { type: String, required: true }, // "2026-03"
    baseSalary: { type: Number, required: true },
    workingDays: { type: Number, default: 26 },
    daysPresent: { type: Number, default: 0 },
    daysAbsent: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
    paidAt: Date,
    paymentMethod: String,
    notes: String,
  },
  { timestamps: true },
);

StaffPayrollSchema.index({ staffId: 1, month: 1 }, { unique: true });
StaffPayrollSchema.index({ storeId: 1, month: 1 });

// Composite indexes for analytics and reporting
StaffPayrollSchema.index({ merchantId: 1, month: 1 }); // For merchant payroll tracking
// Note: { staffId: 1, month: 1 } already declared above as unique — removed duplicate

// Auto-calculate netSalary before save
StaffPayrollSchema.pre('save', function (next) {
  const dailyRate = this.baseSalary / this.workingDays;
  const presentPay = dailyRate * this.daysPresent;
  const halfDayPay = (dailyRate / 2) * this.halfDays;
  this.netSalary = presentPay + halfDayPay + this.overtimePay + this.bonus - this.deductions;
  next();
});

export const StaffPayroll = mongoose.model<IStaffPayroll>('StaffPayroll', StaffPayrollSchema);
export default StaffPayroll;
