import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Phone number in E.164 format: +<country code><number>, 10-15 digits total
const phonePattern = /^\+[1-9]\d{9,14}$/;

// ─── Transfer Schemas ──────────────────────────────────────────────────────────

export const initiateTransferSchema = Joi.object({
  recipientPhone: Joi.string().pattern(phonePattern).messages({
    'string.pattern.base': 'Recipient phone must be in E.164 format (e.g., +971501234567)',
  }),
  recipientId: Joi.string().pattern(objectIdPattern).messages({
    'string.pattern.base': 'recipientId must be a valid ObjectId',
  }),
  amount: Joi.number().positive().max(100000).required().messages({
    'number.positive': 'Transfer amount must be positive',
    'number.max': 'Transfer amount cannot exceed 100,000',
    'any.required': 'Transfer amount is required',
  }),
  coinType: Joi.string().valid('rez', 'nuqta').default('rez').messages({
    'any.only': 'coinType must be "rez" or "nuqta"',
  }),
  note: Joi.string().trim().max(200).allow(''),
  idempotencyKey: Joi.string().trim().min(8).max(128).required().messages({
    'any.required': 'idempotencyKey is required for transfer safety',
    'string.min': 'idempotencyKey must be at least 8 characters',
  }),
}).or('recipientPhone', 'recipientId').messages({
  'object.missing': 'Either recipientPhone or recipientId is required',
});

export const confirmTransferSchema = Joi.object({
  transferId: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'transferId is required',
    'string.pattern.base': 'transferId must be a valid ObjectId',
  }),
});

// ─── Gift Schemas ──────────────────────────────────────────────────────────────

export const validateRecipientSchema = Joi.object({
  recipientPhone: Joi.string().pattern(phonePattern).messages({
    'string.pattern.base': 'Recipient phone must be in E.164 format (e.g., +971501234567)',
  }),
  recipientId: Joi.string().pattern(objectIdPattern).messages({
    'string.pattern.base': 'recipientId must be a valid ObjectId',
  }),
}).or('recipientPhone', 'recipientId').messages({
  'object.missing': 'Either recipientPhone or recipientId is required',
});

export const sendGiftSchema = Joi.object({
  recipientPhone: Joi.string().pattern(phonePattern).messages({
    'string.pattern.base': 'Recipient phone must be in E.164 format (e.g., +971501234567)',
  }),
  recipientId: Joi.string().pattern(objectIdPattern).messages({
    'string.pattern.base': 'recipientId must be a valid ObjectId',
  }),
  amount: Joi.number().positive().max(100000).required().messages({
    'number.positive': 'Gift amount must be positive',
    'number.max': 'Gift amount cannot exceed 100,000',
    'any.required': 'Gift amount is required',
  }),
  coinType: Joi.string().valid('rez', 'nuqta').default('rez').messages({
    'any.only': 'coinType must be "rez" or "nuqta"',
  }),
  theme: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Gift theme is required',
  }),
  message: Joi.string().trim().max(150).allow(''),
  deliveryType: Joi.string().valid('instant', 'scheduled').default('instant').messages({
    'any.only': 'deliveryType must be "instant" or "scheduled"',
  }),
  scheduledAt: Joi.date().iso().greater('now').when('deliveryType', {
    is: 'scheduled',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'date.greater': 'scheduledAt must be a future date',
    'any.required': 'scheduledAt is required when deliveryType is "scheduled"',
  }),
  idempotencyKey: Joi.string().trim().min(8).max(128).required().messages({
    'any.required': 'idempotencyKey is required for gift safety',
    'string.min': 'idempotencyKey must be at least 8 characters',
  }),
}).or('recipientPhone', 'recipientId').messages({
  'object.missing': 'Either recipientPhone or recipientId is required',
});

export const claimGiftSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Gift ID is required',
    'string.pattern.base': 'Gift ID must be a valid ObjectId',
  }),
});

// ─── Prive Redeem Schema ───────────────────────────────────────────────────────

export const redeemCoinsSchema = Joi.object({
  coinAmount: Joi.number().integer().positive().max(1000000).required().messages({
    'number.positive': 'Coin amount must be positive',
    'number.max': 'Coin amount cannot exceed 1,000,000',
    'any.required': 'coinAmount is required',
  }),
  type: Joi.string().valid('gift_card', 'experience', 'charity', 'voucher', 'cashback').required().messages({
    'any.required': 'Redemption type is required',
    'any.only': 'type must be one of: gift_card, experience, charity, voucher, cashback',
  }),
  category: Joi.string().trim().max(100).allow(''),
  partnerId: Joi.string().pattern(objectIdPattern).allow('', null),
  partnerName: Joi.string().trim().max(100).allow(''),
  partnerLogo: Joi.string().uri().allow('', null),
  coinType: Joi.string().valid('rez', 'nuqta', 'prive').default('prive'),
  offerId: Joi.string().pattern(objectIdPattern).allow('', null),
  idempotencyKey: Joi.string().trim().min(8).max(128).required().messages({
    'any.required': 'idempotencyKey is required for redemption safety',
    'string.min': 'idempotencyKey must be at least 8 characters',
  }),
});

// ─── Admin Search Query Schemas ────────────────────────────────────────────────

export const adminUserSearchSchema = Joi.object({
  search: Joi.string().trim().max(100),
  role: Joi.string().valid('user', 'admin', 'merchant'),
  isActive: Joi.string().valid('true', 'false'),
  status: Joi.string().valid('active', 'suspended'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const adminUserWalletSearchSchema = Joi.object({
  search: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const adminOrderSearchSchema = Joi.object({
  search: Joi.string().trim().max(100),
  status: Joi.string().trim().max(50),
  paymentStatus: Joi.string().trim().max(50),
  fulfillmentType: Joi.string().valid('delivery', 'pickup', 'drive_thru', 'dine_in'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const adminMerchantSearchSchema = Joi.object({
  search: Joi.string().trim().max(100),
  status: Joi.string().valid('pending', 'approved', 'suspended', 'rejected', 'verified'),
  isActive: Joi.string().valid('true', 'false'),
  city: Joi.string().trim().max(100),
  state: Joi.string().trim().max(100),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const adminStoreSearchSchema = Joi.object({
  search: Joi.string().trim().max(100),
  category: Joi.string().pattern(objectIdPattern).messages({
    'string.pattern.base': 'category must be a valid ObjectId',
  }),
  isActive: Joi.string().valid('true', 'false'),
  adminApproved: Joi.string().valid('true', 'false'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const adminWalletAdjustSchema = Joi.object({
  amount: Joi.number().positive().max(100000).required().messages({
    'number.positive': 'Amount must be positive',
    'number.max': 'Amount cannot exceed 100,000',
    'any.required': 'Amount is required',
  }),
  type: Joi.string().valid('credit', 'debit').required().messages({
    'any.required': 'Type (credit/debit) is required',
    'any.only': 'Type must be "credit" or "debit"',
  }),
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Reason is required',
    'string.min': 'Reason must be at least 3 characters',
  }),
});

export const adminWalletFreezeSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Reason is required to freeze a wallet',
    'string.min': 'Reason must be at least 3 characters',
  }),
});

export const adminReverseCashbackSchema = Joi.object({
  amount: Joi.number().positive().max(100000).required().messages({
    'number.positive': 'Amount must be positive',
    'number.max': 'Amount cannot exceed 100,000',
    'any.required': 'Amount is required',
  }),
  originalTransactionId: Joi.string().pattern(objectIdPattern).allow('', null),
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Reason is required',
    'string.min': 'Reason must be at least 3 characters',
  }),
});

export const adminOrderRefundSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Refund reason is required',
    'string.min': 'Reason must be at least 3 characters',
  }),
});

export const adminOrderCancelSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Cancellation reason is required',
    'string.min': 'Reason must be at least 3 characters',
  }),
});

export const adminOrderStatusSchema = Joi.object({
  status: Joi.string().trim().min(1).required().messages({
    'any.required': 'Status is required',
  }),
  notes: Joi.string().trim().max(500).allow(''),
});

export const adminOrderEscalateSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Escalation reason is required',
    'string.min': 'Reason must be at least 3 characters',
  }),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('high'),
});
