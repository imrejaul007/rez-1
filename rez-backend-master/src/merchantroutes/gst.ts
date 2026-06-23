import { Router, Request, Response, NextFunction } from 'express';
import { exportGSTR1 } from '../controllers/merchant/gstr1Controller';
import { exportGSTR3B } from '../controllers/merchant/gstr3bController';
import { authMiddleware } from '../middleware/merchantauth';
import Joi from 'joi';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation schemas
const gstr1Schema = Joi.object({
  storeId: Joi.string().hex().length(24).required(),
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required(),
  format: Joi.string().valid('json', 'csv').default('json'),
});

// Validation middleware helper
const validateQuery = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  req.query = value as any;
  next();
};

router.get('/gst/gstr1', validateQuery(gstr1Schema), exportGSTR1);
router.get('/gst/gstr3b', validateQuery(gstr1Schema), exportGSTR3B);

export default router;
