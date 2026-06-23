import { Merchant } from '../models/Merchant';
import { EmailService } from '../services/EmailService';
import { logger } from '../config/logger';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryCircuit } from '../utils/circuitBreaker';

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Cloudinary upload timeout (30s default)
const CLOUDINARY_UPLOAD_TIMEOUT_MS = parseInt(
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '30000',
  10
);

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[CLOUDINARY] ${label} timed out after ${ms}ms`)), ms);
    if (timer && typeof (timer as any).unref === 'function') (timer as any).unref();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface DocumentUploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
}

export interface DocumentVerificationResult {
  documentId: string;
  status: 'verified' | 'rejected';
  rejectionReason?: string;
  verifiedBy: string;
  verifiedAt: Date;
}

/**
 * DocumentVerificationService
 * Handles document upload, storage, and verification workflow
 */
export class DocumentVerificationService {
  /**
   * Upload document to Cloudinary
   */
  static async uploadDocument(
    file: any,
    merchantId: string,
    documentType: string
  ): Promise<DocumentUploadResult> {
    try {
      // Validate document type
      const validTypes = ['business_license', 'id_proof', 'address_proof', 'gst_certificate', 'pan_card'];
      if (!validTypes.includes(documentType)) {
        throw new Error(`Invalid document type: ${documentType}`);
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Validate file type (images and PDFs only)
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf'
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only images and PDFs are allowed');
      }

      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        logger.info('⚠️ Cloudinary not configured - using mock upload');
        return {
          url: `https://mock-storage.com/documents/${merchantId}/${documentType}_${Date.now()}.${file.mimetype.split('/')[1]}`,
          publicId: `merchant_docs/${merchantId}/${documentType}_${Date.now()}`,
          format: file.mimetype.split('/')[1],
          size: file.size
        };
      }

      // Upload to Cloudinary (with circuit breaker + timeout)
      const result = await cloudinaryCircuit.exec(() =>
        withTimeout(
          cloudinary.uploader.upload(file.path, {
            folder: `merchant_documents/${merchantId}`,
            resource_type: 'auto',
            public_id: `${documentType}_${Date.now()}`,
            tags: [merchantId, documentType, 'onboarding'],
          }),
          CLOUDINARY_UPLOAD_TIMEOUT_MS,
          `uploader.upload_doc(${file.path})`
        )
      );

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes
      };
    } catch (error: any) {
      logger.error('Document upload error:', error);
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  /**
   * Add document to merchant onboarding
   */
  static async addDocumentToOnboarding(
    merchantId: string,
    documentType: string,
    documentUrl: string
  ): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Initialize onboarding if needed
    if (!merchant.onboarding) {
      merchant.onboarding = {
        status: 'in_progress',
        currentStep: 5,
        completedSteps: [],
        stepData: {}
      };
    }

    // Initialize verification step data
    if (!merchant.onboarding.stepData.verification) {
      merchant.onboarding.stepData.verification = {
        documents: [],
        verificationStatus: 'pending'
      };
    }

    // Add document
    merchant.onboarding.stepData.verification.documents.push({
      type: documentType,
      url: documentUrl,
      status: 'pending',
      uploadedAt: new Date()
    });

    await merchant.save();

    return {
      success: true,
      message: 'Document added successfully',
      document: {
        type: documentType,
        url: documentUrl,
        status: 'pending'
      }
    };
  }

  /**
   * Get all documents for a merchant
   */
  static async getMerchantDocuments(merchantId: string): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding || !merchant.onboarding.stepData.verification) {
      return {
        documents: [],
        verificationStatus: 'pending'
      };
    }

    return {
      documents: merchant.onboarding.stepData.verification.documents || [],
      verificationStatus: merchant.onboarding.stepData.verification.verificationStatus || 'pending'
    };
  }

  /**
   * Verify a document (Admin only)
   */
  static async verifyDocument(
    merchantId: string,
    documentIndex: number,
    adminId: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<DocumentVerificationResult> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding || !merchant.onboarding.stepData.verification) {
      throw new Error('No documents found for verification');
    }

    const documents = merchant.onboarding.stepData.verification.documents;

    if (documentIndex < 0 || documentIndex >= documents.length) {
      throw new Error('Invalid document index');
    }

    // Update document status
    documents[documentIndex].status = approved ? 'verified' : 'rejected';

    if (!approved && rejectionReason) {
      documents[documentIndex].rejectionReason = rejectionReason;
    }

    // Check if all documents are verified
    const allVerified = documents.every((doc: any) => doc.status === 'verified');
    const anyRejected = documents.some((doc: any) => doc.status === 'rejected');

    if (allVerified) {
      merchant.onboarding.stepData.verification.verificationStatus = 'verified';
      merchant.onboarding.stepData.verification.verifiedAt = new Date();
      merchant.onboarding.stepData.verification.verifiedBy = adminId;
    } else if (anyRejected) {
      merchant.onboarding.stepData.verification.verificationStatus = 'rejected';
    }

    await merchant.save();

    // Send notification email
    await this.sendDocumentVerificationEmail(
      merchant,
      documents[documentIndex],
      approved
    );

    return {
      documentId: documentIndex.toString(),
      status: approved ? 'verified' : 'rejected',
      rejectionReason: approved ? undefined : rejectionReason,
      verifiedBy: adminId,
      verifiedAt: new Date()
    };
  }

  /**
   * Verify all documents at once (Admin only)
   */
  static async verifyAllDocuments(
    merchantId: string,
    adminId: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding || !merchant.onboarding.stepData.verification) {
      throw new Error('No documents found for verification');
    }

    const documents = merchant.onboarding.stepData.verification.documents;

    // Update all document statuses
    documents.forEach((doc: any) => {
      doc.status = approved ? 'verified' : 'rejected';
      if (!approved && rejectionReason) {
        doc.rejectionReason = rejectionReason;
      }
    });

    // Update verification status
    merchant.onboarding.stepData.verification.verificationStatus = approved ? 'verified' : 'rejected';
    merchant.onboarding.stepData.verification.verifiedAt = new Date();
    merchant.onboarding.stepData.verification.verifiedBy = adminId;

    await merchant.save();

    // Send notification email
    await EmailService.sendDocumentVerificationComplete(
      merchant.email,
      merchant.ownerName,
      approved,
      rejectionReason
    );

    return {
      success: true,
      message: approved ? 'All documents verified successfully' : 'Documents rejected',
      verificationStatus: approved ? 'verified' : 'rejected',
      totalDocuments: documents.length
    };
  }

  /**
   * Request additional documents (Admin only)
   */
  static async requestAdditionalDocuments(
    merchantId: string,
    documentTypes: string[],
    message: string
  ): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Send email to merchant
    await EmailService.sendAdditionalDocumentsRequest(
      merchant.email,
      merchant.ownerName,
      documentTypes,
      message
    );

    return {
      success: true,
      message: 'Document request sent to merchant',
      requestedDocuments: documentTypes
    };
  }

  /**
   * Delete a document
   */
  static async deleteDocument(
    merchantId: string,
    documentIndex: number
  ): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding || !merchant.onboarding.stepData.verification) {
      throw new Error('No documents found');
    }

    const documents = merchant.onboarding.stepData.verification.documents;

    if (documentIndex < 0 || documentIndex >= documents.length) {
      throw new Error('Invalid document index');
    }

    // Get document URL for Cloudinary deletion
    const documentUrl = documents[documentIndex].url;

    // Remove from array
    documents.splice(documentIndex, 1);

    await merchant.save();

    // Try to delete from Cloudinary
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME && documentUrl.includes('cloudinary')) {
        const publicId = this.extractPublicIdFromUrl(documentUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (error) {
      logger.error('Error deleting from Cloudinary:', error);
      // Continue even if Cloudinary deletion fails
    }

    return {
      success: true,
      message: 'Document deleted successfully'
    };
  }

  /**
   * Get pending verifications (Admin)
   */
  static async getPendingVerifications(limit: number = 50): Promise<any> {
    const merchants = await Merchant.find({
      'onboarding.stepData.verification.verificationStatus': 'pending'
    })
      .select('businessName ownerName email onboarding createdAt')
      .limit(limit)
      .sort({ 'onboarding.completedAt': -1 });

    return merchants.map(merchant => ({
      merchantId: merchant._id,
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      email: merchant.email,
      submittedAt: merchant.onboarding?.completedAt,
      documentsCount: merchant.onboarding?.stepData?.verification?.documents?.length || 0,
      onboardingStatus: merchant.onboarding?.status
    }));
  }

  /**
   * OCR document extraction (Placeholder for future implementation)
   */
  static async extractDocumentData(documentUrl: string, documentType: string): Promise<any> {
    // Placeholder for OCR integration (Tesseract, Google Vision, AWS Textract, etc.)
    logger.info('📄 OCR extraction placeholder called for:', documentType);

    // Return mock data for now
    return {
      extracted: false,
      message: 'OCR integration not yet implemented',
      documentType,
      suggestedData: {}
    };
  }

  /**
   * Validate document authenticity (Placeholder for future implementation)
   */
  static async validateDocumentAuthenticity(
    documentType: string,
    documentNumber: string
  ): Promise<any> {
    // Placeholder for document validation APIs (GST verification, PAN verification, etc.)
    logger.info('🔍 Document validation placeholder called for:', documentType, documentNumber);

    return {
      validated: false,
      message: 'Document validation API not yet integrated',
      documentType
    };
  }

  /**
   * Helper: Extract Cloudinary public ID from URL
   */
  private static extractPublicIdFromUrl(url: string): string | null {
    try {
      const matches = url.match(/\/v\d+\/(.+)\.[a-z]{3,4}$/i);
      return matches ? matches[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Send document verification email
   */
  private static async sendDocumentVerificationEmail(
    merchant: any,
    document: any,
    approved: boolean
  ): Promise<void> {
    const documentTypeNames: any = {
      business_license: 'Business License',
      id_proof: 'ID Proof',
      address_proof: 'Address Proof',
      gst_certificate: 'GST Certificate',
      pan_card: 'PAN Card'
    };

    const documentName = documentTypeNames[document.type] || document.type;

    if (approved) {
      await EmailService.sendDocumentApproved(
        merchant.email,
        merchant.ownerName,
        documentName
      );
    } else {
      await EmailService.sendDocumentRejected(
        merchant.email,
        merchant.ownerName,
        documentName,
        document.rejectionReason || 'Document does not meet requirements'
      );
    }
  }

  /**
   * Get document statistics (Admin)
   */
  static async getDocumentStatistics(): Promise<any> {
    const merchants = await Merchant.find({
      'onboarding.stepData.verification.documents': { $exists: true }
    });

    let totalDocuments = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;

    const documentTypeCounts: any = {
      business_license: 0,
      id_proof: 0,
      address_proof: 0,
      gst_certificate: 0,
      pan_card: 0
    };

    merchants.forEach(merchant => {
      const docs = merchant.onboarding?.stepData?.verification?.documents || [];
      docs.forEach((doc: any) => {
        totalDocuments++;
        if (doc.status === 'verified') verified++;
        else if (doc.status === 'pending') pending++;
        else if (doc.status === 'rejected') rejected++;

        if (documentTypeCounts.hasOwnProperty(doc.type)) {
          documentTypeCounts[doc.type]++;
        }
      });
    });

    return {
      totalDocuments,
      byStatus: {
        verified,
        pending,
        rejected
      },
      byType: documentTypeCounts,
      percentages: {
        verified: totalDocuments ? Math.round((verified / totalDocuments) * 100) : 0,
        pending: totalDocuments ? Math.round((pending / totalDocuments) * 100) : 0,
        rejected: totalDocuments ? Math.round((rejected / totalDocuments) * 100) : 0
      }
    };
  }
}

export default DocumentVerificationService;
