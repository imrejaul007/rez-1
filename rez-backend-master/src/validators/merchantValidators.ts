import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const phoneRegex = /^\+?[1-9]\d{1,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Merchant registration validation
export const merchantRegistrationSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
    }),
  businessName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Business name must be at least 2 characters',
      'any.required': 'Business name is required'
    }),
  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  businessType: Joi.string()
    .valid('retail', 'restaurant', 'service', 'grocery', 'fashion', 'electronics', 'other')
    .required(),
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions'
    })
});

// Merchant login validation
export const merchantLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required(),
  password: Joi.string()
    .required()
});

// Update merchant profile validation
export const updateMerchantProfileSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(200).optional(),
  businessDescription: Joi.string().trim().max(2000).optional(),
  phoneNumber: Joi.string().pattern(phoneRegex).optional(),
  website: Joi.string().uri().max(500).optional(),
  logo: Joi.string().uri().max(500).optional(),
  coverImage: Joi.string().uri().max(500).optional(),
  businessAddress: Joi.object({
    street: Joi.string().trim().max(200).required(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).required(),
    country: Joi.string().trim().max(100).required(),
    postalCode: Joi.string().trim().max(20).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional()
  }).optional(),
  businessHours: Joi.object({
    monday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional(),
    tuesday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional(),
    wednesday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional(),
    thursday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional(),
    friday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional(),
    saturday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional(),
    sunday: Joi.object({ open: Joi.string(), close: Joi.string(), closed: Joi.boolean() }).optional()
  }).optional(),
  socialMedia: Joi.object({
    facebook: Joi.string().uri().optional(),
    instagram: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    linkedin: Joi.string().uri().optional()
  }).optional()
}).min(1);

// Bank details validation (encrypted sensitive data)
export const bankDetailsSchema = Joi.object({
  accountHolderName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required(),
  accountNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{9,18}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid account number format'
    }),
  confirmAccountNumber: Joi.string()
    .valid(Joi.ref('accountNumber'))
    .required()
    .messages({
      'any.only': 'Account numbers do not match'
    }),
  ifscCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid IFSC code format'
    }),
  bankName: Joi.string()
    .trim()
    .max(200)
    .required(),
  accountType: Joi.string()
    .valid('savings', 'current', 'business')
    .required()
});

// Team member invitation validation
export const inviteTeamMemberSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required(),
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),
  role: Joi.string()
    .valid('admin', 'manager', 'staff', 'viewer')
    .required(),
  permissions: Joi.array()
    .items(Joi.string().valid(
      'products_view', 'products_edit', 'products_delete',
      'orders_view', 'orders_edit',
      'customers_view', 'customers_edit',
      'analytics_view',
      'settings_view', 'settings_edit',
      'team_manage'
    ))
    .optional()
});

// Update team member validation
export const updateTeamMemberSchema = Joi.object({
  role: Joi.string().valid('admin', 'manager', 'staff', 'viewer').optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
}).min(1);
