import { logger } from '../config/logger';
/**
 * Travel Cashback Service
 *
 * Handles cashback lifecycle for travel bookings (flights, hotels, trains, bus, cab, packages).
 * Mirrors mallAffiliateService patterns for wallet atomicity, audit trails, and refund handling.
 *
 * Lifecycle: booking created → payment verified (held) → travel completed + verification days (credited) → refund (clawed_back)
 */

import mongoose, { Types } from 'mongoose';
import { ServiceBooking, IServiceBooking } from '../models/ServiceBooking';
import { ServiceCategory } from '../models/ServiceCategory';
import { UserCashback } from '../models/UserCashback';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { Transaction } from '../models/Transaction';
import { Lean } from '../types/lean';

// Travel category slugs
const TRAVEL_CATEGORY_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];

// Verification days per category (days after travel date before cashback is credited)
const VERIFICATION_DAYS: Record<string, number> = {
  flights: 3,
  hotels: 2,
  trains: 2,
  bus: 1,
  cab: 1,
  packages: 7,
};

// Refund tiers per category (sorted descending by hoursBeforeDeparture)
const REFUND_TIERS: Record<string, Array<{ hoursBeforeDeparture: number; refundPercentage: number }>> = {
  flights: [
    { hoursBeforeDeparture: 72, refundPercentage: 100 },
    { hoursBeforeDeparture: 48, refundPercentage: 75 },
    { hoursBeforeDeparture: 24, refundPercentage: 50 },
    { hoursBeforeDeparture: 0, refundPercentage: 0 },
  ],
  hotels: [
    { hoursBeforeDeparture: 72, refundPercentage: 100 },
    { hoursBeforeDeparture: 48, refundPercentage: 75 },
    { hoursBeforeDeparture: 24, refundPercentage: 50 },
    { hoursBeforeDeparture: 0, refundPercentage: 25 },
  ],
  trains: [
    { hoursBeforeDeparture: 48, refundPercentage: 100 },
    { hoursBeforeDeparture: 24, refundPercentage: 75 },
    { hoursBeforeDeparture: 4, refundPercentage: 50 },
    { hoursBeforeDeparture: 0, refundPercentage: 0 },
  ],
  bus: [
    { hoursBeforeDeparture: 24, refundPercentage: 100 },
    { hoursBeforeDeparture: 12, refundPercentage: 75 },
    { hoursBeforeDeparture: 4, refundPercentage: 50 },
    { hoursBeforeDeparture: 0, refundPercentage: 0 },
  ],
  cab: [
    { hoursBeforeDeparture: 2, refundPercentage: 100 },
    { hoursBeforeDeparture: 1, refundPercentage: 50 },
    { hoursBeforeDeparture: 0, refundPercentage: 0 },
  ],
  packages: [
    { hoursBeforeDeparture: 168, refundPercentage: 100 },
    { hoursBeforeDeparture: 72, refundPercentage: 75 },
    { hoursBeforeDeparture: 24, refundPercentage: 50 },
    { hoursBeforeDeparture: 0, refundPercentage: 25 },
  ],
};

class TravelCashbackService {

  /**
   * Check if a category slug is a travel category
   */
  isTravelCategory(slug: string): boolean {
    return TRAVEL_CATEGORY_SLUGS.includes(slug);
  }

  /**
   * Get verification days for a category
   */
  getVerificationDays(categorySlug: string): number {
    return VERIFICATION_DAYS[categorySlug] || 7;
  }

  /**
   * Get refund tiers for a category
   */
  getRefundTiers(categorySlug: string): Array<{ hoursBeforeDeparture: number; refundPercentage: number }> {
    return REFUND_TIERS[categorySlug] || REFUND_TIERS.flights;
  }

  /**
   * Hold cashback — called after payment is verified.
   * Sets cashbackStatus to 'held' without touching the wallet.
   */
  async holdCashback(bookingId: string): Promise<void> {
    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    if (booking.cashbackStatus !== 'pending') {
      logger.info(`⚠️ [TRAVEL-CASHBACK] Booking ${booking.bookingNumber} already in cashbackStatus: ${booking.cashbackStatus}`);
      return;
    }

    booking.cashbackStatus = 'held';
    booking.cashbackHeldAt = new Date();
    await booking.save();

    logger.info(`🔒 [TRAVEL-CASHBACK] Cashback held for booking ${booking.bookingNumber}: ₹${booking.pricing.cashbackEarned}`);
  }

  /**
   * Credit cashback for a single booking.
   *
   * Uses MongoDB transaction for atomicity across:
   * UserCashback + Wallet + CoinTransaction + Transaction + ServiceBooking
   *
   * Mirrors mallAffiliateService.creditCashbackForPurchase pattern.
   */
  async creditCashbackForBooking(booking: IServiceBooking | Lean<IServiceBooking>): Promise<void> {
    if (!booking.user) {
      throw new Error('Booking has no associated user');
    }

    const cashbackAmount = booking.pricing.cashbackEarned || 0;
    if (cashbackAmount <= 0) {
      logger.info(`⚠️ [TRAVEL-CASHBACK] No cashback to credit for booking ${booking.bookingNumber}`);
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // CRITICAL: Double-credit guard — re-read booking within transaction
      const freshBooking = await ServiceBooking.findById(booking._id).session(session).lean();
      if (!freshBooking || freshBooking.cashbackStatus === 'credited') {
        await session.abortTransaction();
        session.endSession();
        logger.info(`⚠️ [TRAVEL-CASHBACK] Booking ${booking.bookingNumber} already credited, skipping`);
        return;
      }
      if (freshBooking.cashbackStatus !== 'held') {
        await session.abortTransaction();
        session.endSession();
        throw new Error(`Cannot credit booking with cashbackStatus: ${freshBooking.cashbackStatus}`);
      }

      // Get category info for description
      const category = await ServiceCategory.findById(booking.serviceCategory).session(session).lean();
      const categoryName = category?.name || 'Travel';

      // Create UserCashback entry (isRedeemed: false — redeemed means user SPENT it, not received it)
      const [cashback] = await UserCashback.create([{
        user: booking.user,
        amount: cashbackAmount,
        cashbackRate: booking.pricing.cashbackPercentage || 0,
        source: 'special_offer',
        status: 'credited',
        description: `Travel cashback from ${categoryName} booking`,
        earnedDate: booking.completedAt || booking.createdAt,
        creditedDate: new Date(),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        metadata: {
          orderAmount: booking.pricing.total,
          productCategories: ['travel'],
          storeName: categoryName,
        },
        pendingDays: 0,
        isRedeemed: false,
      }], { session });

      // Credit to wallet via rewardEngine (unified reward issuance)
      const { rewardEngine } = await import('../core/rewardEngine');
      await rewardEngine.issue({
        userId: booking.user.toString(),
        amount: cashbackAmount,
        rewardType: 'travel_cashback',
        source: 'cashback',
        description: `Travel cashback from ${categoryName} booking`,
        operationType: 'travel_cashback',
        referenceId: `travel-cashback:${booking._id}`,
        referenceModel: 'ServiceBooking',
        metadata: {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          categorySlug: category?.slug,
          orderAmount: booking.pricing.total,
          cashbackRate: booking.pricing.cashbackPercentage,
        },
        category: 'travel-experiences',
        skipCap: true,
        skipMultiplier: true,
        session,
      });

      const balanceBefore = 0; // Used by Transaction record below (approximate)

      // Create Transaction audit record (formal financial ledger)
      await Transaction.create([{
        user: booking.user,
        type: 'credit',
        category: 'cashback',
        amount: cashbackAmount,
        currency: 'RC',
        description: `Travel cashback from ${categoryName} booking (${booking.bookingNumber})`,
        source: {
          type: 'cashback',
          reference: booking._id,
        },
        status: { current: 'completed', history: [{ status: 'completed', timestamp: new Date() }] },
        balanceBefore,
        balanceAfter: balanceBefore + cashbackAmount,
        isReversible: true,
        retryCount: 0,
        maxRetries: 0,
      }], { session });

      // Update booking cashback status
      freshBooking.cashbackStatus = 'credited';
      freshBooking.cashbackCreditedAt = new Date();
      freshBooking.statusHistory.push({
        status: 'cashback_credited',
        timestamp: new Date(),
        note: `₹${cashbackAmount} cashback credited to wallet`,
      });
      await freshBooking.save({ session });

      await session.commitTransaction();

      // walletService.credit already handles cache invalidation
    } catch (error) {
      await session.abortTransaction();
      logger.error('❌ [TRAVEL-CASHBACK] Error crediting cashback:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate refund amount based on category-specific refund tiers.
   * Returns the refund percentage and calculated amounts.
   */
  calculateRefundAmount(booking: Lean<IServiceBooking>, categorySlug?: string): {
    refundPercentage: number;
    refundAmount: number;
    cashbackDeduction: number;
  } {
    const tiers = booking.refundPolicy?.tiers?.length
      ? booking.refundPolicy.tiers
      : this.getRefundTiers(categorySlug || 'flights');

    // Calculate hours until departure
    const now = new Date();
    const bookingDateTime = new Date(booking.bookingDate);
    const [hours, minutes] = (booking.timeSlot?.start || '00:00').split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilDeparture = Math.max(0, (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Find the applicable tier (first tier where hoursUntilDeparture >= hoursBeforeDeparture)
    // Tiers are sorted descending by hoursBeforeDeparture
    const sortedTiers = [...tiers].sort((a, b) => b.hoursBeforeDeparture - a.hoursBeforeDeparture);
    let refundPercentage = 0;

    for (const tier of sortedTiers) {
      if (hoursUntilDeparture >= tier.hoursBeforeDeparture) {
        refundPercentage = tier.refundPercentage;
        break;
      }
    }

    const totalPrice = booking.pricing.total || 0;
    const cashbackEarned = booking.pricing.cashbackEarned || 0;

    const refundAmount = Math.round((totalPrice * refundPercentage) / 100 * 100) / 100;
    const cashbackDeduction = refundPercentage === 100
      ? cashbackEarned
      : Math.round((cashbackEarned * refundPercentage) / 100 * 100) / 100;

    return { refundPercentage, refundAmount, cashbackDeduction };
  }

  /**
   * Handle refund — deducts cashback from wallet if already credited.
   * Supports partial refunds via optional refundAmount parameter.
   *
   * Uses MongoDB transaction for atomicity.
   * CRITICAL: If wallet deduction fails, the refund throws (not silently marked).
   */
  async handleRefund(
    bookingId: string,
    reason: string,
    refundAmount?: number
  ): Promise<IServiceBooking> {
    const booking = await ServiceBooking.findById(bookingId)
      .populate('serviceCategory', 'name slug').lean();
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // Idempotent: if already clawed back, return without error
    if (booking.cashbackStatus === 'clawed_back') {
      logger.info(`⚠️ [TRAVEL-CASHBACK] Booking ${booking.bookingNumber} cashback already clawed back`);
      return booking as unknown as IServiceBooking;
    }

    // If cashback was already credited, deduct from wallet atomically
    if (booking.cashbackStatus === 'credited' && booking.user) {
      const cashbackEarned = booking.pricing.cashbackEarned || 0;

      // Calculate deduction amount (full or proportional for partial refund)
      let deductAmount = cashbackEarned;
      if (refundAmount !== undefined && refundAmount > 0 && refundAmount < booking.pricing.total) {
        const refundRatio = refundAmount / booking.pricing.total;
        deductAmount = Math.round(refundRatio * cashbackEarned * 100) / 100;
      }

      if (deductAmount <= 0) {
        booking.cashbackStatus = 'clawed_back';
        await booking.save();
        return booking as unknown as IServiceBooking;
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Deduct from wallet atomically — $gte guard prevents double-spend on concurrent requests
        const walletBefore = await Wallet.findOne({ user: booking.user }).session(session).lean();
        if (!walletBefore || !walletBefore.isActive) {
          throw new Error(`Wallet not found or inactive for user ${booking.user} — cannot process refund deduction. Manual admin review required.`);
        }

        const balanceBefore = walletBefore.balance.available;

        const deductResult = await Wallet.findOneAndUpdate(
          {
            user: booking.user,
            'balance.available': { $gte: deductAmount },
            'coins': { $elemMatch: { type: 'rez', amount: { $gte: deductAmount } } }
          },
          {
            $inc: {
              'balance.available': -deductAmount,
              'coins.$.amount': -deductAmount,
              'statistics.totalCashback': -deductAmount
            },
            $set: { lastTransactionAt: new Date() }
          },
          { new: true, session }
        );

        if (!deductResult) {
          throw new Error(`Insufficient wallet balance for refund deduction. User ${booking.user}, needed ${deductAmount}, available ${balanceBefore}. Manual admin review required.`);
        }

        // Create CoinTransaction reversal record
        await CoinTransaction.create([{
          user: booking.user.toString(),
          type: 'spent',
          amount: deductAmount,
          balance: Math.max(0, balanceBefore - deductAmount),
          source: 'cashback',
          description: `Travel cashback reversed${refundAmount ? ' (partial refund)' : ''}: ${reason}`,
          metadata: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            orderAmount: booking.pricing.total,
            refundAmount: refundAmount || booking.pricing.total,
            deductedCashback: deductAmount,
            refundReason: reason,
          },
          category: 'travel-experiences',
        }], { session });

        // Create Transaction reversal record (formal financial ledger)
        await Transaction.create([{
          user: booking.user,
          type: 'debit',
          category: 'refund',
          amount: deductAmount,
          currency: 'RC',
          description: `Travel cashback reversed${refundAmount ? ' (partial)' : ''} for ${booking.bookingNumber}: ${reason}`,
          source: {
            type: 'refund',
            reference: booking._id,
          },
          status: { current: 'completed', history: [{ status: 'completed', timestamp: new Date() }] },
          balanceBefore,
          balanceAfter: Math.max(0, balanceBefore - deductAmount),
          isReversible: false,
          retryCount: 0,
          maxRetries: 0,
        }], { session });

        // Update booking cashback status
        const freshBooking = await ServiceBooking.findById(booking._id).session(session);
        if (freshBooking) {
          freshBooking.cashbackStatus = 'clawed_back';
          freshBooking.statusHistory.push({
            status: 'cashback_clawed_back',
            timestamp: new Date(),
            note: `₹${deductAmount} cashback deducted from wallet: ${reason}`,
          });
          await freshBooking.save({ session });
        }

        await session.commitTransaction();

        // Sync wallet → User model (denormalized cache, outside transaction)
        try {
          await deductResult.syncWithUser();
        } catch (syncError) {
          logger.warn(`⚠️ [TRAVEL-CASHBACK] User wallet sync failed after refund (non-blocking):`, syncError);
        }

        logger.info(`💸 [TRAVEL-CASHBACK] Deducted ₹${deductAmount} from wallet for user ${booking.user} (refund for ${booking.bookingNumber})`);
      } catch (txError) {
        await session.abortTransaction();
        throw txError;
      } finally {
        session.endSession();
      }
    } else {
      // Not credited yet (held or pending) — just update cashback status, no wallet mutation
      booking.cashbackStatus = 'clawed_back';
      booking.statusHistory.push({
        status: 'cashback_clawed_back',
        timestamp: new Date(),
        note: `Cashback cancelled (was ${booking.cashbackStatus}): ${reason}`,
      });
      await booking.save();
    }

    logger.info(`💸 [TRAVEL-CASHBACK] Refund processed for booking ${booking.bookingNumber}`);
    return booking as unknown as IServiceBooking;
  }

  /**
   * Credit pending travel cashback in batches.
   * Finds bookings where:
   * - cashbackStatus is 'held'
   * - completedAt + verificationDays has passed
   * Processes in batches of 200 with failure tracking.
   */
  async creditPendingCashback(): Promise<{ credited: number; total: number; failed: number }> {
    const BATCH_SIZE = 200;
    const MAX_BATCHES = 50;
    const failedBookingIds = new Set<string>();

    try {
      let credited = 0;
      let total = 0;
      let failed = 0;
      let batchCount = 0;

      do {
        // Find bookings ready for credit:
        // cashbackStatus = 'held' AND completedAt exists AND enough time has passed
        const now = new Date();
        const batch = await ServiceBooking.find({
          cashbackStatus: 'held',
          completedAt: { $exists: true, $ne: null },
          _id: { $nin: Array.from(failedBookingIds).map(id => new Types.ObjectId(id)) },
          // Use $expr to do per-document date math with verificationDays
          $expr: {
            $lte: [
              { $add: ['$completedAt', { $multiply: ['$verificationDays', 86400000] }] },
              now
            ]
          }
        })
          .limit(BATCH_SIZE)
          .populate('serviceCategory', 'name slug').lean();

        if (batch.length === 0) break;

        total += batch.length;
        batchCount++;

        for (const booking of batch) {
          try {
            await this.creditCashbackForBooking(booking);
            credited++;
          } catch (error: any) {
            failed++;
            failedBookingIds.add(booking._id.toString());
            logger.error(`Failed to credit travel cashback for booking ${booking.bookingNumber}: ${error.message}`);
          }
        }

        logger.info(`💰 [TRAVEL-CASHBACK] Batch ${batchCount}: ${batch.length} attempted, ${credited} credited, ${failed} failed`);
      } while (batchCount < MAX_BATCHES);

      if (batchCount >= MAX_BATCHES) {
        logger.warn(`⚠️ [TRAVEL-CASHBACK] Hit max batch limit (${MAX_BATCHES}). Some bookings may remain unprocessed.`);
      }

      logger.info(`💰 [TRAVEL-CASHBACK] Credit job complete: ${credited}/${total} credited, ${failed} failed`);
      return { credited, total, failed };
    } catch (error) {
      logger.error('❌ [TRAVEL-CASHBACK] Error in credit pending cashback job:', error);
      throw error;
    }
  }
}

// Export singleton
const travelCashbackService = new TravelCashbackService();
export default travelCashbackService;
export { TRAVEL_CATEGORY_SLUGS, VERIFICATION_DAYS, REFUND_TIERS };
