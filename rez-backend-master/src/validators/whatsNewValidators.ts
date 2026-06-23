import Joi from 'joi';

// Slide schema
const slideSchema = Joi.object({
  image: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Slide image must be a valid URL',
      'any.required': 'Slide image is required',
    }),
  backgroundColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .default('#000000')
    .messages({
      'string.pattern.base': 'Background color must be a valid hex color',
    }),
  overlayText: Joi.string()
    .max(200)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Overlay text cannot exceed 200 characters',
    }),
  duration: Joi.number()
    .min(1000)
    .max(30000)
    .default(5000)
    .messages({
      'number.min': 'Duration must be at least 1 second (1000ms)',
      'number.max': 'Duration cannot exceed 30 seconds (30000ms)',
    }),
});

// CTA button schema
const ctaButtonSchema = Joi.object({
  text: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'CTA text cannot exceed 50 characters',
      'any.required': 'CTA text is required',
    }),
  action: Joi.string()
    .valid('link', 'screen', 'deeplink')
    .default('screen')
    .messages({
      'any.only': 'CTA action must be one of: link, screen, deeplink',
    }),
  target: Joi.string()
    .required()
    .messages({
      'any.required': 'CTA target is required',
    }),
});

// Validity schema
const validitySchema = Joi.object({
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required',
    }),
  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required',
    }),
  isActive: Joi.boolean()
    .default(true),
});

// Targeting schema
const targetingSchema = Joi.object({
  userTypes: Joi.array()
    .items(Joi.string().valid('new', 'returning', 'premium', 'all'))
    .optional(),
  locations: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  categories: Joi.array()
    .items(Joi.string().trim())
    .optional(),
});

// Create story validation
export const createStorySchema = Joi.object({
  title: Joi.string()
    .max(100)
    .required()
    .messages({
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required',
    }),
  subtitle: Joi.string()
    .max(200)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Subtitle cannot exceed 200 characters',
    }),
  icon: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Icon must be a valid URL',
      'any.required': 'Icon is required',
    }),
  slides: Joi.array()
    .items(slideSchema)
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one slide is required',
      'array.max': 'Maximum 10 slides allowed',
      'any.required': 'Slides are required',
    }),
  ctaButton: ctaButtonSchema.optional(),
  validity: validitySchema.required(),
  targeting: targetingSchema.optional(),
  priority: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Priority cannot be negative',
    }),
});

// Update story validation (all fields optional)
export const updateStorySchema = Joi.object({
  title: Joi.string()
    .max(100)
    .optional(),
  subtitle: Joi.string()
    .max(200)
    .allow('')
    .optional(),
  icon: Joi.string()
    .uri()
    .optional(),
  slides: Joi.array()
    .items(slideSchema)
    .min(1)
    .max(10)
    .optional(),
  ctaButton: ctaButtonSchema.optional().allow(null),
  validity: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    isActive: Joi.boolean().optional(),
  }).optional(),
  targeting: targetingSchema.optional().allow(null),
  priority: Joi.number()
    .integer()
    .min(0)
    .optional(),
});

// Query params validation
export const getStoriesQuerySchema = Joi.object({
  includeViewed: Joi.string()
    .valid('true', 'false')
    .default('true'),
});

// ID param validation
export const storyIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid story ID format',
      'any.required': 'Story ID is required',
    }),
});
