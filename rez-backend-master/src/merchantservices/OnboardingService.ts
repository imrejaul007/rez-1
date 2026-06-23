import { Merchant, IMerchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { EmailService } from '../services/EmailService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

/**
 * OnboardingService
 * Handles merchant onboarding wizard workflow
 */
export class OnboardingService {
  /**
   * Get onboarding status and progress for a merchant
   */
  static async getOnboardingStatus(merchantId: string): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Initialize onboarding if not started
    if (!merchant.onboarding) {
      merchant.onboarding = {
        status: 'pending',
        currentStep: 1,
        completedSteps: [],
        stepData: {}
      };
      await merchant.save();
    }

    return {
      status: merchant.onboarding.status,
      currentStep: merchant.onboarding.currentStep,
      completedSteps: merchant.onboarding.completedSteps || [],
      totalSteps: 5,
      progressPercentage: this.calculateProgress(merchant.onboarding.completedSteps || []),
      stepData: merchant.onboarding.stepData || {},
      startedAt: merchant.onboarding.startedAt,
      completedAt: merchant.onboarding.completedAt,
      rejectionReason: merchant.onboarding.rejectionReason
    };
  }

  /**
   * Calculate progress percentage
   */
  private static calculateProgress(completedSteps: number[]): number {
    const totalSteps = 5;
    const completed = completedSteps.length;
    return Math.round((completed / totalSteps) * 100);
  }

  /**
   * Save step data (auto-save)
   */
  static async saveStepData(
    merchantId: string,
    stepNumber: number,
    data: any
  ): Promise<any> {
    if (stepNumber < 1 || stepNumber > 5) {
      throw new Error('Invalid step number. Must be between 1 and 5.');
    }

    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Initialize onboarding if needed
    if (!merchant.onboarding) {
      merchant.onboarding = {
        status: 'in_progress',
        currentStep: stepNumber,
        completedSteps: [],
        stepData: {},
        startedAt: new Date()
      };
    }

    // Mark as in_progress if pending
    if (merchant.onboarding.status === 'pending') {
      merchant.onboarding.status = 'in_progress';
      merchant.onboarding.startedAt = new Date();
    }

    // Validate and save step data
    switch (stepNumber) {
      case 1:
        // Normalize field names (accept both companyName and businessName)
        if (data.businessName && !data.companyName) {
          data.companyName = data.businessName;
        }
        await this.validateBusinessInfo(data);
        merchant.onboarding.stepData.businessInfo = data;
        break;
      case 2:
        // Normalize field names (accept both category and storeCategory, address and storeAddress)
        if (data.storeCategory && !data.category) {
          data.category = data.storeCategory;
        }
        if (data.storeAddress && !data.address) {
          data.address = data.storeAddress;
        }
        await this.validateStoreDetails(data);
        merchant.onboarding.stepData.storeDetails = data;
        break;
      case 3:
        await this.validateBankDetails(data);
        merchant.onboarding.stepData.bankDetails = data;
        break;
      case 4:
        // Product setup is optional - can be skipped
        // Products are added via separate product creation API
        (merchant.onboarding.stepData as any).products = data || {};
        break;
      case 5:
        await this.validateVerificationDocuments(data);
        if (!merchant.onboarding.stepData.verification) {
          merchant.onboarding.stepData.verification = {
            documents: [],
            verificationStatus: 'pending'
          };
        }
        // Add new documents (merge with existing)
        if (data.documents && Array.isArray(data.documents)) {
          merchant.onboarding.stepData.verification.documents.push(...data.documents);
        }
        break;
      default:
        throw new Error('Invalid step number');
    }

    await merchant.save();

    return {
      success: true,
      message: `Step ${stepNumber} data saved successfully`,
      stepData: merchant.onboarding.stepData
    };
  }

  /**
   * Complete a step and move to next
   */
  static async completeStep(
    merchantId: string,
    stepNumber: number
  ): Promise<any> {
    if (stepNumber < 1 || stepNumber > 5) {
      throw new Error('Invalid step number. Must be between 1 and 5.');
    }

    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding) {
      throw new Error('Onboarding not started');
    }

    // Verify step data is present
    const stepDataValid = await this.validateStepCompletion(merchant, stepNumber);

    if (!stepDataValid) {
      throw new Error(`Step ${stepNumber} data is incomplete or invalid`);
    }

    // Add to completed steps if not already there
    if (!merchant.onboarding.completedSteps.includes(stepNumber)) {
      merchant.onboarding.completedSteps.push(stepNumber);
    }

    // Move to next step
    if (stepNumber < 5) {
      merchant.onboarding.currentStep = stepNumber + 1;
    } else {
      // All steps completed - ready for submission
      merchant.onboarding.currentStep = 5;
    }

    await merchant.save();

    // Send step completion email
    await this.sendStepCompletionEmail(merchant, stepNumber);

    return {
      success: true,
      message: `Step ${stepNumber} completed successfully`,
      currentStep: merchant.onboarding.currentStep,
      completedSteps: merchant.onboarding.completedSteps,
      progressPercentage: this.calculateProgress(merchant.onboarding.completedSteps),
      canSubmit: merchant.onboarding.completedSteps.length === 5
    };
  }

  /**
   * Go back to previous step
   */
  static async previousStep(
    merchantId: string,
    stepNumber: number
  ): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding) {
      throw new Error('Onboarding not started');
    }

    if (stepNumber > 1) {
      merchant.onboarding.currentStep = stepNumber - 1;
      await merchant.save();
    }

    return {
      success: true,
      currentStep: merchant.onboarding.currentStep
    };
  }

  /**
   * Submit onboarding for verification
   */
  static async submitForVerification(merchantId: string): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding) {
      throw new Error('Onboarding not started');
    }

    // Check if all steps are completed
    if (merchant.onboarding.completedSteps.length < 5) {
      throw new Error('All steps must be completed before submission');
    }

    // Validate all step data
    const allStepsValid = await this.validateAllSteps(merchant);

    if (!allStepsValid) {
      throw new Error('Some step data is incomplete or invalid');
    }

    // Update status
    merchant.onboarding.status = 'completed';
    merchant.onboarding.completedAt = new Date();

    // Set verification status to pending
    if (merchant.onboarding.stepData.verification) {
      merchant.onboarding.stepData.verification.verificationStatus = 'pending';
    }

    await merchant.save();

    // Send submission confirmation email (best effort - don't fail if email fails)
    try {
      await EmailService.sendOnboardingSubmitted(
        merchant.email,
        merchant.ownerName
      );
    } catch (emailError) {
      logger.error('Failed to send onboarding confirmation email:', emailError);
      // Continue - email failure shouldn't block the submission
    }

    // Notify admin about new onboarding submission (best effort)
    try {
      await this.notifyAdminNewSubmission(merchant);
    } catch (notifyError) {
      logger.error('Failed to notify admin about onboarding submission:', notifyError);
      // Continue - notification failure shouldn't block the submission
    }

    return {
      success: true,
      message: 'Onboarding submitted successfully. Your application is under review.',
      status: 'completed'
    };
  }

  /**
   * Approve onboarding (Admin only)
   */
  static async approveOnboarding(
    merchantId: string,
    adminId: string
  ): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const merchant = await Merchant.findById(merchantId).session(session);

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      if (!merchant.onboarding || merchant.onboarding.status !== 'completed') {
        throw new Error('Onboarding must be submitted before approval');
      }

      // Update merchant verification status
      merchant.verificationStatus = 'verified';
      merchant.isActive = true;

      // Update onboarding verification
      if (merchant.onboarding.stepData.verification) {
        merchant.onboarding.stepData.verification.verificationStatus = 'verified';
        merchant.onboarding.stepData.verification.verifiedAt = new Date();
        merchant.onboarding.stepData.verification.verifiedBy = adminId;

        // Mark all documents as verified
        merchant.onboarding.stepData.verification.documents.forEach((doc: any) => {
          doc.status = 'verified';
        });
      }

      await merchant.save({ session });

      // Auto-create store from onboarding data
      const store = await this.createStoreFromOnboarding(merchant, session);

      await session.commitTransaction();

      // Send approval email
      await EmailService.sendOnboardingApproved(
        merchant.email,
        merchant.ownerName,
        store._id.toString()
      );

      return {
        success: true,
        message: 'Merchant onboarding approved successfully',
        merchantId: merchant._id,
        storeId: store._id
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reject onboarding (Admin only)
   */
  static async rejectOnboarding(
    merchantId: string,
    reason: string,
    adminId: string
  ): Promise<any> {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    if (!merchant.onboarding) {
      throw new Error('Onboarding not found');
    }

    merchant.onboarding.status = 'rejected';
    merchant.onboarding.rejectionReason = reason;
    merchant.verificationStatus = 'rejected';

    if (merchant.onboarding.stepData.verification) {
      merchant.onboarding.stepData.verification.verificationStatus = 'rejected';
      merchant.onboarding.stepData.verification.verifiedAt = new Date();
      merchant.onboarding.stepData.verification.verifiedBy = adminId;
    }

    await merchant.save();

    // Send rejection email
    await EmailService.sendOnboardingRejected(
      merchant.email,
      merchant.ownerName,
      reason
    );

    return {
      success: true,
      message: 'Onboarding rejected',
      reason
    };
  }

  /**
   * Create store from onboarding data
   */
  private static async createStoreFromOnboarding(
    merchant: IMerchant,
    session: any
  ): Promise<any> {
    const storeData = merchant.onboarding.stepData.storeDetails;
    const businessInfo = merchant.onboarding.stepData.businessInfo;

    if (!storeData) {
      throw new Error('Store details not found in onboarding data');
    }

    const store = new Store({
      name: storeData.storeName || merchant.businessName,
      slug: this.generateSlug(storeData.storeName || merchant.businessName),
      description: storeData.description || merchant.description,
      logo: storeData.logoUrl || merchant.logo,
      banner: storeData.bannerUrl,
      category: storeData.category,
      location: {
        address: storeData.address?.street || merchant.businessAddress.street,
        city: storeData.address?.city || merchant.businessAddress.city,
        state: storeData.address?.state || merchant.businessAddress.state,
        pincode: storeData.address?.zipCode || merchant.businessAddress.zipCode,
        landmark: storeData.address?.landmark
      },
      contact: {
        phone: merchant.phone,
        email: merchant.email,
        website: merchant.website
      },
      merchantId: merchant._id,
      isActive: true,
      isVerified: true,
      createdViaOnboarding: true,
      ratings: {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      offers: {
        isPartner: false
      },
      operationalInfo: {
        hours: {},
        acceptsWalletPayment: true,
        paymentMethods: ['cash', 'card', 'upi', 'wallet']
      },
      deliveryCategories: {},
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        repeatCustomers: 0
      },
      tags: []
    });

    await store.save({ session });

    return store;
  }

  /**
   * Generate slug from store name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Validation methods
   */
  private static async validateBusinessInfo(data: any): Promise<boolean> {
    if (!data || typeof data !== 'object') {
      throw new Error('Business information data is required');
    }

    if (!data.companyName && !data.businessName) {
      throw new Error('Company name or business name is required');
    }

    if (!data.businessType) {
      throw new Error('Business type is required');
    }

    // Validate GST format (if provided) - make it more lenient for testing
    if (data.gstNumber) {
      const gst = String(data.gstNumber).toUpperCase().trim();
      if (gst.length > 0 && !this.isValidGST(gst)) {
        // Only warn in development, don't fail
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid GST number format');
        } else {
          logger.warn('GST number format validation failed, but allowing in development:', gst);
        }
      }
    }

    // Validate PAN format (if provided) - make it more lenient for testing
    if (data.panNumber) {
      const pan = String(data.panNumber).toUpperCase().trim();
      if (pan.length > 0 && !this.isValidPAN(pan)) {
        // Only warn in development, don't fail
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid PAN number format');
        } else {
          logger.warn('PAN number format validation failed, but allowing in development:', pan);
        }
      }
    }

    return true;
  }

  private static async validateStoreDetails(data: any): Promise<boolean> {
    if (!data || typeof data !== 'object') {
      throw new Error('Store details data is required');
    }

    if (!data.storeName) {
      throw new Error('Store name is required');
    }

    if (!data.category && !data.storeCategory) {
      throw new Error('Store category is required');
    }

    // Accept both 'address' and 'storeAddress' field names
    const address = data.address || data.storeAddress;
    if (!address) {
      throw new Error('Store address is required');
    }

    if (!address.street || !address.city) {
      throw new Error('Complete address with street and city is required');
    }

    return true;
  }

  private static async validateBankDetails(data: any): Promise<boolean> {
    if (!data || typeof data !== 'object') {
      throw new Error('Bank details data is required');
    }

    if (!data.accountNumber) {
      throw new Error('Bank account number is required');
    }

    if (!data.ifscCode) {
      throw new Error('IFSC code is required');
    }

    // Validate IFSC format - make it more lenient for testing
    const ifsc = String(data.ifscCode).toUpperCase().trim();
    if (!this.isValidIFSC(ifsc)) {
      // Only fail in production, warn in development
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Valid IFSC code is required (format: AAAA0XXXXXX)');
      } else {
        logger.warn('IFSC code format validation failed, but allowing in development:', ifsc);
      }
    }

    if (!data.accountHolderName) {
      throw new Error('Account holder name is required');
    }

    return true;
  }

  private static async validateVerificationDocuments(data: any): Promise<boolean> {
    if (!data.documents || data.documents.length === 0) {
      throw new Error('At least one document is required');
    }

    for (const doc of data.documents) {
      if (!doc.type || !doc.url) {
        throw new Error('Document type and URL are required');
      }
    }

    return true;
  }

  /**
   * Validate step completion
   */
  private static async validateStepCompletion(
    merchant: IMerchant,
    stepNumber: number
  ): Promise<boolean> {
    const stepData = merchant.onboarding.stepData;

    switch (stepNumber) {
      case 1:
        return !!(stepData.businessInfo &&
                  stepData.businessInfo.companyName &&
                  stepData.businessInfo.businessType);
      case 2:
        return !!(stepData.storeDetails &&
                  stepData.storeDetails.storeName &&
                  stepData.storeDetails.category);
      case 3:
        return !!(stepData.bankDetails &&
                  stepData.bankDetails.accountNumber &&
                  stepData.bankDetails.ifscCode);
      case 4:
        // Product setup is optional
        return true;
      case 5:
        return !!(stepData.verification &&
                  stepData.verification.documents &&
                  stepData.verification.documents.length > 0);
      default:
        return false;
    }
  }

  /**
   * Validate all steps
   */
  private static async validateAllSteps(merchant: IMerchant): Promise<boolean> {
    for (let step = 1; step <= 5; step++) {
      const valid = await this.validateStepCompletion(merchant, step);
      if (!valid) {
        return false;
      }
    }
    return true;
  }

  /**
   * Format validation helpers
   */
  private static isValidGST(gst: string): boolean {
    // GST format: 22AAAAA0000A1Z5
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  }

  private static isValidPAN(pan: string): boolean {
    // PAN format: AAAAA9999A
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  }

  private static isValidIFSC(ifsc: string): boolean {
    // IFSC format: AAAA0XXXXXX
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  }

  /**
   * Send step completion email
   */
  private static async sendStepCompletionEmail(
    merchant: IMerchant,
    stepNumber: number
  ): Promise<void> {
    const stepNames = {
      1: 'Business Information',
      2: 'Store Details',
      3: 'Bank Details',
      4: 'Product Setup',
      5: 'Document Verification'
    };

    await EmailService.sendOnboardingStepCompleted(
      merchant.email,
      merchant.ownerName,
      stepNumber,
      stepNames[stepNumber as keyof typeof stepNames]
    );
  }

  /**
   * Notify admin about new submission
   */
  private static async notifyAdminNewSubmission(merchant: IMerchant): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourstore.com';

    await EmailService.sendAdminOnboardingNotification(
      adminEmail,
      merchant.businessName,
      String(merchant._id)
    );
  }

  /**
   * Get onboarding analytics (Admin)
   */
  static async getOnboardingAnalytics(): Promise<any> {
    const [
      totalMerchants,
      pending,
      inProgress,
      completed,
      rejected,
      stepDistribution
    ] = await Promise.all([
      Merchant.countDocuments(),
      Merchant.countDocuments({ 'onboarding.status': 'pending' }),
      Merchant.countDocuments({ 'onboarding.status': 'in_progress' }),
      Merchant.countDocuments({ 'onboarding.status': 'completed' }),
      Merchant.countDocuments({ 'onboarding.status': 'rejected' }),
      this.getStepDistribution()
    ]);

    // Calculate average completion time
    const avgCompletionTime = await this.calculateAverageCompletionTime();

    // Calculate drop-off rate by step
    const dropOffRate = await this.calculateDropOffRate();

    return {
      totalMerchants,
      byStatus: {
        pending,
        inProgress,
        completed,
        rejected
      },
      percentages: {
        pending: totalMerchants ? Math.round((pending / totalMerchants) * 100) : 0,
        inProgress: totalMerchants ? Math.round((inProgress / totalMerchants) * 100) : 0,
        completed: totalMerchants ? Math.round((completed / totalMerchants) * 100) : 0,
        rejected: totalMerchants ? Math.round((rejected / totalMerchants) * 100) : 0
      },
      avgCompletionTimeHours: avgCompletionTime,
      stepDistribution,
      dropOffRate,
      pendingVerifications: completed
    };
  }

  /**
   * Get step distribution
   */
  private static async getStepDistribution(): Promise<any> {
    const merchants = await Merchant.find({ 'onboarding.status': 'in_progress' });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    merchants.forEach(merchant => {
      if (merchant.onboarding && merchant.onboarding.currentStep) {
        distribution[merchant.onboarding.currentStep as keyof typeof distribution]++;
      }
    });

    return distribution;
  }

  /**
   * Calculate average completion time
   */
  private static async calculateAverageCompletionTime(): Promise<number> {
    const completedMerchants = await Merchant.find({
      'onboarding.status': 'completed',
      'onboarding.startedAt': { $exists: true },
      'onboarding.completedAt': { $exists: true }
    });

    if (completedMerchants.length === 0) {
      return 0;
    }

    let totalTime = 0;
    completedMerchants.forEach(merchant => {
      if (merchant.onboarding.startedAt && merchant.onboarding.completedAt) {
        const timeDiff = merchant.onboarding.completedAt.getTime() -
                        merchant.onboarding.startedAt.getTime();
        totalTime += timeDiff;
      }
    });

    const avgTimeMs = totalTime / completedMerchants.length;
    const avgTimeHours = Math.round(avgTimeMs / (1000 * 60 * 60));

    return avgTimeHours;
  }

  /**
   * Calculate drop-off rate by step
   */
  private static async calculateDropOffRate(): Promise<any> {
    const allMerchants = await Merchant.find({ 'onboarding': { $exists: true } });

    const stepCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    allMerchants.forEach(merchant => {
      if (merchant.onboarding && merchant.onboarding.completedSteps) {
        merchant.onboarding.completedSteps.forEach(step => {
          stepCounts[step as keyof typeof stepCounts]++;
        });
      }
    });

    const total = allMerchants.length;
    const dropOffRate: any = {};

    for (let step = 1; step <= 5; step++) {
      const completed = stepCounts[step as keyof typeof stepCounts];
      const dropOff = total - completed;
      dropOffRate[`step${step}`] = {
        completed,
        dropOff,
        dropOffPercentage: total ? Math.round((dropOff / total) * 100) : 0
      };
    }

    return dropOffRate;
  }
}

export default OnboardingService;
