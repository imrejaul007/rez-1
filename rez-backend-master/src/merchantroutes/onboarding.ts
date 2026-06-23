import express, { Request, Response } from 'express';
import { OnboardingService } from '../merchantservices/OnboardingService';
import { DocumentVerificationService } from '../merchantservices/DocumentVerificationService';
import { authMiddleware as authenticateMerchant } from '../middleware/merchantauth';
import { authenticate, requireAdmin } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { logger } from '../config/logger';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

/**
 * @route   GET /api/merchant/onboarding/status
 * @desc    Get onboarding status and progress
 * @access  Private (Merchant)
 */
router.get('/status', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const status = await OnboardingService.getOnboardingStatus(merchantId);

    return res.status(200).json({
      success: true,
      data: {
        status: status.status || 'pending',
        currentStep: status.currentStep || 1,
        completedSteps: status.completedSteps || [],
        totalSteps: status.totalSteps || 5,
        progressPercentage: status.progressPercentage || 0,
        stepData: status.stepData || {},
        startedAt: status.startedAt,
        completedAt: status.completedAt,
        rejectionReason: status.rejectionReason
      }
    });
  } catch (error: any) {
    logger.error('Get onboarding status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get onboarding status',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   POST /api/merchant/onboarding/step/:stepNumber
 * @desc    Save step data (auto-save)
 * @access  Private (Merchant)
 */
router.post('/step/:stepNumber', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const stepNumber = parseInt(req.params.stepNumber);
    const stepData = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number. Must be between 1 and 5.'
      });
    }

    if (!stepData || Object.keys(stepData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Step data is required'
      });
    }

    const result = await OnboardingService.saveStepData(merchantId, stepNumber, stepData);

    return res.status(200).json({
      success: true,
      message: result.message || `Step ${stepNumber} data saved successfully`,
      data: result.stepData || {}
    });
  } catch (error: any) {
    logger.error('Save step data error:', error);
    logger.error('Step number:', req.params.stepNumber);
    logger.error('Step data received:', JSON.stringify(req.body, null, 2));
    
    // Return 400 for validation errors, 500 for server errors
    const statusCode = error.message?.includes('required') || 
                       error.message?.includes('invalid') || 
                       error.message?.includes('Invalid') ? 400 : 500;
    
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to save step data',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stepNumber: req.params.stepNumber 
      })
    });
  }
});

/**
 * @route   POST /api/merchant/onboarding/step/:stepNumber/complete
 * @desc    Complete step and move to next
 * @access  Private (Merchant)
 */
router.post('/step/:stepNumber/complete', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const stepNumber = parseInt(req.params.stepNumber);

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const result = await OnboardingService.completeStep(merchantId, stepNumber);

    res.json({
      success: true,
      message: result.message,
      data: {
        currentStep: result.currentStep,
        completedSteps: result.completedSteps,
        progressPercentage: result.progressPercentage,
        canSubmit: result.canSubmit
      }
    });
  } catch (error: any) {
    logger.error('Complete step error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete step'
    });
  }
});

/**
 * @route   POST /api/merchant/onboarding/step/:stepNumber/previous
 * @desc    Go back to previous step
 * @access  Private (Merchant)
 */
router.post('/step/:stepNumber/previous', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const stepNumber = parseInt(req.params.stepNumber);

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const result = await OnboardingService.previousStep(merchantId, stepNumber);

    res.json({
      success: true,
      data: {
        currentStep: result.currentStep
      }
    });
  } catch (error: any) {
    logger.error('Previous step error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to go to previous step'
    });
  }
});

/**
 * @route   POST /api/merchant/onboarding/submit
 * @desc    Submit onboarding for verification
 * @access  Private (Merchant)
 */
router.post('/submit', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    // Get merchantId from auth middleware - it sets req.merchantId
    const merchantId = (req as any).merchantId;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Validate that OnboardingService exists
    if (!OnboardingService || typeof OnboardingService.submitForVerification !== 'function') {
      logger.error('OnboardingService.submitForVerification not available');
      return res.status(500).json({
        success: false,
        message: 'Onboarding service is not available',
        ...(process.env.NODE_ENV === 'development' && { 
          error: 'OnboardingService.submitForVerification is not a function' 
        })
      });
    }

    const result = await OnboardingService.submitForVerification(merchantId);

    return res.status(200).json({
      success: true,
      message: result.message || 'Onboarding submitted successfully',
      data: {
        status: result.status
      }
    });
  } catch (error: any) {
    logger.error('Submit onboarding error:', error);
    logger.error('Error stack:', error.stack);
    
    // Return 400 for validation errors, 500 for server errors
    const isValidationError = error.message?.includes('required') || 
                              error.message?.includes('invalid') || 
                              error.message?.includes('missing') ||
                              error.message?.includes('must be completed') ||
                              error.message?.includes('incomplete') ||
                              error.message?.includes('not started');
    
    const statusCode = isValidationError ? 400 : 500;
    
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit onboarding',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
});

/**
 * @route   POST /api/merchant/onboarding/documents/upload
 * @desc    Upload verification document
 * @access  Private (Merchant)
 */
router.post('/documents/upload', authenticateMerchant, upload.single('document'), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const documentType = req.body.documentType;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await DocumentVerificationService.uploadDocument(
      req.file,
      merchantId,
      documentType
    );

    // Add to onboarding
    const result = await DocumentVerificationService.addDocumentToOnboarding(
      merchantId,
      documentType,
      uploadResult.url
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        document: result.document,
        uploadDetails: {
          url: uploadResult.url,
          size: uploadResult.size,
          format: uploadResult.format
        }
      }
    });
  } catch (error: any) {
    logger.error('Document upload error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload document'
    });
  }
});

/**
 * @route   GET /api/merchant/onboarding/documents
 * @desc    Get all uploaded documents
 * @access  Private (Merchant)
 */
router.get('/documents', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const result = await DocumentVerificationService.getMerchantDocuments(merchantId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get documents'
    });
  }
});

/**
 * @route   DELETE /api/merchant/onboarding/documents/:documentIndex
 * @desc    Delete a document
 * @access  Private (Merchant)
 */
router.delete('/documents/:documentIndex', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const documentIndex = parseInt(req.params.documentIndex);

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const result = await DocumentVerificationService.deleteDocument(merchantId, documentIndex);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    logger.error('Delete document error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete document'
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// Note: Admin authentication middleware should be added when admin system is implemented
// For now, these routes are protected by merchant auth with role checking
// ============================================================================

/**
 * @route   POST /api/admin/onboarding/:merchantId/approve
 * @desc    Approve merchant onboarding
 * @access  Private (Admin)
 */
router.post('/:merchantId/approve', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const adminId = (req as any).user.id;

    const result = await OnboardingService.approveOnboarding(merchantId, adminId);

    res.json({
      success: true,
      message: result.message,
      data: {
        merchantId: result.merchantId,
        storeId: result.storeId
      }
    });
  } catch (error: any) {
    logger.error('Approve onboarding error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve onboarding'
    });
  }
});

/**
 * @route   POST /api/admin/onboarding/:merchantId/reject
 * @desc    Reject merchant onboarding
 * @access  Private (Admin)
 */
router.post('/:merchantId/reject', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const adminId = (req as any).user.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const result = await OnboardingService.rejectOnboarding(merchantId, reason, adminId);

    res.json({
      success: true,
      message: result.message,
      data: {
        reason: result.reason
      }
    });
  } catch (error: any) {
    logger.error('Reject onboarding error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reject onboarding'
    });
  }
});

/**
 * @route   POST /api/admin/onboarding/:merchantId/documents/:documentIndex/verify
 * @desc    Verify a specific document
 * @access  Private (Admin)
 */
router.post('/:merchantId/documents/:documentIndex/verify', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const documentIndex = parseInt(req.params.documentIndex);
    const adminId = (req as any).user.id;
    const { approved, rejectionReason } = req.body;

    if (approved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Approved status is required'
      });
    }

    const result = await DocumentVerificationService.verifyDocument(
      merchantId,
      documentIndex,
      adminId,
      approved,
      rejectionReason
    );

    res.json({
      success: true,
      message: approved ? 'Document verified successfully' : 'Document rejected',
      data: result
    });
  } catch (error: any) {
    logger.error('Verify document error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify document'
    });
  }
});

/**
 * @route   POST /api/admin/onboarding/:merchantId/documents/verify-all
 * @desc    Verify all documents at once
 * @access  Private (Admin)
 */
router.post('/:merchantId/documents/verify-all', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const adminId = (req as any).user.id;
    const { approved, rejectionReason } = req.body;

    if (approved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Approved status is required'
      });
    }

    const result = await DocumentVerificationService.verifyAllDocuments(
      merchantId,
      adminId,
      approved,
      rejectionReason
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        verificationStatus: result.verificationStatus,
        totalDocuments: result.totalDocuments
      }
    });
  } catch (error: any) {
    logger.error('Verify all documents error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify documents'
    });
  }
});

/**
 * @route   POST /api/admin/onboarding/:merchantId/request-documents
 * @desc    Request additional documents from merchant
 * @access  Private (Admin)
 */
router.post('/:merchantId/request-documents', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const { documentTypes, message } = req.body;

    if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Document types array is required'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const result = await DocumentVerificationService.requestAdditionalDocuments(
      merchantId,
      documentTypes,
      message
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        requestedDocuments: result.requestedDocuments
      }
    });
  } catch (error: any) {
    logger.error('Request documents error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to request documents'
    });
  }
});

/**
 * @route   GET /api/admin/onboarding/pending
 * @desc    Get all pending onboarding verifications
 * @access  Private (Admin)
 */
router.get('/pending', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const pendingVerifications = await DocumentVerificationService.getPendingVerifications(limit);

    res.json({
      success: true,
      data: pendingVerifications,
      count: pendingVerifications.length
    });
  } catch (error: any) {
    logger.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pending verifications'
    });
  }
});

/**
 * @route   GET /api/admin/onboarding/analytics
 * @desc    Get onboarding analytics
 * @access  Private (Admin)
 */
router.get('/analytics', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const analytics = await OnboardingService.getOnboardingAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    logger.error('Get onboarding analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get analytics'
    });
  }
});

/**
 * @route   GET /api/admin/onboarding/documents/statistics
 * @desc    Get document verification statistics
 * @access  Private (Admin)
 */
router.get('/documents/statistics', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    const statistics = await DocumentVerificationService.getDocumentStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    logger.error('Get document statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get statistics'
    });
  }
});

export default router;
