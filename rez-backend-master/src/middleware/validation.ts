import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

// S-22: Fields that must NEVER be logged. Redact these from any object
// before it lands in the structured log store (Winston with daily-rotate-file).
const SENSITIVE_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'otp',
  'otpCode',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cardNumber',
  'cvv',
  'pin',
  'card',
  'razorpay_signature',
  'stripeSignature',
  'cookie',
  'set-cookie',
]);

function sanitizeForLog<T extends Record<string, any>>(input: T, depth = 0): Record<string, any> {
  if (!input || typeof input !== 'object' || depth > 3) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_FIELDS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizeForLog(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// S-11: Helper to strip HTML tags from strings to prevent stored XSS
const stripHtmlTags = (value: string): string => {
  return value.replace(/<[^>]*>/g, '').trim();
};

// Custom Joi extension for sanitized strings (strips HTML tags)
const sanitizedString = () => Joi.string().custom((value, helpers) => {
  if (typeof value === 'string') {
    const sanitized = stripHtmlTags(value);
    if (sanitized !== value) {
      return sanitized;
    }
  }
  return value;
}, 'HTML tag stripping');

// Generic validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,  // Remove unknown fields
      allowUnknown: false  // Don't allow unknown fields after stripping
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      // SECURITY: never log req.body verbatim — it may contain passwords,
      // OTPs, payment tokens, or PII. Redact sensitive fields first.
      logger.info('[VALIDATION ERROR]', JSON.stringify({ body: sanitizeForLog(req.body as any), errors }, null, 2));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Use validated/sanitized values
    req.body = value;
    next();
  };
};

// Query validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }
    
    next();
  };
};

// Parameters validation middleware
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors
      });
    }
    
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId validation
 objectId: () => Joi.string().hex().length(24).message('Invalid ID format'),
  
  // Pagination
 pagination: () => ({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid(
      'createdAt', '-createdAt',
      'updatedAt', '-updatedAt',
      'name', '-name'
    ),
    search: Joi.string().trim().max(100)
  }),
  
  // S-12: Phone number (E.164 format) - requires country code prefix (+) and 10-15 digits total
  // Supports various country codes including UAE (+971), India (+91), US (+1), etc.
  phoneNumber: Joi.string()
    .pattern(/^\+[1-9]\d{9,14}$/)
    .message('Invalid phone number format. Must start with + followed by country code and number (10-15 digits total).'),
  
  // Email
  email: Joi.string().email().lowercase(),
  
  // OTP
  otp: Joi.string().pattern(/^\d{6}$/).message('OTP must be 6 digits'),
  
  // Password (for social login or password-based auth)
  // S-10: Require min 8 chars with at least one uppercase, one lowercase, and one digit
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  // Coordinates [longitude, latitude]
  coordinates: Joi.array().items(Joi.number().min(-180).max(180)).length(2),
  
  // Rating (1-5)
  rating: Joi.number().min(1).max(5),
  
  // Price
  price: Joi.number().min(0).precision(2),
  
  // Quantity
  quantity: Joi.number().integer().min(1).max(99)
};

// Authentication validation schemas
export const authSchemas = {
  // For sign-in/login flow - only phone number required, email and referral are optional
  sendOTP: Joi.object({
    phoneNumber: commonSchemas.phoneNumber.required(),
    email: Joi.alternatives().try(
      Joi.string().valid('', null),
      Joi.string().email().lowercase()
    ).optional(),
    referralCode: Joi.alternatives().try(
      Joi.string().valid('', null),
      Joi.string().trim().uppercase().min(6).max(10)
    ).optional()
  }),
  
  verifyOTP: Joi.object({
    phoneNumber: commonSchemas.phoneNumber.required(),
    otp: commonSchemas.otp.required()
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    profile: Joi.object({
      // S-11: Use sanitizedString() for user-facing text fields to strip HTML tags (prevent stored XSS)
      firstName: sanitizedString().trim().max(50),
      lastName: sanitizedString().trim().max(50),
      avatar: Joi.string().uri().allow(null, ''),
      bio: sanitizedString().trim().max(500),
      website: Joi.string().uri().allow(null, ''),
      dateOfBirth: Joi.date().iso().max('now'),
      gender: Joi.string().valid('male', 'female', 'other'),
      location: Joi.object({
        address: sanitizedString().trim().max(200),
        city: sanitizedString().trim().max(50),
        state: sanitizedString().trim().max(50),
        pincode: Joi.string().pattern(/^\d{6}$/).message('Invalid pincode format'),
        coordinates: commonSchemas.coordinates
      })
    }),
    preferences: Joi.object({
      language: Joi.string().valid('en', 'hi', 'te', 'ta', 'bn'),
      theme: Joi.string().valid('light', 'dark'),
      notifications: Joi.object({
        push: Joi.boolean(),
        email: Joi.boolean(),
        sms: Joi.boolean()
      }),
      emailNotifications: Joi.boolean(),
      pushNotifications: Joi.boolean(),
      smsNotifications: Joi.boolean()
    }),
    statedIdentity: Joi.string().valid('student', 'corporate', 'other', 'general')
  })
};

// Product validation schemas
export const productSchemas = {
  getProducts: Joi.object({
    category: Joi.string().trim().max(100), // Allow category slug (string) or ObjectId
    store: commonSchemas.objectId(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    rating: Joi.number().min(1).max(5),
    inStock: Joi.boolean(),
    featured: Joi.boolean(),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest', 'popular'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name'),
    // Vibe/Tag filtering for Shop by Vibe feature
    tags: Joi.string().trim().max(100),
    // Occasion filtering for Shop by Occasion feature
    occasion: Joi.string().trim().max(100),
    // Brand filtering
    brand: Joi.string().trim().max(100),
    // Mode system filter (4-mode system)
    mode: Joi.string().valid('near-u', 'explore', 'deals', 'premium'),
    // Region filter
    region: Joi.string().valid('bangalore', 'dubai'),
    // Diversity enhancement fields
    excludeProducts: Joi.string().optional().pattern(/^[0-9a-fA-F]{24}(,[0-9a-fA-F]{24})*$/).messages({
      'string.pattern.base': 'excludeProducts must be comma-separated valid MongoDB ObjectIds'
    }),
    diversityMode: Joi.string().valid('balanced', 'category_diverse', 'price_diverse', 'none').default('none').messages({
      'any.only': 'diversityMode must be one of: balanced, category_diverse, price_diverse, none'
    })
  })
};

// Cart validation schemas
export const cartSchemas = {
  addToCart: Joi.object({
    productId: commonSchemas.objectId().required(),
    quantity: commonSchemas.quantity.required(),
    variant: Joi.object({
      type: Joi.string().required(),
      value: Joi.string().required()
    }),
    itemType: Joi.string().valid('product', 'service', 'event').optional(),
    serviceBookingDetails: Joi.object({
      bookingDate: Joi.string().isoDate().required(),
      timeSlot: Joi.object({
        start: Joi.string().required(),
        end: Joi.string().required()
      }).required(),
      duration: Joi.number().optional(),
      serviceType: Joi.string().valid('home', 'store', 'online').optional(),
      customerNotes: Joi.string().allow('').optional(),
      customerName: Joi.string().optional(),
      customerPhone: Joi.string().optional(),
      customerEmail: Joi.string().email().allow('').optional()
    }).optional(),
    metadata: Joi.object({
      storeId: Joi.string().optional(),
      slotId: Joi.string().optional()
    }).unknown(true).optional()
  }),
  
  updateCartItem: Joi.object({
    quantity: commonSchemas.quantity.required()
  }),
  
  applyCoupon: Joi.object({
    couponCode: Joi.string().trim().uppercase().required()
  })
};

// Order validation schemas
const deliveryAddressFull = Joi.object({
  name: Joi.string().trim().max(50).required(),
  phone: Joi.string().trim().min(10).max(15).required(),
  addressLine1: Joi.string().trim().max(200).required(),
  addressLine2: Joi.string().trim().max(200).allow(''),
  city: Joi.string().trim().max(50).required(),
  state: Joi.string().trim().max(50).required(),
  pincode: Joi.string().pattern(/^\d{6}$/).required(),
  landmark: Joi.string().trim().max(100).allow(''),
  addressType: Joi.string().valid('home', 'work', 'other')
});

const deliveryAddressMinimal = Joi.object({
  name: Joi.string().trim().max(50).required(),
  phone: Joi.string().trim().min(10).max(15).required(),
  addressLine1: Joi.string().trim().max(200).allow('').optional(),
  addressLine2: Joi.string().trim().max(200).allow('').optional(),
  city: Joi.string().trim().max(50).allow('').optional(),
  state: Joi.string().trim().max(50).allow('').optional(),
  pincode: Joi.string().allow('').optional(),
  landmark: Joi.string().trim().max(100).allow('').optional(),
  addressType: Joi.string().valid('home', 'work', 'other').optional()
});

export const orderSchemas = {
  createOrder: Joi.object({
    fulfillmentType: Joi.string().valid('delivery', 'pickup', 'drive_thru', 'dine_in').default('delivery'),
    fulfillmentDetails: Joi.object({
      tableNumber: Joi.string().trim().max(20).optional(),
      vehicleInfo: Joi.string().trim().max(100).optional(),
      pickupInstructions: Joi.string().trim().max(500).allow('').optional()
    }).optional(),
    deliveryAddress: Joi.when('fulfillmentType', {
      is: 'delivery',
      then: deliveryAddressFull.required(),
      otherwise: Joi.alternatives().try(deliveryAddressMinimal, Joi.any().strip()).optional()
    }),
    paymentMethod: Joi.string().valid('wallet', 'card', 'upi', 'cod', 'razorpay').required(),
    specialInstructions: Joi.string().trim().max(500).allow(''),
    couponCode: Joi.string().trim().uppercase(),
    coinsUsed: Joi.object({
      rezCoins: Joi.number().min(0).default(0),
      wasilCoins: Joi.number().min(0).default(0),
      promoCoins: Joi.number().min(0).default(0),
      storePromoCoins: Joi.number().min(0).default(0),
      totalCoinsValue: Joi.number().min(0).default(0)
    }),
    storeId: Joi.string().trim().optional(),
    items: Joi.array().items(Joi.object({
      product: Joi.string().trim().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().min(0).required(),
      name: Joi.string().trim().optional()
    })).optional(),
    redemptionCode: Joi.string().trim().uppercase().optional(),
    offerRedemptionCode: Joi.string().trim().uppercase().optional(),
    lockFeeDiscount: Joi.number().min(0).optional()
  })
};

// Review validation schemas
export const reviewSchemas = {
  createReview: Joi.object({
    targetType: Joi.string().valid('Product', 'Store', 'Video').required(),
    targetId: commonSchemas.objectId().required(),
    rating: commonSchemas.rating.required(),
    title: Joi.string().trim().max(100),
    content: Joi.string().trim().min(10).max(2000).required(),
    pros: Joi.array().items(Joi.string().trim().max(200)),
    cons: Joi.array().items(Joi.string().trim().max(200)),
    tags: Joi.array().items(Joi.string().trim().lowercase()),
    isAnonymous: Joi.boolean().default(false)
  }),
  
  replyToReview: Joi.object({
    content: Joi.string().trim().min(10).max(1000).required()
  })
};

// Notification validation schemas
export const notificationSchemas = {
  markAsRead: Joi.object({
    notificationIds: Joi.array().items(commonSchemas.objectId())
  })
};

// Wishlist validation schemas
export const wishlistSchemas = {
  createWishlist: Joi.object({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500),
    category: Joi.string().valid('personal', 'gift', 'business', 'event', 'custom').default('personal'),
    isPublic: Joi.boolean().default(false)
  }),
  
  addToWishlist: Joi.object({
    // Accept both lowercase and capitalized itemType (frontend sends lowercase, backend normalizes)
    itemType: Joi.string().valid('Product', 'Store', 'Video', 'product', 'store', 'video').required(),
    itemId: commonSchemas.objectId().required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    notes: Joi.string().trim().max(300),
    targetPrice: commonSchemas.price,
    notifyOnPriceChange: Joi.boolean().default(true),
    notifyOnAvailability: Joi.boolean().default(true),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })
};

// Video validation schemas
export const videoSchemas = {
  getVideos: Joi.object({
    category: Joi.string().trim().max(100),
    contentType: Joi.string().valid('merchant', 'ugc', 'article_video'),
    status: Joi.string().valid('approved', 'pending', 'rejected'),
    creator: commonSchemas.objectId(),
    hasProducts: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false').custom((value) => value === 'true')
    ),
    search: Joi.string().trim().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name'),
    sortBy: Joi.string().valid('trending', 'newest', 'popular', 'views', 'likes')
  })
};

// Alias for validate (commonly used name)
export const validateBody = validate;

// Export validation middleware with common schemas
export { Joi };