import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Create order validation
export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(Joi.object({
      product: Joi.string().pattern(objectIdPattern).required(),
      variant: Joi.string().pattern(objectIdPattern).optional(),
      quantity: Joi.number().integer().min(1).max(999).required(),
      price: Joi.number().positive().precision(2).required()
    }))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'Order must contain at least one item',
      'array.max': 'Maximum 50 items per order'
    }),
  shippingAddress: Joi.string()
    .pattern(objectIdPattern)
    .required(),
  billingAddress: Joi.string()
    .pattern(objectIdPattern)
    .optional(),
  paymentMethod: Joi.string()
    .valid('cod', 'online', 'wallet', 'razorpay', 'stripe', 'paypal')
    .required(),
  paymentDetails: Joi.object({
    transactionId: Joi.string().trim().max(255).optional(),
    paymentGateway: Joi.string().trim().max(50).optional(),
    paymentStatus: Joi.string().valid('pending', 'completed', 'failed').optional()
  }).optional(),
  couponCode: Joi.string()
    .trim()
    .uppercase()
    .max(50)
    .optional(),
  notes: Joi.string()
    .trim()
    .max(500)
    .optional(),
  useWalletBalance: Joi.boolean()
    .default(false)
});

// Update order status validation
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded')
    .required(),
  notes: Joi.string()
    .trim()
    .max(500)
    .optional(),
  trackingNumber: Joi.string()
    .trim()
    .max(100)
    .optional(),
  carrier: Joi.string()
    .trim()
    .max(100)
    .optional()
});

// Query orders validation
export const queryOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('createdAt', '-createdAt', 'total', '-total', 'status').default('-createdAt'),
  status: Joi.string().valid('placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded').optional(),
  paymentMethod: Joi.string().valid('cod', 'online', 'wallet', 'razorpay', 'stripe', 'paypal').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  minAmount: Joi.number().positive().precision(2).optional(),
  maxAmount: Joi.number().positive().precision(2).optional()
});

// Cancel order validation
export const cancelOrderSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Cancellation reason must be at least 10 characters',
      'any.required': 'Cancellation reason is required'
    })
});

// Return/Refund request validation
export const returnRequestSchema = Joi.object({
  items: Joi.array()
    .items(Joi.object({
      orderItem: Joi.string().pattern(objectIdPattern).required(),
      quantity: Joi.number().integer().min(1).required(),
      reason: Joi.string().trim().max(500).required()
    }))
    .min(1)
    .required(),
  returnType: Joi.string()
    .valid('return', 'exchange', 'refund')
    .required(),
  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
});
