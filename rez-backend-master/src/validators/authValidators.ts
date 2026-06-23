import Joi from 'joi';

// Phone number validation (international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Password strength requirements
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  });

// OTP validation
const otpSchema = Joi.string()
  .length(6)
  .pattern(/^\d{6}$/)
  .messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers'
  });

// Registration validation
export const registrationSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required'
    }),
  countryCode: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .default('+971')
    .messages({
      'string.pattern.base': 'Invalid country code format'
    }),
  deviceId: Joi.string()
    .trim()
    .max(255)
    .optional(),
  fcmToken: Joi.string()
    .trim()
    .max(500)
    .optional()
});

// Login validation
export const loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required'
    }),
  countryCode: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .default('+971')
});

// OTP verification validation
export const verifyOTPSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .required(),
  otp: otpSchema.required(),
  deviceId: Joi.string()
    .trim()
    .max(255)
    .optional()
});

// Resend OTP validation
export const resendOTPSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(phoneRegex)
    .required()
});

// Refresh token validation
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Password change validation
export const changePasswordSchema = Joi.object({
  currentPassword: passwordSchema.required(),
  newPassword: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

// Email update validation
export const updateEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    })
});

// Profile update validation
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(255)
    .optional(),
  dateOfBirth: Joi.date()
    .max('now')
    .optional(),
  gender: Joi.string()
    .valid('male', 'female', 'other', 'prefer_not_to_say')
    .optional(),
  profilePicture: Joi.string()
    .uri()
    .optional()
});

// Logout validation
export const logoutSchema = Joi.object({
  deviceId: Joi.string()
    .trim()
    .max(255)
    .optional(),
  allDevices: Joi.boolean()
    .default(false)
});
