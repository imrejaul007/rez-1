import { logger } from '../config/logger';
/**
 * Fraud Detection Service
 * Implements anti-fraud rules for bill uploads
 */

import { Types } from 'mongoose';
import { Bill } from '../models/Bill';
import crypto from 'crypto';

interface FraudCheckResult {
  isFraudulent: boolean;
  fraudScore: number; // 0-100, higher = more suspicious
  flags: string[];
  warnings: string[];
}

interface BillData {
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  amount: number;
  billDate: Date;
  billNumber?: string;
  imageUrl: string;
  imageHash?: string;
}

class FraudDetectionService {
  /**
   * Run all fraud checks on a bill
   */
  async checkBillFraud(billData: BillData): Promise<FraudCheckResult> {
    logger.info('🔍 [FRAUD DETECTION] Running fraud checks...');

    const result: FraudCheckResult = {
      isFraudulent: false,
      fraudScore: 0,
      flags: [],
      warnings: [],
    };

    // Run all fraud checks
    await Promise.all([
      this.checkDuplicateBill(billData, result),
      this.checkDuplicateImage(billData, result),
      this.checkUploadFrequency(billData, result),
      this.checkAmountSuspicion(billData, result),
      this.checkBillAge(billData, result),
      this.checkMultipleMerchants(billData, result),
      this.checkMerchantSelfBilling(billData, result),
    ]);

    // Calculate final fraud score
    result.fraudScore = Math.min(result.fraudScore, 100);

    // Mark as fraudulent if score > 70
    if (result.fraudScore > 70) {
      result.isFraudulent = true;
    }

    logger.info(`📊 [FRAUD DETECTION] Fraud score: ${result.fraudScore}/100`);
    logger.info(`🚩 Flags: ${result.flags.length}`);
    logger.info(`⚠️ Warnings: ${result.warnings.length}`);

    return result;
  }

  /**
   * Check for duplicate bills (same bill submitted multiple times)
   */
  private async checkDuplicateBill(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      // Check for exact duplicate
      const duplicate = await Bill.findOne({
        user: billData.userId,
        merchant: billData.merchantId,
        amount: billData.amount,
        billDate: {
          $gte: new Date(billData.billDate.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(billData.billDate.getTime() + 24 * 60 * 60 * 1000),
        },
        verificationStatus: { $in: ['pending', 'processing', 'approved'] },
        isActive: true,
      }).lean();

      if (duplicate) {
        result.flags.push('DUPLICATE_BILL');
        result.fraudScore += 50;
        logger.info('🚩 [FRAUD] Duplicate bill detected');
      }

      // Check for same bill number
      if (billData.billNumber) {
        const sameBillNumber = await Bill.findOne({
          user: billData.userId,
          billNumber: billData.billNumber,
          verificationStatus: { $in: ['pending', 'processing', 'approved'] },
          isActive: true,
        }).lean();

        if (sameBillNumber) {
          result.flags.push('DUPLICATE_BILL_NUMBER');
          result.fraudScore += 40;
          logger.info('🚩 [FRAUD] Duplicate bill number detected');
        }
      }
    } catch (error) {
      logger.error('Error checking duplicate bill:', error);
    }
  }

  /**
   * Check for duplicate image (same image uploaded multiple times)
   */
  private async checkDuplicateImage(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      if (!billData.imageHash) return;

      // Check if same image hash exists
      const sameImage = await Bill.findOne({
        'billImage.imageHash': billData.imageHash,
        verificationStatus: { $in: ['pending', 'processing', 'approved'] },
        isActive: true,
      }).lean();

      if (sameImage) {
        result.flags.push('DUPLICATE_IMAGE');
        result.fraudScore += 60;
        logger.info('🚩 [FRAUD] Duplicate image detected');
      }
    } catch (error) {
      logger.error('Error checking duplicate image:', error);
    }
  }

  /**
   * Check upload frequency (too many bills in short time)
   */
  private async checkUploadFrequency(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Count bills uploaded in last hour
      const billsLastHour = await Bill.countDocuments({
        user: billData.userId,
        createdAt: { $gte: oneHourAgo },
        isActive: true,
      });

      if (billsLastHour >= 5) {
        result.flags.push('HIGH_FREQUENCY_UPLOADS');
        result.fraudScore += 30;
        logger.info('🚩 [FRAUD] High frequency uploads detected');
      }

      // Count bills uploaded in last 24 hours
      const billsLastDay = await Bill.countDocuments({
        user: billData.userId,
        createdAt: { $gte: oneDayAgo },
        isActive: true,
      });

      if (billsLastDay >= 20) {
        result.flags.push('EXCESSIVE_DAILY_UPLOADS');
        result.fraudScore += 20;
        logger.info('⚠️ [FRAUD] Excessive daily uploads detected');
      } else if (billsLastDay >= 10) {
        result.warnings.push('High number of bills uploaded today');
      }
    } catch (error) {
      logger.error('Error checking upload frequency:', error);
    }
  }

  /**
   * Check for suspicious amounts
   */
  private async checkAmountSuspicion(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      // Check for unusually high amount
      if (billData.amount > 50000) {
        result.warnings.push('Unusually high bill amount');
        result.fraudScore += 10;
      }

      // Check for round numbers (potential fake bills)
      if (billData.amount % 1000 === 0 && billData.amount >= 5000) {
        result.warnings.push('Bill amount is a round number');
        result.fraudScore += 5;
      }

      // Get user's average bill amount
      const userBills = await Bill.find({
        user: billData.userId,
        verificationStatus: 'approved',
        isActive: true,
      }).limit(10).sort({ createdAt: -1 }).lean();

      if (userBills.length >= 3) {
        const avgAmount = userBills.reduce((sum, bill) => sum + bill.amount, 0) / userBills.length;

        // If current bill is 5x average, it's suspicious
        if (billData.amount > avgAmount * 5) {
          result.warnings.push('Bill amount significantly higher than user average');
          result.fraudScore += 15;
        }
      }
    } catch (error) {
      logger.error('Error checking amount suspicion:', error);
    }
  }

  /**
   * Check bill age (too old or future dated)
   */
  private async checkBillAge(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      const now = new Date();
      const billAge = (now.getTime() - billData.billDate.getTime()) / (1000 * 60 * 60 * 24);

      // Bill in future
      if (billAge < 0) {
        result.flags.push('FUTURE_DATED_BILL');
        result.fraudScore += 40;
        logger.info('🚩 [FRAUD] Future-dated bill detected');
      }

      // Bill too old (> 30 days)
      if (billAge > 30) {
        result.flags.push('EXPIRED_BILL');
        result.fraudScore += 30;
        logger.info('🚩 [FRAUD] Expired bill detected (>30 days old)');
      }

      // Bill very recent (< 1 hour) - might be photoshopped
      if (billAge < 0.04) {
        // ~1 hour
        result.warnings.push('Bill is very recent');
        result.fraudScore += 5;
      }
    } catch (error) {
      logger.error('Error checking bill age:', error);
    }
  }

  /**
   * Check for multiple merchants in short time (velocity fraud)
   */
  private async checkMultipleMerchants(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Get distinct merchants from recent bills
      const recentBills = await Bill.find({
        user: billData.userId,
        createdAt: { $gte: oneHourAgo },
        isActive: true,
      }).distinct('merchant').lean();

      // If user is uploading bills from 5+ different merchants in 1 hour, suspicious
      if (recentBills.length >= 5) {
        result.flags.push('MULTIPLE_MERCHANTS_VELOCITY');
        result.fraudScore += 25;
        logger.info('🚩 [FRAUD] Multiple merchants velocity detected');
      }
    } catch (error) {
      logger.error('Error checking multiple merchants:', error);
    }
  }

  /**
   * Generate image hash for duplicate detection
   */
  generateImageHash(imageBuffer: Buffer): string {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Check if bill number exists for different user (cross-user fraud)
   */
  async checkCrossUserDuplicate(
    billNumber: string,
    merchantId: Types.ObjectId,
    excludeUserId: Types.ObjectId
  ): Promise<boolean> {
    try {
      const duplicate = await Bill.findOne({
        billNumber,
        merchant: merchantId,
        user: { $ne: excludeUserId },
        verificationStatus: { $in: ['pending', 'processing', 'approved'] },
        isActive: true,
      }).lean();

      return !!duplicate;
    } catch (error) {
      logger.error('Error checking cross-user duplicate:', error);
      return false;
    }
  }

  /**
   * Get user's fraud history
   */
  async getUserFraudHistory(userId: Types.ObjectId): Promise<{
    totalFlagged: number;
    totalRejected: number;
    avgFraudScore: number;
    recentFlags: string[];
  }> {
    try {
      const userBills = await Bill.find({
        user: userId,
        isActive: true,
      }).sort({ createdAt: -1 }).limit(50).lean();

      const flaggedBills = userBills.filter(bill => (bill.metadata.fraudScore || 0) > 50);
      const rejectedBills = userBills.filter(bill => bill.verificationStatus === 'rejected');

      const totalFraudScore = userBills.reduce(
        (sum, bill) => sum + (bill.metadata.fraudScore || 0),
        0
      );
      const avgFraudScore = userBills.length > 0 ? totalFraudScore / userBills.length : 0;

      // Collect recent fraud flags
      const recentFlags: string[] = [];
      userBills.slice(0, 10).forEach(bill => {
        if (bill.metadata.fraudFlags) {
          recentFlags.push(...bill.metadata.fraudFlags);
        }
      });

      return {
        totalFlagged: flaggedBills.length,
        totalRejected: rejectedBills.length,
        avgFraudScore: Math.round(avgFraudScore),
        recentFlags: [...new Set(recentFlags)], // Remove duplicates
      };
    } catch (error) {
      logger.error('Error getting user fraud history:', error);
      return {
        totalFlagged: 0,
        totalRejected: 0,
        avgFraudScore: 0,
        recentFlags: [],
      };
    }
  }
  /**
   * Check if bill submitter is the store owner (merchant self-billing fraud).
   * Store owners paying themselves to generate infinite cashback.
   */
  private async checkMerchantSelfBilling(
    billData: BillData,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      const Store = (await import('../models/Store')).Store;
      const store = await Store.findOne({ _id: billData.merchantId })
        .select('merchantId')
        .lean();

      if (store && (store as any).merchantId) {
        const storeOwnerId = (store as any).merchantId.toString();
        const billUserId = billData.userId.toString();

        if (storeOwnerId === billUserId) {
          result.fraudScore += 60;
          result.flags.push('merchant_self_billing');
          result.warnings.push('Bill submitted by store owner — possible self-billing fraud');
          return;
        }
      }
    } catch (error) {
      logger.error('Error checking merchant self-billing:', error);
    }
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();
export default fraudDetectionService;
