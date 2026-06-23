import mongoose, { Schema, Document } from 'mongoose';

export interface IDaySchedule {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface IHoliday {
  date: string;
  name: string;
}

export interface ISupportHours {
  timezone: string;
  schedule: IDaySchedule[];
  holidays: IHoliday[];
}

export interface ISupportPhoneNumber {
  region: string;
  number: string;
  displayNumber: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ICallbackSettings {
  enabled: boolean;
  maxPerUserPerDay: number;
  estimatedWaitMinutes: number;
}

export interface ISupportCategory {
  id: string;
  name: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  slaMinutes: number;
  isActive: boolean;
  sortOrder: number;
}

export interface IQueueStatus {
  override: boolean;
  message: string;
  severity: 'normal' | 'busy' | 'critical';
}

export interface ISupportConfig extends Document {
  singleton: boolean;
  supportHours: ISupportHours;
  phoneNumbers: ISupportPhoneNumber[];
  callbackSettings: ICallbackSettings;
  categories: ISupportCategory[];
  queueStatus: IQueueStatus;
  createdAt: Date;
  updatedAt: Date;
  isCurrentlyOpen(): boolean;
}

export interface ISupportConfigModel extends mongoose.Model<ISupportConfig> {
  getOrCreate(): Promise<ISupportConfig>;
}

const SupportConfigSchema = new Schema<ISupportConfig>({
  singleton: {
    type: Boolean,
    default: true,
    unique: true,
  },
  supportHours: {
    timezone: { type: String, default: 'Asia/Dubai' },
    schedule: {
      type: [{
        dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
        dayName: { type: String, required: true },
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '21:00' },
      }],
      default: [
        { dayOfWeek: 0, dayName: 'Sunday', isOpen: true, openTime: '10:00', closeTime: '18:00' },
        { dayOfWeek: 1, dayName: 'Monday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
        { dayOfWeek: 2, dayName: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
        { dayOfWeek: 3, dayName: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
        { dayOfWeek: 4, dayName: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
        { dayOfWeek: 5, dayName: 'Friday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
        { dayOfWeek: 6, dayName: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '18:00' },
      ],
    },
    holidays: {
      type: [{
        date: { type: String, required: true },
        name: { type: String, required: true },
      }],
      default: [],
    },
  },
  phoneNumbers: {
    type: [{
      region: { type: String, default: 'AE' },
      number: { type: String, required: true },
      displayNumber: { type: String, required: true },
      label: { type: String, default: 'Support' },
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    }],
    default: [
      { region: 'AE', number: '+97145551234', displayNumber: '+971 4 555 1234', label: 'Toll Free', isActive: true, sortOrder: 0 },
    ],
  },
  callbackSettings: {
    enabled: { type: Boolean, default: true },
    maxPerUserPerDay: { type: Number, default: 3 },
    estimatedWaitMinutes: { type: Number, default: 30 },
  },
  categories: {
    type: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      icon: { type: String, required: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
      slaMinutes: { type: Number, default: 60 },
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    }],
    default: [
      { id: 'orders', name: 'Orders & Delivery', icon: 'cube-outline', priority: 'high', slaMinutes: 30, isActive: true, sortOrder: 0 },
      { id: 'payments', name: 'Payments & Refunds', icon: 'wallet-outline', priority: 'high', slaMinutes: 30, isActive: true, sortOrder: 1 },
      { id: 'wallet', name: 'Wallet & Coins', icon: 'diamond-outline', priority: 'medium', slaMinutes: 60, isActive: true, sortOrder: 2 },
      { id: 'account', name: 'Account Issues', icon: 'person-outline', priority: 'medium', slaMinutes: 60, isActive: true, sortOrder: 3 },
      { id: 'offers', name: 'Offers & Promotions', icon: 'pricetag-outline', priority: 'low', slaMinutes: 120, isActive: true, sortOrder: 4 },
      { id: 'other', name: 'Other', icon: 'help-circle-outline', priority: 'low', slaMinutes: 120, isActive: true, sortOrder: 5 },
    ],
  },
  queueStatus: {
    override: { type: Boolean, default: false },
    message: { type: String, default: '' },
    severity: { type: String, enum: ['normal', 'busy', 'critical'], default: 'normal' },
  },
}, {
  timestamps: true,
});

// Instance method: check if support is currently open
SupportConfigSchema.methods.isCurrentlyOpen = function (): boolean {
  const config = this as unknown as ISupportConfig;
  const tz = config.supportHours.timezone || 'Asia/Dubai';

  // Get current time in configured timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';

  const dayOfWeek = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDay = dayMap[dayOfWeek] ?? now.getDay();

  const hour = parseInt(getVal('hour'), 10);
  const minute = parseInt(getVal('minute'), 10);
  const currentMinutes = hour * 60 + minute;

  // Check holidays (YYYY-MM-DD)
  const year = getVal('year');
  const month = getVal('month');
  const day = getVal('day');
  const todayStr = `${year}-${month}-${day}`;

  if (config.supportHours.holidays?.some(h => h.date === todayStr)) {
    return false;
  }

  // Check day schedule
  const schedule = config.supportHours.schedule?.find(s => s.dayOfWeek === currentDay);
  if (!schedule || !schedule.isOpen) {
    return false;
  }

  const [openH, openM] = schedule.openTime.split(':').map(Number);
  const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

// Static: Get or create singleton
SupportConfigSchema.statics.getOrCreate = async function (): Promise<ISupportConfig> {
  let config = await this.findOne({ singleton: true });
  if (!config) {
    config = await this.create({ singleton: true });
  }
  return config;
};

export const SupportConfig = mongoose.model<ISupportConfig, ISupportConfigModel>('SupportConfig', SupportConfigSchema);
