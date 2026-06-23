import crypto from 'crypto';
import { logger } from '../config/logger';
import axios from 'axios';
import Referral from '../models/Referral';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { EmailService } from './EmailService';

interface VoucherProvider {
  name: string;
  apiEndpoint: string;
  apiKey: string;
}

interface VoucherGenerationResult {
  success: boolean;
  voucherCode: string;
  voucherType: string;
  amount: number;
  expiresAt: Date;
  redemptionUrl?: string;
  message?: string;
}

export class VoucherRedemptionService {
  private providers: Record<string, VoucherProvider> = {
    Amazon: {
      name: 'Amazon',
      apiEndpoint: process.env.AMAZON_VOUCHER_API || 'https://api.amazon.com/vouchers',
      apiKey: process.env.AMAZON_API_KEY || ''
    },
    Flipkart: {
      name: 'Flipkart',
      apiEndpoint: process.env.FLIPKART_VOUCHER_API || 'https://api.flipkart.com/vouchers',
      apiKey: process.env.FLIPKART_API_KEY || ''
    },
    // Add more providers as needed
  };

  /**
   * Generate a voucher code
   */
  async generateVoucher(
    type: string,
    amount: number,
    userId: string | Types.ObjectId
  ): Promise<VoucherGenerationResult> {
    const provider = this.providers[type];

    if (!provider) {
      // Fallback to generated code if provider not configured
      return this.generateFallbackVoucher(type, amount);
    }

    try {
      // Provider API path: only reachable when a voucher provider is configured.
      // In production deployment, no provider is configured — generateFallbackVoucher
      // is the path actually used (see line 50-52).
      const response = await this.callVoucherAPI(provider, amount, userId);

      return {
        success: true,
        voucherCode: response.code,
        voucherType: type,
        amount,
        expiresAt: response.expiresAt || this.getDefaultExpiry(),
        redemptionUrl: response.redemptionUrl
      };
    } catch (error) {
      logger.error('Voucher generation failed:', error);
      // Fallback to generated code
      return this.generateFallbackVoucher(type, amount);
    }
  }

  /**
   * Generate fallback voucher code when API is unavailable
   */
  private generateFallbackVoucher(type: string, amount: number): VoucherGenerationResult {
    const prefix = type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const voucherCode = `REZ-${prefix}-${amount}-${timestamp}${random}`;

    return {
      success: true,
      voucherCode,
      voucherType: type,
      amount,
      expiresAt: this.getDefaultExpiry(),
      message: 'Voucher code generated. Please contact support to activate.'
    };
  }

  /**
   * Call external voucher provider API
   */
  private async callVoucherAPI(
    provider: VoucherProvider,
    amount: number,
    userId: string | Types.ObjectId
  ): Promise<any> {
    // Provider API path. Unreachable in production unless a voucher provider
    // (Amazon, etc.) is explicitly configured. Currently a no-op placeholder.

    if (!provider.apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }

    /*
    const response = await axios.post(
      provider.apiEndpoint,
      {
        amount,
        currency: 'INR',
        userId: userId.toString(),
        source: 'REZ_REFERRAL'
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
    */

    // Placeholder response
    throw new Error('API not implemented');
  }

  /**
   * Claim a voucher reward
   */
  async claimVoucher(
    userId: string | Types.ObjectId,
    referralId: string | Types.ObjectId
  ) {
    const referral = await Referral.findById(referralId).lean();

    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.referrer.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Not your referral');
    }

    const reward = referral.rewards;

    if (!reward.voucherCode) {
      throw new Error('No voucher available for this referral');
    }

    if (referral.expiresAt && referral.expiresAt < new Date()) {
      throw new Error('Voucher has expired');
    }

    // TODO: Send voucher via email
    await this.sendVoucherEmail(userId, reward);

    return {
      success: true,
      voucherCode: reward.voucherCode,
      voucherType: reward.voucherType,
      description: reward.description,
      message: 'Voucher claimed successfully! Check your email for details.'
    };
  }

  /**
   * Send voucher details via email
   */
  private async sendVoucherEmail(userId: string | Types.ObjectId, reward: any) {
    try {
      const user = await User.findById(userId).select('email profile.firstName').lean();

      if (!user?.email) {
        logger.info(`⚠️ [Voucher] No email address for user ${userId}. Skipping voucher email.`);
        return;
      }

      const firstName = (user as any).profile?.firstName || 'Valued Customer';

      await EmailService.send({
        to: user.email,
        subject: `Your ${reward.voucherType} Voucher - ₹${reward.amount}`,
        html: `
          <h2>Congratulations, ${firstName}!</h2>
          <p>Your voucher is ready to use.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Voucher Code:</strong> ${reward.voucherCode}</p>
            <p><strong>Type:</strong> ${reward.voucherType}</p>
            <p><strong>Value:</strong> ₹${reward.amount}</p>
            ${reward.expiresAt ? `<p><strong>Expires:</strong> ${new Date(reward.expiresAt).toLocaleDateString('en-IN')}</p>` : ''}
          </div>
          <p>Use this code at checkout to redeem your voucher. Thank you for using REZ!</p>
        `,
        text: `Your ${reward.voucherType} voucher code is ${reward.voucherCode} worth ₹${reward.amount}. Use it at checkout on REZ!`
      });

      logger.info(`📧 [Voucher] Email sent to user ${userId} for voucher ${reward.voucherCode}`);
    } catch (emailErr) {
      logger.error(`❌ [Voucher] Failed to send voucher email to user ${userId}:`, emailErr);
      // Don't throw — email failure should not block the voucher claim flow
    }
  }

  /**
   * Check voucher validity
   */
  async checkVoucherValidity(voucherCode: string): Promise<boolean> {
    const referral = await Referral.findOne({
      'rewards.voucherCode': voucherCode
    }).lean();

    if (!referral) return false;

    const reward = referral.rewards;

    if (!reward.voucherCode || reward.voucherCode !== voucherCode) return false;
    if (referral.expiresAt && referral.expiresAt < new Date()) return false;

    return true;
  }

  /**
   * Get default expiry date (1 year from now)
   */
  private getDefaultExpiry(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  /**
   * Get all claimable vouchers for user
   */
  async getClaimableVouchers(userId: string | Types.ObjectId) {
    const referrals = await Referral.find({
      referrer: userId
    }).lean();

    const claimableVouchers = [];

    for (const referral of referrals) {
      const reward = referral.rewards;

      // Check if voucher exists and is not expired
      if (reward.voucherCode) {
        if (!referral.expiresAt || referral.expiresAt > new Date()) {
          claimableVouchers.push({
            referralId: referral._id,
            voucherCode: reward.voucherCode,
            voucherType: reward.voucherType,
            expiresAt: referral.expiresAt,
            description: reward.description
          });
        }
      }
    }

    return claimableVouchers;
  }

  /**
   * Get claimed vouchers history
   */
  async getClaimedVouchers(userId: string | Types.ObjectId) {
    const referrals = await Referral.find({
      referrer: userId,
      'rewards.voucherCode': { $exists: true }
    }).lean();

    const claimedVouchers = [];

    for (const referral of referrals) {
      const reward = referral.rewards;

      if (reward.voucherCode) {
        claimedVouchers.push({
          voucherCode: reward.voucherCode,
          voucherType: reward.voucherType,
          expiresAt: referral.expiresAt,
          description: reward.description,
          referralId: referral._id,
          createdAt: referral.createdAt
        });
      }
    }

    return claimedVouchers.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }
}

export default new VoucherRedemptionService();
