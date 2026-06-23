import Partner, { IPartner, PARTNER_LEVELS } from '../models/Partner';
import { User } from '../models/User';
import { Order } from '../models/Order';
import mongoose from 'mongoose';
import { pct } from '../utils/currency';
import { invalidatePartnerEarningsCache } from './walletCacheService';
import { logger } from '../config/logger';

/**
 * Partner Service
 * Handles business logic for partner program
 */
class PartnerService {
  /**
   * Get or create partner profile for user
   */
  async getOrCreatePartner(userId: string): Promise<any> {
    let partner = await Partner.findOne({ userId });
    
    if (!partner) {
      // Get user details
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create new partner profile
      const userName = user.profile?.firstName 
        ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() 
        : user.phoneNumber || 'Partner';
      
      const userEmail = user.email || user.phoneNumber || `user${userId.slice(-8)}@rez.app`;
      
      partner = await Partner.createDefaultPartner(
        userId,
        userName,
        userEmail,
        user.profile?.avatar
      ) as any;
    }
    
    if (!partner) {
      throw new Error('Failed to create partner profile');
    }
    
    return partner;
  }
  
  /**
   * Update partner progress when order is completed
   */
  async updatePartnerProgress(userId: string, orderId: string): Promise<void> {
    const partner = await this.getOrCreatePartner(userId);
    const order = await Order.findById(orderId).lean();
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Update order count
    partner.totalOrders += 1;
    partner.ordersThisLevel += 1;
    partner.totalSpent += order.totalAmount || order.totals?.total || 0;
    partner.lastActivityDate = new Date();
    
    // Update milestones
    partner.milestones.forEach((milestone: any) => {
      if (partner.totalOrders >= milestone.orderCount && !milestone.achieved) {
        milestone.achieved = true;
      }
    });
    
    // Update jackpot progress
    partner.jackpotProgress.forEach((jackpot: any) => {
      if (partner.totalSpent >= jackpot.spendAmount && !jackpot.achieved) {
        jackpot.achieved = true;
      }
    });
    
    // Update task progress
    const purchaseTask = partner.tasks.find((t: any) => t.type === 'purchase');
    if (purchaseTask) {
      purchaseTask.progress.current += 1;
      if (purchaseTask.progress.current >= purchaseTask.progress.target) {
        purchaseTask.completed = true;
        purchaseTask.completedAt = new Date();
      }
    }
    
    // Check if partner can upgrade level
    if (typeof partner.canUpgradeLevel === 'function' && partner.canUpgradeLevel()) {
      const oldLevel = partner.currentLevel.level;
      partner.upgradeLevel();
      const newLevel = partner.currentLevel.level;
      
      // Add bonus earnings for level upgrade
      const levelBonus = newLevel * 500; // ₹500, ₹1000, ₹1500
      partner.earnings.total += levelBonus;
      partner.earnings.pending += levelBonus;
      partner.earnings.thisMonth += levelBonus;
      
      // Add new level-specific offers (FIXED: Issue #3 - Level-based offers)
      try {
        const { LEVEL_OFFERS } = require('../models/Partner');
        const now = new Date();
        let newOffers: any[] = [];
        
        if (newLevel === 2) {
          // Influencer level - add Influencer offers
          newOffers = LEVEL_OFFERS.INFLUENCER.map((offer: any) => ({
            ...offer,
            validFrom: now,
            validUntil: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
            claimed: false
          }));
        } else if (newLevel === 3) {
          // Ambassador level - add Ambassador offers
          newOffers = LEVEL_OFFERS.AMBASSADOR.map((offer: any) => ({
            ...offer,
            validFrom: now,
            validUntil: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
            claimed: false
          }));
        }
        
        // Add new offers to partner (filter out duplicates by title)
        const existingTitles = new Set(partner.claimableOffers.map((o: any) => o.title));
        newOffers.forEach(offer => {
          if (!existingTitles.has(offer.title)) {
            partner.claimableOffers.push(offer);
          }
        });
        
        logger.info(`🎁 [LEVEL UP] Added ${newOffers.length} new offers for level ${newLevel}`);
      } catch (error) {
        logger.error('❌ [LEVEL UP] Error adding new offers:', error);
      }
      
      // Credit bonus via rewardEngine (unified: wallet + CoinTransaction + ledger)
      try {
        const { rewardEngine } = await import('../core/rewardEngine');
        await rewardEngine.issue({
          userId: userId.toString(),
          amount: levelBonus,
          rewardType: 'partner_bonus',
          source: 'bonus',
          description: `Partner level up bonus (Level ${oldLevel} → ${newLevel})`,
          operationType: 'loyalty_credit',
          referenceId: `partner-levelup:${userId}:${oldLevel}:${newLevel}`,
          referenceModel: 'Partner',
          metadata: {
            partnerEarning: true,
            partnerEarningType: 'milestone',
            partnerLevel: newLevel,
            oldLevel,
            idempotencyKey: `partner:levelup:${userId}:${oldLevel}:${newLevel}`,
          },
        });
        // Invalidate partner earnings cache
        invalidatePartnerEarningsCache(userId).catch((err) => logger.error('[PartnerService] Partner earnings cache invalidation failed after level up', { error: err.message, userId }));
        logger.info(`[LEVEL UP] Upgraded Level ${oldLevel} → ${newLevel}, Added ${levelBonus} to wallet`);
      } catch (error) {
        logger.error('[LEVEL UP] Error adding bonus to wallet:', error);
        // Don't fail the upgrade if wallet update fails
      }
    }
    
    // Check for level expiry and handle reset (FIXED: Issue #2)
    partner.handleLevelExpiry();
    
    await partner.save();
  }
  
  /**
   * Claim milestone reward (with MongoDB transactions for data integrity)
   */
  async claimMilestoneReward(userId: string, orderCount: number): Promise<IPartner> {
    // Start MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      logger.info(`🔄 [MILESTONE CLAIM] Starting claim for user ${userId}, milestone ${orderCount}`);
      
      const partner = await this.getOrCreatePartner(userId);
      
      const milestone = partner.milestones.find((m: any) => m.orderCount === orderCount);
      if (!milestone) {
        throw new Error('Milestone not found');
      }
      
      if (!milestone.achieved) {
        throw new Error('Milestone not yet achieved');
      }
      
      if (milestone.claimedAt) {
        throw new Error('Milestone reward already claimed');
      }
      
      // Mark as claimed
      milestone.claimedAt = new Date();
      
      // Add reward to earnings based on type
      if (milestone.reward.type === 'cashback' || milestone.reward.type === 'points') {
        partner.earnings.total += milestone.reward.value;
        partner.earnings.pending += milestone.reward.value;
        partner.earnings.thisMonth += milestone.reward.value;

        // Ensure wallet exists
        const { Wallet } = require('../models/Wallet');
        let wallet = await Wallet.findOne({ user: userId }).session(session);
        if (!wallet) {
          logger.info(`⚠️ [MILESTONE] Wallet not found, creating new wallet for user ${userId}`);
          wallet = await (Wallet as any).createForUser(
            new mongoose.Types.ObjectId(userId),
            { session }
          );
        }
        if (!wallet) {
          throw new Error('Failed to create wallet');
        }

        if (milestone.reward.type === 'cashback') {
          // Use CoinTransaction as single source of truth — it handles atomic wallet update
          const { CoinTransaction } = require('../models/CoinTransaction');
          await CoinTransaction.create([{
            user: userId, type: 'earned', amount: milestone.reward.value,
            balance: wallet.balance.available + milestone.reward.value, source: 'cashback',
            description: `Partner milestone reward: ${milestone.name || 'Milestone'}`,
            metadata: {
              partnerEarning: true,
              partnerEarningType: 'milestone',
              milestoneId: milestone.id,
              partnerLevel: partner.level,
              idempotencyKey: `partner:milestone:${userId}:${orderCount}`,
            }
          }], { session });
          // Atomic wallet update within session
          await Wallet.findOneAndUpdate(
            { user: userId },
            {
              $inc: {
                'balance.available': milestone.reward.value,
                'balance.total': milestone.reward.value,
                'statistics.totalEarned': milestone.reward.value,
                'statistics.totalCashback': milestone.reward.value,
              },
            },
            { session }
          );
          logger.info(`✅ [MILESTONE] Added ₹${milestone.reward.value} cashback to wallet`);
        } else if (milestone.reward.type === 'points') {
          wallet.loyaltyPoints = (wallet.loyaltyPoints || 0) + milestone.reward.value;
          await wallet.save({ session });
          logger.info(`✅ [MILESTONE] Added ${milestone.reward.value} loyalty points`);
        }
      }
      
      partner.lastActivityDate = new Date();
      await partner.save({ session });
      
      // Commit transaction
      await session.commitTransaction();
      // Invalidate partner earnings cache after successful commit
      invalidatePartnerEarningsCache(userId).catch((err) => logger.error('[PartnerService] Partner earnings cache invalidation failed after milestone claim', { error: err.message, userId }));
      logger.info(`✅ [MILESTONE CLAIM] Successfully claimed milestone ${orderCount} for user ${userId}`);

      return partner;

    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error(`❌ [MILESTONE CLAIM] Transaction failed, rolled back:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Claim task reward (with MongoDB transactions for data integrity)
   */
  async claimTaskReward(userId: string, taskTitle: string): Promise<IPartner> {
    // Start MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      logger.info(`🔄 [TASK CLAIM] Starting claim for user ${userId}, task ${taskTitle}`);
      
      const partner = await this.getOrCreatePartner(userId);
      
      const task = partner.tasks.find((t: any) => t.title === taskTitle);
      if (!task) {
        throw new Error('Task not found');
      }
      
      if (!task.completed) {
        throw new Error('Task not yet completed');
      }
      
      if (task.claimed) {
        throw new Error('Task reward already claimed');
      }
      
      // Mark as claimed
      task.claimed = true;
      task.claimedAt = new Date();
      
      // Add reward to earnings
      if (task.reward.type === 'cashback' || task.reward.type === 'points') {
        partner.earnings.total += task.reward.value;
        partner.earnings.pending += task.reward.value;
        partner.earnings.thisMonth += task.reward.value;

        // Ensure wallet exists
        const { Wallet } = require('../models/Wallet');
        let wallet = await Wallet.findOne({ user: userId }).session(session);
        if (!wallet) {
          logger.info(`⚠️ [TASK] Wallet not found, creating new wallet for user ${userId}`);
          wallet = await (Wallet as any).createForUser(
            new mongoose.Types.ObjectId(userId),
            { session }
          );
        }
        if (!wallet) {
          throw new Error('Failed to create wallet');
        }

        if (task.reward.type === 'cashback') {
          // Use CoinTransaction as single source of truth — no direct wallet.balance mutation
          const { CoinTransaction } = require('../models/CoinTransaction');
          await CoinTransaction.create([{
            user: userId, type: 'earned', amount: task.reward.value,
            balance: wallet.balance.available + task.reward.value, source: 'cashback',
            description: `Partner task reward: ${task.name || 'Task'}`,
            metadata: {
              partnerEarning: true,
              partnerEarningType: 'task',
              taskId: task.id,
              partnerLevel: partner.level,
              idempotencyKey: `partner:task:${userId}:${taskTitle}`,
            }
          }], { session });
          // Atomic wallet update within session
          await Wallet.findOneAndUpdate(
            { user: userId },
            {
              $inc: {
                'balance.available': task.reward.value,
                'balance.total': task.reward.value,
                'statistics.totalEarned': task.reward.value,
                'statistics.totalCashback': task.reward.value,
              },
            },
            { session }
          );
          logger.info(`✅ [TASK] Added ₹${task.reward.value} cashback to wallet`);
        } else if (task.reward.type === 'points') {
          wallet.loyaltyPoints = (wallet.loyaltyPoints || 0) + task.reward.value;
          await wallet.save({ session });
          logger.info(`✅ [TASK] Added ${task.reward.value} loyalty points`);
        }
      }
      
      partner.lastActivityDate = new Date();
      await partner.save({ session });
      
      // Commit transaction
      await session.commitTransaction();
      // Invalidate partner earnings cache after successful commit
      invalidatePartnerEarningsCache(userId).catch((err) => logger.error('[PartnerService] Partner earnings cache invalidation failed after task claim', { error: err.message, userId }));
      logger.info(`✅ [TASK CLAIM] Successfully claimed task ${taskTitle} for user ${userId}`);

      return partner;
      
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error(`❌ [TASK CLAIM] Transaction failed, rolled back:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Claim jackpot milestone reward (with MongoDB transactions for data integrity)
   */
  async claimJackpotReward(userId: string, spendAmount: number): Promise<IPartner> {
    // Start MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      logger.info(`🔄 [JACKPOT CLAIM] Starting claim for user ${userId}, spend amount ₹${spendAmount}`);
      
      const partner = await this.getOrCreatePartner(userId);
      
      const jackpot = partner.jackpotProgress.find((j: any) => j.spendAmount === spendAmount);
      if (!jackpot) {
        throw new Error('Jackpot milestone not found');
      }
      
      if (!jackpot.achieved) {
        throw new Error('Jackpot milestone not yet achieved');
      }
      
      if (jackpot.claimedAt) {
        throw new Error('Jackpot reward already claimed');
      }
      
      // Mark as claimed
      jackpot.claimedAt = new Date();
      
      // Add reward to earnings and wallet
      if (jackpot.reward.type === 'cashback' || jackpot.reward.type === 'points' || jackpot.reward.type === 'voucher') {
        partner.earnings.total += jackpot.reward.value;
        partner.earnings.pending += jackpot.reward.value;
        partner.earnings.thisMonth += jackpot.reward.value;

        // Ensure wallet exists
        const { Wallet } = require('../models/Wallet');
        let wallet = await Wallet.findOne({ user: userId }).session(session).lean();
        if (!wallet) {
          logger.info(`⚠️ [JACKPOT] Wallet not found, creating new wallet for user ${userId}`);
          wallet = await (Wallet as any).createForUser(
            new mongoose.Types.ObjectId(userId),
            { session }
          );
        }
        if (!wallet) {
          throw new Error('Failed to create wallet');
        }

        const idempotencyKey = `partner:jackpot:${userId}:${spendAmount}`;

        if (jackpot.reward.type === 'cashback') {
          // CoinTransaction + atomic wallet update — no direct wallet.balance mutation
          const { CoinTransaction } = require('../models/CoinTransaction');
          await CoinTransaction.create([{
            user: userId, type: 'earned', amount: jackpot.reward.value,
            balance: wallet.balance.available + jackpot.reward.value, source: 'cashback',
            description: `Partner jackpot cashback reward`,
            metadata: {
              partnerEarning: true,
              partnerEarningType: 'cashback',
              jackpotId: jackpot.id,
              partnerLevel: partner.level,
              idempotencyKey,
            }
          }], { session });
          await Wallet.findOneAndUpdate(
            { user: userId },
            {
              $inc: {
                'balance.available': jackpot.reward.value,
                'balance.total': jackpot.reward.value,
                'statistics.totalEarned': jackpot.reward.value,
                'statistics.totalCashback': jackpot.reward.value,
              },
            },
            { session }
          );
          logger.info(`✅ [JACKPOT] Added ₹${jackpot.reward.value} cashback to wallet`);
        } else if (jackpot.reward.type === 'points') {
          wallet.loyaltyPoints = (wallet.loyaltyPoints || 0) + jackpot.reward.value;
          await wallet.save({ session });
          logger.info(`✅ [JACKPOT] Added ${jackpot.reward.value} loyalty points`);
        } else if (jackpot.reward.type === 'voucher') {
          const { CoinTransaction } = require('../models/CoinTransaction');
          await CoinTransaction.create([{
            user: userId, type: 'earned', amount: jackpot.reward.value,
            balance: wallet.balance.available + jackpot.reward.value, source: 'bonus',
            description: `Partner jackpot voucher reward`,
            metadata: {
              partnerEarning: true,
              partnerEarningType: 'cashback',
              jackpotId: jackpot.id,
              partnerLevel: partner.level,
              idempotencyKey,
            }
          }], { session });
          await Wallet.findOneAndUpdate(
            { user: userId },
            {
              $inc: {
                'balance.available': jackpot.reward.value,
                'balance.total': jackpot.reward.value,
                'statistics.totalEarned': jackpot.reward.value,
              },
            },
            { session }
          );
          logger.info(`✅ [JACKPOT] Added ₹${jackpot.reward.value} voucher to wallet`);
        }
      }
      
      partner.lastActivityDate = new Date();
      await partner.save({ session });
      
      // Commit transaction
      await session.commitTransaction();
      // Invalidate partner earnings cache after successful commit
      invalidatePartnerEarningsCache(userId).catch((err) => logger.error('[PartnerService] Partner earnings cache invalidation failed after jackpot claim', { error: err.message, userId }));
      logger.info(`✅ [JACKPOT CLAIM] Successfully claimed jackpot ₹${spendAmount} for user ${userId}`);

      return partner;
      
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error(`❌ [JACKPOT CLAIM] Transaction failed, rolled back:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Claim offer (with wallet integration)
   */
  async claimOffer(userId: string, offerTitle: string): Promise<{
    partner: IPartner;
    voucherCode: string;
  }> {
    const partner = await this.getOrCreatePartner(userId);
    
    const offer = partner.claimableOffers.find((o: any) => o.title === offerTitle);
    if (!offer) {
      throw new Error('Offer not found');
    }
    
    if (offer.claimed) {
      throw new Error('Offer already claimed');
    }
    
    const now = new Date();
    if (now < offer.validFrom || now > offer.validUntil) {
      throw new Error('Offer is not valid at this time');
    }
    
    // Generate voucher code
    const voucherCode = `PARTNER${Date.now().toString().slice(-8)}`;
    
    // Mark as claimed
    offer.claimed = true;
    offer.claimedAt = new Date();
    offer.voucherCode = voucherCode;
    
    partner.lastActivityDate = new Date();
    
    // Add voucher to wallet (FIXED: Issue #5 - Wallet integration)
    try {
      const { Wallet } = require('../models/Wallet');
      const mongoose = require('mongoose');
      let wallet = await Wallet.findOne({ user: userId });
      
      if (!wallet) {
        logger.info(`⚠️ [OFFER CLAIM] Wallet not found, creating for user ${userId}`);
        wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
      }
      
      if (wallet) {
        // Add voucher to wallet transactions
        wallet.transactions.push({
          type: 'credit',
          amount: offer.maxDiscount || offer.discount, // Use maxDiscount or discount value
          description: `Partner Offer: ${offer.title}`,
          source: 'partner_offer',
          status: 'completed',
          metadata: {
            voucherCode,
            offerTitle: offer.title,
            category: offer.category,
            discount: offer.discount
          }
        });
        
        // Update wallet statistics
        wallet.statistics.vouchersEarned = (wallet.statistics.vouchersEarned || 0) + 1;
        
        await wallet.save();
        logger.info(`✅ [OFFER CLAIM] Voucher added to wallet: ${voucherCode}`);
      }
    } catch (error) {
      logger.error('❌ [OFFER CLAIM] Error adding voucher to wallet:', error);
      // Don't fail the claim if wallet update fails
    }
    
    await partner.save();
    
    return {
      partner,
      voucherCode
    };
  }
  
  /**
   * Apply voucher to order (FIXED: Issue #4 - Order integration)
   */
  async applyVoucher(userId: string, voucherCode: string, orderAmount: number): Promise<{
    valid: boolean;
    discount: number;
    offerTitle: string;
    error?: string;
  }> {
    try {
      const partner = await Partner.findOne({ userId }).lean();
      
      if (!partner) {
        return { valid: false, discount: 0, offerTitle: '', error: 'Partner profile not found' };
      }
      
      // Find the offer by voucher code
      const offer = partner.claimableOffers.find((o: any) => 
        o.voucherCode === voucherCode && o.claimed === true
      );
      
      if (!offer) {
        return { valid: false, discount: 0, offerTitle: '', error: 'Invalid voucher code' };
      }
      
      // Check if voucher is expired
      const now = new Date();
      if (now > offer.validUntil) {
        return { valid: false, discount: 0, offerTitle: offer.title, error: 'Voucher has expired' };
      }
      
      // Check minimum purchase requirement
      if (offer.minPurchase && orderAmount < offer.minPurchase) {
        return { 
          valid: false, 
          discount: 0, 
          offerTitle: offer.title, 
          error: `Minimum purchase of ₹${offer.minPurchase} required` 
        };
      }
      
      // Calculate discount
      let discount = 0;
      if (offer.discount > 0 && offer.discount <= 100) {
        // Percentage discount
        discount = pct(orderAmount, offer.discount);
      } else if (offer.discount > 100) {
        // Flat discount (voucher amount)
        discount = offer.discount;
      }
      
      // Apply maximum discount cap
      if (offer.maxDiscount && discount > offer.maxDiscount) {
        discount = offer.maxDiscount;
      }
      
      logger.info(`✅ [VOUCHER APPLY] ${voucherCode} applied: ₹${discount} discount on ₹${orderAmount} order`);
      
      return {
        valid: true,
        discount,
        offerTitle: offer.title
      };
    } catch (error) {
      logger.error('❌ [VOUCHER APPLY] Error applying voucher:', error);
      return { valid: false, discount: 0, offerTitle: '', error: 'Failed to apply voucher' };
    }
  }
  
  /**
   * Mark voucher as used after order completion
   */
  async markVoucherUsed(userId: string, voucherCode: string): Promise<void> {
    try {
      const partner = await Partner.findOne({ userId });
      
      if (!partner) {
        logger.error('❌ [VOUCHER USED] Partner not found');
        return;
      }
      
      // Find and mark the voucher as used by removing it
      partner.claimableOffers = partner.claimableOffers.filter(
        (o: any) => o.voucherCode !== voucherCode
      );
      
      await partner.save();
      logger.info(`✅ [VOUCHER USED] ${voucherCode} marked as used and removed`);
    } catch (error) {
      logger.error('❌ [VOUCHER USED] Error marking voucher as used:', error);
    }
  }
  
  /**
   * Get partner statistics
   */
  async getPartnerStats(userId: string): Promise<{
    totalPartners: number;
    userRank: number;
    averageOrders: number;
    topPerformers: any[];
  }> {
    const partner = await this.getOrCreatePartner(userId);
    
    const totalPartners = await Partner.countDocuments({ isActive: true });
    
    // Get user rank based on total orders
    const partnersWithMoreOrders = await Partner.countDocuments({
      totalOrders: { $gt: partner.totalOrders },
      isActive: true
    });
    const userRank = partnersWithMoreOrders + 1;
    
    // Calculate average orders
    const avgResult = await Partner.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgOrders: { $avg: '$totalOrders' } } }
    ]);
    const averageOrders = avgResult[0]?.avgOrders || 0;
    
    // Get top 5 performers
    const topPerformers = await Partner.find({ isActive: true })
      .sort({ totalOrders: -1 })
      .limit(5)
      .select('name totalOrders currentLevel.name avatar').lean();
    
    return {
      totalPartners,
      userRank,
      averageOrders: Math.round(averageOrders * 10) / 10,
      topPerformers
    };
  }
  
  /**
   * Calculate profile completion percentage from USER profile
   */
  async calculateProfileCompletion(userId: string): Promise<number> {
    try {
      const user = await User.findById(userId).lean();
      if (!user) return 0;
      
      let completed = 0;
      let total = 4; // Total fields to check
      
      // Check User profile fields (not Partner fields)
      if (user.profile?.firstName && user.profile.firstName.trim().length > 0) completed++;
      if (user.email && user.email.includes('@')) completed++;
      if (user.profile?.avatar && user.profile.avatar.trim().length > 0) completed++;
      if (user.phoneNumber) completed++;
      
      return Math.round((completed / total) * 100);
    } catch (error) {
      logger.error('Error calculating profile completion:', error);
      return 0;
    }
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(userId: string, taskType: string, progressValue?: number): Promise<any> {
    const partner = await this.getOrCreatePartner(userId);
    
    // Find the task by type
    const task = partner.tasks.find((t: any) => t.type === taskType);
    
    if (!task) {
      throw new Error(`Task type "${taskType}" not found`);
    }
    
    // Update progress based on task type
    if (taskType === 'profile') {
      // For profile completion, calculate based on actual USER profile data
      const completion = await this.calculateProfileCompletion(userId);
      task.progress.current = completion >= 100 ? 1 : 0;
    } else if (progressValue !== undefined) {
      // For other tasks, use provided progress value
      task.progress.current = progressValue;
    }
    
    // Check if task is completed
    if (task.progress.current >= task.progress.target) {
      task.completed = true;
      task.completedAt = new Date();
    }
    
    partner.lastActivityDate = new Date();
    await partner.save();
    
    return partner;
  }

  /**
   * Update partner when user profile is updated
   */
  async syncProfileCompletion(userId: string): Promise<void> {
    try {
      const partner = await this.getOrCreatePartner(userId);
      const profileTask = partner.tasks.find((t: any) => t.type === 'profile');
      
      if (profileTask) {
        // Calculate from actual USER profile data
        const completion = await this.calculateProfileCompletion(userId);
        logger.info(`📝 [PROFILE] User ${userId} profile completion: ${completion}%`);
        
        profileTask.progress.current = completion >= 100 ? 1 : 0;
        
        if (completion >= 100 && !profileTask.completed) {
          profileTask.completed = true;
          profileTask.completedAt = new Date();
          logger.info(`✅ [PROFILE] Profile task completed for user ${userId}`);
        }
        
        await partner.save();
      }
    } catch (error) {
      logger.error('Error syncing profile completion:', error);
    }
  }

  /**
   * Get partner dashboard data safely (without auto-enrolling)
   * Returns enrolled: false if user is not a partner, otherwise returns full dashboard
   */
  async getPartnerDashboardSafe(userId: string): Promise<any> {
    const partner = await Partner.findOne({ userId }).lean();

    if (!partner) {
      return {
        enrolled: false,
        profile: null,
        milestones: [],
        tasks: [],
        jackpotProgress: [],
        claimableOffers: [],
        faqs: [],
      };
    }

    const dashboard = await this.getPartnerDashboard(userId);
    return { enrolled: true, ...dashboard };
  }

  /**
   * Get partner dashboard data
   */
  async getPartnerDashboard(userId: string): Promise<any> {
    const partner = await this.getOrCreatePartner(userId);

    // Use instance methods if available, otherwise compute inline
    // (methods may be missing if the document was returned without hydration)
    const daysRemaining = typeof partner.getDaysRemaining === 'function'
      ? partner.getDaysRemaining()
      : Math.max(0, Math.ceil((new Date(partner.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    const ordersNeeded = typeof partner.getOrdersNeededForNextLevel === 'function'
      ? partner.getOrdersNeededForNextLevel()
      : (() => {
          const nextLevel = (partner.currentLevel?.level || 1) + 1;
          if (nextLevel > 3) return 0;
          const nextConfig = Object.values(PARTNER_LEVELS).find(l => l.level === nextLevel);
          return nextConfig ? Math.max(0, nextConfig.requirements.orders - (partner.ordersThisLevel || 0)) : 0;
        })();

    // Fetch all independent data in parallel for better performance
    const [user, reviewCount, shareCount] = await Promise.all([
      User.findById(userId).select('profile email phoneNumber referral').lean(),
      Order.countDocuments({
        user: userId,
        'rating.rating': { $exists: true, $ne: null }
      }),
      (async () => {
        const { Activity } = require('../models/Activity');
        return Activity.countDocuments({ user: userId, type: 'share' });
      })(),
    ]);

    // Calculate profile completion inline (avoids redundant User.findById)
    let profileCompletion = 0;
    if (user) {
      let completed = 0;
      const total = 4;
      if (user.profile?.firstName && user.profile.firstName.trim().length > 0) completed++;
      if (user.email && user.email.includes('@')) completed++;
      if (user.profile?.avatar && user.profile.avatar.trim().length > 0) completed++;
      if (user.phoneNumber) completed++;
      profileCompletion = Math.round((completed / total) * 100);
    }

    // Sync profile task
    const profileTask = partner.tasks.find((t: any) => t.type === 'profile');
    if (profileTask) {
      profileTask.progress.current = profileCompletion >= 100 ? 1 : 0;
      if (profileCompletion >= 100 && !profileTask.completed) {
        profileTask.completed = true;
        profileTask.completedAt = new Date();
      }
    }

    // Sync review task with actual reviews count
    try {
      const reviewTask = partner.tasks.find((t: any) => t.type === 'review');
      if (reviewTask) {
        reviewTask.progress.current = Math.min(reviewCount, reviewTask.progress.target);
        if (reviewTask.progress.current >= reviewTask.progress.target && !reviewTask.completed) {
          reviewTask.completed = true;
          reviewTask.completedAt = new Date();
        }
      }
      logger.info(`📝 [REVIEW] User has ${reviewCount} reviews`);
    } catch (error) {
      logger.error('Error syncing review task:', error);
    }

    // Sync referral task with actual referrals count
    try {
      const referralCount = user?.referral?.totalReferrals || 0;
      const referralTask = partner.tasks.find((t: any) => t.type === 'referral');
      if (referralTask) {
        referralTask.progress.current = Math.min(referralCount, referralTask.progress.target);
        if (referralTask.progress.current >= referralTask.progress.target && !referralTask.completed) {
          referralTask.completed = true;
          referralTask.completedAt = new Date();
        }
      }
      logger.info(`👥 [REFERRAL] User has ${referralCount} referrals`);
    } catch (error) {
      logger.error('Error syncing referral task:', error);
    }

    // Sync social task with actual shares count
    try {
      const socialTask = partner.tasks.find((t: any) => t.type === 'social');
      if (socialTask) {
        socialTask.progress.current = Math.min(shareCount, socialTask.progress.target);
        if (socialTask.progress.current >= socialTask.progress.target && !socialTask.completed) {
          socialTask.completed = true;
          socialTask.completedAt = new Date();
        }
      }
      logger.info(`📱 [SOCIAL] User has ${shareCount} shares`);
    } catch (error) {
      logger.error('Error syncing social task:', error);
    }
    
    // Update milestone achievement status based on current orders
    let milestonesUpdated = false;
    logger.info(`📊 [MILESTONE CHECK] User has ${partner.totalOrders} orders and spent ₹${partner.totalSpent}`);
    
    partner.milestones.forEach((milestone: any) => {
      const wasAchieved = milestone.achieved;
      if (partner.totalOrders >= milestone.orderCount && !milestone.achieved) {
        milestone.achieved = true;
        milestonesUpdated = true;
        logger.info(`✅ [MILESTONE] Unlocked: ${milestone.orderCount} orders (${milestone.reward.title})`);
      }
    });
    
    // Update jackpot achievement status based on current spending
    partner.jackpotProgress.forEach((jackpot: any) => {
      if (partner.totalSpent >= jackpot.spendAmount && !jackpot.achieved) {
        jackpot.achieved = true;
        milestonesUpdated = true;
        logger.info(`✅ [JACKPOT] Unlocked: ₹${jackpot.spendAmount} (${jackpot.title})`);
      }
    });
    
    // Save if any milestones were updated
    if (milestonesUpdated) {
      logger.info(`💾 [MILESTONE] Saving ${partner.milestones.filter((m: any) => m.achieved).length} achieved milestones`);
      await partner.save();
    } else {
      logger.info(`ℹ️ [MILESTONE] No new milestones unlocked`);
    }
    
    return {
      profile: {
        _id: partner._id,
        userId: partner.userId,
        name: partner.name,
        email: partner.email,
        avatar: partner.avatar,
        phoneNumber: partner.phoneNumber,
        profileCompletion, // Add profile completion percentage
        level: {
          level: partner.currentLevel.level,
          name: partner.currentLevel.name,
          requirements: partner.currentLevel.requirements
        },
        ordersThisLevel: partner.ordersThisLevel,
        totalOrders: partner.totalOrders,
        totalSpent: partner.totalSpent || 0, // Add total spent for jackpot display
        daysRemaining,
        validUntil: partner.validUntil.toISOString().split('T')[0],
        earnings: partner.earnings
      },
      milestones: partner.milestones.map((m: any) => ({
        id: `milestone-${m.orderCount}`,
        orderCount: m.orderCount,
        orderNumber: m.orderCount, // Add for frontend compatibility
        reward: {
          ...m.reward,
          isClaimed: !!m.claimedAt // Add isClaimed flag
        },
        achieved: m.achieved,
        isCompleted: m.achieved, // Add for frontend compatibility
        isLocked: false, // Milestones are never locked, just not achieved
        claimedAt: m.claimedAt
      })),
      tasks: partner.tasks.map((t: any) => ({
        id: t.title,
        title: t.title,
        description: t.description,
        type: t.type, // Add the missing type field
        reward: {
          ...t.reward,
          isClaimed: t.claimed // Map claimed to reward.isClaimed for frontend compatibility
        },
        progress: t.progress,
        // For profile task, add the actual completion percentage
        profileCompletionPercent: t.type === 'profile' ? profileCompletion : undefined,
        isCompleted: t.completed, // Map completed to isCompleted for frontend compatibility
        completed: t.completed, // Keep for backward compatibility
        claimed: t.claimed // Keep for backward compatibility
      })),
      jackpotProgress: partner.jackpotProgress.map((j: any) => ({
        id: j.title,
        spendAmount: j.spendAmount,
        amount: j.spendAmount, // Add for frontend compatibility
        title: j.title,
        description: j.description,
        reward: j.reward,
        achieved: j.achieved,
        isUnlocked: j.achieved, // Map to frontend property
        isCompleted: j.achieved, // Map to frontend property
        currentProgress: partner.totalSpent || 0,
        claimedAt: j.claimedAt // Add claimed date for frontend
      })),
      claimableOffers: partner.claimableOffers.map((o: any) => ({
        id: o.title,
        title: o.title,
        description: o.description,
        discount: o.discount,
        category: o.category,
        validUntil: o.validUntil.toISOString().split('T')[0],
        termsAndConditions: o.termsAndConditions,
        claimed: o.claimed,
        isClaimed: o.claimed, // Map to frontend property
        voucherCode: o.voucherCode
      })),
      faqs: this.getDefaultFAQs()
    };
  }
  
  /**
   * Get default FAQs
   */
  private getDefaultFAQs() {
    return [
      {
        id: 'faq-1',
        category: 'general',
        question: 'What is the REZ Partner Program?',
        answer: 'The REZ Partner Program is a loyalty program that rewards you for your purchases and engagement. As you make more orders, you unlock higher levels with better benefits.'
      },
      {
        id: 'faq-2',
        category: 'levels',
        question: 'How do I upgrade to the next level?',
        answer: 'You upgrade levels by completing the required number of orders within the specified timeframe. For example, complete 15 orders in 44 days to become a Partner.'
      },
      {
        id: 'faq-3',
        category: 'rewards',
        question: 'How do I claim my rewards?',
        answer: 'Once you achieve a milestone or complete a task, you can claim your reward directly from your partner dashboard. Rewards are added to your wallet or earnings.'
      },
      {
        id: 'faq-4',
        category: 'rewards',
        question: 'What happens when my partner status expires?',
        answer: 'If you don\'t maintain the required number of orders within the timeframe, you\'ll need to re-qualify for your level. However, your progress and previous achievements are saved.'
      },
      {
        id: 'faq-5',
        category: 'transactions',
        question: 'How can I track my earnings?',
        answer: 'You can track all your partner earnings, including pending and paid amounts, in the earnings section of your partner dashboard.'
      },
      {
        id: 'faq-6',
        category: 'general',
        question: 'Can I share my partner benefits with family?',
        answer: 'Partner benefits are tied to your account, but you can refer family members to join REZ and both earn referral rewards.'
      }
    ];
  }
  
  /**
   * Request payout
   */
  async requestPayout(
    userId: string,
    amount: number,
    method: string
  ): Promise<{
    success: boolean;
    message: string;
    payoutId: string;
  }> {
    const partner = await this.getOrCreatePartner(userId);
    
    if (amount > partner.earnings.pending) {
      throw new Error('Insufficient pending earnings');
    }
    
    if (amount < 100) {
      throw new Error('Minimum payout amount is ₹100');
    }
    
    // Update earnings
    partner.earnings.pending -= amount;
    partner.earnings.paid += amount;
    
    await partner.save();
    
    // In production, integrate with payment gateway
    const payoutId = `PAYOUT${Date.now()}`;
    
    return {
      success: true,
      message: `Payout of ₹${amount} has been initiated via ${method}`,
      payoutId
    };
  }
}

export default new PartnerService();

