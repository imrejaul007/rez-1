import { Router } from 'express';
import { Types } from 'mongoose';
import {
  getUserProducts,
  getProductDetails,
  getExpiringWarranties,
  getExpiringAMC,
  registerProduct,
  scheduleInstallation,
  renewAMC,
  getWarrantyDetails,
  getAMCDetails,
  createServiceRequest,
  getServiceRequests,
  getServiceRequestDetails,
  cancelServiceRequest,
  rescheduleServiceRequest,
  rateServiceRequest,
  getActiveServiceRequests,
} from '../controllers/userProductController';
import { authenticate } from '../middleware/auth';
import { validateQuery, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// ============================================================================
// USER PRODUCT ROUTES
// ============================================================================

// Get user's products
router.get('/',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('active', 'warranty_expired', 'returned', 'replaced'),
    category: Joi.string(),
    hasWarranty: Joi.string().valid('true', 'false'),
    hasAMC: Joi.string().valid('true', 'false'),
  })),
  getUserProducts
);

// Get products with expiring warranties
router.get('/expiring-warranties',
  authenticate,
  validateQuery(Joi.object({
    days: Joi.number().integer().min(1).max(365).default(30),
  })),
  getExpiringWarranties
);

// Get products with expiring AMC
router.get('/expiring-amc',
  authenticate,
  validateQuery(Joi.object({
    days: Joi.number().integer().min(1).max(365).default(30),
  })),
  getExpiringAMC
);

// Get product details — Phase 23 fix: validate :id is a valid ObjectId before
// the controller tries `new Types.ObjectId(id)` (which throws on non-hex strings).
// This was causing 500 on paths like /user-products/service-requests where the
// catch-all /:id matched the literal text "service-requests".
router.get('/:id',
  authenticate,
  (req, res, next) => {
    if (!req.params.id || !Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    next();
  },
  getProductDetails
);

// Get warranty details
router.get('/:id/warranty',
  authenticate,
  getWarrantyDetails
);

// Get AMC details
router.get('/:id/amc',
  authenticate,
  getAMCDetails
);

// Register product
router.post('/:id/register',
  authenticate,
  validate(Joi.object({
    serialNumber: Joi.string().required(),
    registrationNumber: Joi.string(),
  })),
  registerProduct
);

// Schedule installation
router.post('/:id/schedule-installation',
  authenticate,
  validate(Joi.object({
    scheduledDate: Joi.date().iso().required(),
    technician: Joi.string(),
    notes: Joi.string(),
  })),
  scheduleInstallation
);

// Renew AMC
router.post('/:id/renew-amc',
  authenticate,
  validate(Joi.object({
    duration: Joi.number().integer().min(1).max(60).required(), // months
    amount: Joi.number().min(0).required(),
  })),
  renewAMC
);

// ============================================================================
// SERVICE REQUEST ROUTES
// ============================================================================

// Create service request
router.post('/service-requests',
  authenticate,
  validate(Joi.object({
    userProductId: Joi.string().required(),
    productId: Joi.string().required(),
    requestType: Joi.string().valid('repair', 'replacement', 'installation', 'maintenance', 'inspection').required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    issueDescription: Joi.string().required(),
    issueCategory: Joi.string(),
    images: Joi.array().items(Joi.string()),
    addressId: Joi.string().required(),
    estimatedCost: Joi.number().min(0),
  })),
  createServiceRequest
);

// Get active service requests
router.get('/service-requests/active',
  authenticate,
  getActiveServiceRequests
);

// Get service requests
router.get('/service-requests',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'scheduled', 'in_progress', 'completed', 'cancelled'),
    requestType: Joi.string().valid('repair', 'replacement', 'installation', 'maintenance', 'inspection'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  })),
  getServiceRequests
);

// Get service request details
router.get('/service-requests/:id',
  authenticate,
  getServiceRequestDetails
);

// Cancel service request
router.post('/service-requests/:id/cancel',
  authenticate,
  validate(Joi.object({
    reason: Joi.string().required(),
  })),
  cancelServiceRequest
);

// Reschedule service request
router.post('/service-requests/:id/reschedule',
  authenticate,
  validate(Joi.object({
    newDate: Joi.date().iso().required(),
    newTimeSlot: Joi.string().required(),
  })),
  rescheduleServiceRequest
);

// Rate service request
router.post('/service-requests/:id/rate',
  authenticate,
  validate(Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string(),
  })),
  rateServiceRequest
);

export default router;
