import { logger } from '../config/logger';
/**
 * Bill Verification Service
 * Handles bill verification workflow with OCR and fraud detection
 */

import { Types } from 'mongoose';
import { Bill, IBill } from '../models/Bill';
import { Merchant } from '../models/Merchant';
import { ocrService } from './ocrService';
import { fraudDetectionService } from './fraudDetectionService';
import challengeService from './challengeService';

interface VerificationResult {
  success: boolean;
  billId?: Types.ObjectId;
  status?: 'pending' | 'processing' | 'approved' | 'rejected';
  message?: string;
  error?: string;
  warnings?: string[];
}

class BillVerificationService {
  /**
   * Process and verify a newly uploaded bill
   */
  async processBill(
    billId: Types.ObjectId,
    imageUrl: string,
    imageHash?: string
  ): Promise<VerificationResult> {
    logger.info(`🔄 [BILL VERIFICATION] Processing bill ${billId}...`);

    try {
      // Get bill document
      const bill = await Bill.findById(billId).populate('merchant');
      if (!bill) {
        return {
          success: false,
          error: 'Bill not found',
        };
      }

      // Mark as processing
      bill.verificationStatus = 'processing';
      await bill.save();

      // Step 1: Run OCR to extract text
      logger.info('📸 [VERIFICATION] Step 1: Running OCR...');
      const ocrResult = await ocrService.extractTextFromBill(imageUrl);

      if (ocrResult.success && ocrResult.extractedData) {
        // Save extracted data
        bill.extractedData = ocrResult.extractedData;
        bill.metadata.ocrConfidence = ocrResult.confidence;
        await bill.save();

        // Validate extracted data against user input
        const merchant = bill.merchant as any;
        const validation = ocrService.validateExtractedData(ocrResult.extractedData, {
          amount: bill.amount,
          billDate: bill.billDate,
          merchantName: merchant?.name,
        });

        if (!validation.isValid) {
          logger.info('⚠️ [VERIFICATION] OCR validation warnings:', validation.warnings);
          // Store warnings but don't reject automatically
          bill.metadata.fraudFlags = validation.warnings;
        }
      } else {
        logger.info('⚠️ [VERIFICATION] OCR failed, proceeding with manual review');
      }

      // Step 2: Run fraud detection
      logger.info('🔍 [VERIFICATION] Step 2: Running fraud detection...');
      const fraudCheck = await fraudDetectionService.checkBillFraud({
        userId: bill.user,
        merchantId: bill.merchant as Types.ObjectId,
        amount: bill.amount,
        billDate: bill.billDate,
        billNumber: bill.billNumber,
        imageUrl,
        imageHash,
      });

      // Save fraud detection results
      bill.metadata.fraudScore = fraudCheck.fraudScore;
      bill.metadata.fraudFlags = [...(bill.metadata.fraudFlags || []), ...fraudCheck.flags];
      await bill.save();

      // Step 3: Automatic decision making
      logger.info('⚖️ [VERIFICATION] Step 3: Making verification decision...');
      const decision = await this.makeVerificationDecision(bill, ocrResult.confidence || 0, fraudCheck.fraudScore);

      logger.info(`✅ [VERIFICATION] Decision: ${decision.status}`);

      return {
        success: true,
        billId: bill._id as Types.ObjectId,
        status: decision.status,
        message: decision.message,
        warnings: fraudCheck.warnings,
      };
    } catch (error) {
      logger.error('❌ [VERIFICATION] Error processing bill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Make automatic verification decision
   */
  private async makeVerificationDecision(
    bill: IBill,
    ocrConfidence: number,
    fraudScore: number
  ): Promise<{ status: 'approved' | 'rejected' | 'pending'; message: string }> {
    // AUTO-REJECT criteria
    if (fraudScore > 70) {
      await bill.reject(
        'Bill rejected due to high fraud risk. Please contact support if you believe this is an error.',
        undefined
      );
      return {
        status: 'rejected',
        message: 'Bill automatically rejected due to fraud indicators',
      };
    }

    // Check if bill is too old
    const billAge = (Date.now() - bill.billDate.getTime()) / (1000 * 60 * 60 * 24);
    if (billAge > 30) {
      await bill.reject(
        'Bill is older than 30 days. Only bills from the last 30 days are eligible for cashback.',
        undefined
      );
      return {
        status: 'rejected',
        message: 'Bill rejected: too old',
      };
    }

    // Check if merchant exists and is active
    const merchant = await Merchant.findById(bill.merchant).lean();
    if (!merchant || !merchant.isActive) {
      await bill.reject(
        'Merchant not found or inactive. Please contact support.',
        undefined
      );
      return {
        status: 'rejected',
        message: 'Bill rejected: merchant inactive',
      };
    }

    // AUTO-APPROVE criteria
    // - High OCR confidence (>90%)
    // - Low fraud score (<30)
    // - Merchant verified
    // - Amount within reasonable range
    const isHighConfidence = ocrConfidence >= 90;
    const isLowFraud = fraudScore < 30;
    const isReasonableAmount = bill.amount >= 50 && bill.amount <= 10000;

    if (isHighConfidence && isLowFraud && isReasonableAmount) {
      await bill.approve(undefined);

      // Auto-trigger bill_upload_bonus campaign on auto-approval
      try {
        const bonusCampaignService = require('./bonusCampaignService');
        const billUserId = bill.user.toString();
        const billId = (bill._id as Types.ObjectId).toString();
        logger.info('[BILL VERIFICATION] Triggering bill_upload_bonus for auto-approved bill:', billId);
        await bonusCampaignService.autoClaimForTransaction('bill_upload_bonus', billUserId, {
          transactionRef: { type: 'bill' as const, refId: billId },
          transactionAmount: bill.amount,
        });
      } catch (bonusErr) {
        logger.error('[BILL VERIFICATION] bill_upload_bonus auto-claim failed (non-blocking):', bonusErr);
      }

      // Update challenge progress for bill upload (non-blocking)
      challengeService.updateProgress(
        bill.user.toString(), 'upload_bills', 1,
        { billId: (bill._id as Types.ObjectId).toString() }
      ).catch(err => logger.error('[BILL] Challenge progress update failed:', err));

      return {
        status: 'approved',
        message: 'Bill automatically approved',
      };
    }

    // MANUAL REVIEW required
    // - Medium OCR confidence (60-90%)
    // - Medium fraud score (30-70)
    // - Any other edge case
    bill.verificationMethod = 'manual';
    bill.verificationStatus = 'pending';
    await bill.save();

    return {
      status: 'pending',
      message: 'Bill queued for manual review',
    };
  }

  /**
   * Manually approve a bill (admin action)
   */
  async manuallyApproveBill(
    billId: Types.ObjectId,
    adminId: Types.ObjectId,
    notes?: string
  ): Promise<VerificationResult> {
    try {
      logger.info(`✅ [MANUAL APPROVAL] Admin ${adminId} approving bill ${billId}`);

      const bill = await Bill.findById(billId);
      if (!bill) {
        return {
          success: false,
          error: 'Bill not found',
        };
      }

      if (bill.verificationStatus === 'approved') {
        return {
          success: false,
          error: 'Bill is already approved',
        };
      }

      // Approve the bill
      await bill.approve(adminId);

      if (notes) {
        bill.notes = (bill.notes || '') + `\nAdmin notes: ${notes}`;
        await bill.save();
      }

      logger.info('✅ [MANUAL APPROVAL] Bill approved successfully');

      // Auto-trigger bill_upload_bonus campaign on manual approval
      try {
        const bonusCampaignService = require('./bonusCampaignService');
        const billUserId = bill.user.toString();
        const billIdStr = (bill._id as Types.ObjectId).toString();
        logger.info('[MANUAL APPROVAL] Triggering bill_upload_bonus for bill:', billIdStr);
        await bonusCampaignService.autoClaimForTransaction('bill_upload_bonus', billUserId, {
          transactionRef: { type: 'bill' as const, refId: billIdStr },
          transactionAmount: bill.amount,
        });
      } catch (bonusErr) {
        logger.error('[MANUAL APPROVAL] bill_upload_bonus auto-claim failed (non-blocking):', bonusErr);
      }

      // Update challenge progress for bill upload (non-blocking)
      challengeService.updateProgress(
        bill.user.toString(), 'upload_bills', 1,
        { billId: (bill._id as Types.ObjectId).toString() }
      ).catch(err => logger.error('[BILL MANUAL] Challenge progress update failed:', err));

      return {
        success: true,
        billId: bill._id as Types.ObjectId,
        status: 'approved',
        message: 'Bill manually approved',
      };
    } catch (error) {
      logger.error('❌ [MANUAL APPROVAL] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Approval failed',
      };
    }
  }

  /**
   * Manually reject a bill (admin action)
   */
  async manuallyRejectBill(
    billId: Types.ObjectId,
    adminId: Types.ObjectId,
    reason: string
  ): Promise<VerificationResult> {
    try {
      logger.info(`❌ [MANUAL REJECTION] Admin ${adminId} rejecting bill ${billId}`);

      const bill = await Bill.findById(billId).lean();
      if (!bill) {
        return {
          success: false,
          error: 'Bill not found',
        };
      }

      if (bill.verificationStatus === 'rejected') {
        return {
          success: false,
          error: 'Bill is already rejected',
        };
      }

      // Reject the bill
      await bill.reject(reason, adminId);

      logger.info('✅ [MANUAL REJECTION] Bill rejected successfully');

      return {
        success: true,
        billId: bill._id as Types.ObjectId,
        status: 'rejected',
        message: 'Bill manually rejected',
      };
    } catch (error) {
      logger.error('❌ [MANUAL REJECTION] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rejection failed',
      };
    }
  }

  /**
   * Get bills pending manual review
   */
  async getPendingReviewBills(limit: number = 20, page: number = 1): Promise<IBill[]> {
    try {
      const skip = (page - 1) * limit;

      const bills = await Bill.find({
        verificationStatus: 'pending',
        verificationMethod: 'manual',
        isActive: true,
      })
        .populate('user', 'phoneNumber profile.firstName profile.lastName')
        .populate('merchant', 'name logo')
        .sort({ createdAt: 1 }) // Oldest first (FIFO)
        .limit(limit)
        .skip(skip).lean();

      return bills as unknown as IBill[];
    } catch (error) {
      logger.error('Error getting pending review bills:', error);
      return [];
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStatistics(): Promise<{
    totalBills: number;
    pendingReview: number;
    autoApproved: number;
    autoRejected: number;
    manuallyReviewed: number;
    avgProcessingTime: number;
    avgOcrConfidence: number;
  }> {
    try {
      const stats = await Bill.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalBills: { $sum: 1 },
            pendingReview: {
              $sum: {
                $cond: [
                  { $eq: ['$verificationStatus', 'pending'] },
                  1,
                  0,
                ],
              },
            },
            autoApproved: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$verificationStatus', 'approved'] },
                      { $eq: ['$verificationMethod', 'automatic'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            autoRejected: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$verificationStatus', 'rejected'] },
                      { $eq: ['$verificationMethod', 'automatic'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            manuallyReviewed: {
              $sum: {
                $cond: [
                  { $eq: ['$verificationMethod', 'manual'] },
                  1,
                  0,
                ],
              },
            },
            avgProcessingTime: { $avg: '$metadata.processingTime' },
            avgOcrConfidence: { $avg: '$metadata.ocrConfidence' },
          },
        },
      ]);

      if (stats.length === 0) {
        return {
          totalBills: 0,
          pendingReview: 0,
          autoApproved: 0,
          autoRejected: 0,
          manuallyReviewed: 0,
          avgProcessingTime: 0,
          avgOcrConfidence: 0,
        };
      }

      return stats[0];
    } catch (error) {
      logger.error('Error getting verification statistics:', error);
      throw error;
    }
  }

  /**
   * Reprocess a rejected bill with new image
   */
  async reprocessBill(
    originalBillId: Types.ObjectId,
    newImageUrl: string,
    newImageHash?: string
  ): Promise<VerificationResult> {
    try {
      logger.info(`🔄 [REPROCESS] Reprocessing bill ${originalBillId}...`);

      const originalBill = await Bill.findById(originalBillId);
      if (!originalBill) {
        return {
          success: false,
          error: 'Original bill not found',
        };
      }

      // Update bill image
      originalBill.billImage.url = newImageUrl;
      if (newImageHash) {
        originalBill.billImage.imageHash = newImageHash;
      }

      // Reset verification status
      originalBill.verificationStatus = 'pending';
      originalBill.verificationMethod = undefined;
      originalBill.rejectionReason = undefined;
      originalBill.metadata.fraudScore = 0;
      originalBill.metadata.fraudFlags = [];
      originalBill.resubmissionCount = (originalBill.resubmissionCount || 0) + 1;

      await originalBill.save();

      // Process the bill again
      return await this.processBill(originalBill._id as Types.ObjectId, newImageUrl, newImageHash);
    } catch (error) {
      logger.error('❌ [REPROCESS] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reprocessing failed',
      };
    }
  }
}

// Export singleton instance
export const billVerificationService = new BillVerificationService();
export default billVerificationService;
