import mongoose, { Schema, Document, Types } from 'mongoose';

// Payment Method Types
export enum PaymentMethodType {
  CARD = 'CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  UPI = 'UPI',
  WALLET = 'WALLET'
}

export enum CardType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  RUPAY = 'RUPAY',
  DISCOVER = 'DISCOVER',
  OTHER = 'OTHER'
}

export enum BankAccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT'
}

// Payment Method Interface
export interface IPaymentMethod extends Document {
  id: string; // Virtual field for _id
  user: Types.ObjectId;
  type: PaymentMethodType;

  // Card fields
  card?: {
    type: CardType;
    brand: CardBrand;
    lastFourDigits: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
    nickname?: string;
  };

  // Bank Account fields
  bankAccount?: {
    bankName: string;
    accountType: BankAccountType;
    accountNumber: string; // Stored encrypted or masked
    ifscCode: string;
    nickname?: string;
    isVerified: boolean;
  };

  // UPI fields
  upi?: {
    vpa: string; // Virtual Payment Address (e.g., user@upi)
    nickname?: string;
    isVerified: boolean;
  };

  isDefault: boolean;
  isActive: boolean;

  // Security
  token?: string; // Payment gateway token

  createdAt: Date;
  updatedAt: Date;
}

// Payment Method Schema
const PaymentMethodSchema = new Schema<IPaymentMethod>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(PaymentMethodType),
    required: true
  },
  card: {
    type: {
      type: String,
      enum: Object.values(CardType)
    },
    brand: {
      type: String,
      enum: Object.values(CardBrand)
    },
    lastFourDigits: {
      type: String,
      match: /^\d{4}$/
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expiryYear: {
      type: Number,
      min: new Date().getFullYear()
    },
    cardholderName: {
      type: String,
      trim: true
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50
    }
  },
  bankAccount: {
    bankName: {
      type: String,
      trim: true
    },
    accountType: {
      type: String,
      enum: Object.values(BankAccountType)
    },
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{4}0[A-Z0-9]{6}$/
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  upi: {
    vpa: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[\w.-]+@[\w.-]+$/
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  token: {
    type: String,
    select: false // Don't expose token in queries
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete (ret as any)._id;
      delete (ret as any).__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      return ret;
    }
  }
});

// Virtual ID field
PaymentMethodSchema.virtual('id').get(function(this: any) {
  return this._id.toString();
});

// Indexes
PaymentMethodSchema.index({ user: 1, isDefault: 1 });
PaymentMethodSchema.index({ user: 1, isActive: 1 });
PaymentMethodSchema.index({ user: 1, type: 1 });

// Pre-save hook to ensure only one default payment method per user
PaymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Set all other payment methods for this user to non-default
    await mongoose.model('PaymentMethod').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Virtual to check if card is expired
PaymentMethodSchema.virtual('isCardExpired').get(function() {
  if (this.type === PaymentMethodType.CARD && this.card) {
    const now = new Date();
    const expiryDate = new Date(this.card.expiryYear, this.card.expiryMonth);
    return expiryDate < now;
  }
  return false;
});

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);