import { Types } from 'mongoose';
import { ExternalTransaction, IExternalTransaction } from '../models/ExternalTransaction';
import { MerchantIntegration } from '../models/MerchantIntegration';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { walletService } from './walletService';
import { getAdapter, generateTxnHash, NormalizedTransaction } from '../integrations/adapters';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('integration-service');

class IntegrationService {
  /**
   * Process an incoming webhook from an external merchant system.
   * Returns the created/existing ExternalTransaction.
   */
  async processWebhook(
    provider: string,
    rawBody: string,
    rawPayload: any,
    signature: string,
  ): Promise<{ extTxn: IExternalTransaction; isDuplicate: boolean }> {
    const adapter = getAdapter(provider);

    // 1. Normalize payload
    const normalized = adapter.normalize(rawPayload);

    // 2. Find merchant integration
    const integration = await MerchantIntegration.findOne({
      provider: provider.toLowerCase(),
      status: 'active',
      $or: [
        { 'config.externalMerchantId': normalized.merchantExternalId },
        { 'metadata.externalId': normalized.merchantExternalId },
      ],
    }).lean();

    if (!integration) {
      // Try to find by store lookup
      const storeIntegration = await this.findIntegrationByProvider(provider, normalized.merchantExternalId);
      if (!storeIntegration) {
        throw new Error(`No active integration found for provider=${provider}, merchantExternalId=${normalized.merchantExternalId}`);
      }
      return this.createAndProcess(storeIntegration, normalized, rawPayload, rawBody, signature, provider, adapter);
    }

    return this.createAndProcess(integration, normalized, rawPayload, rawBody, signature, provider, adapter);
  }

  private async createAndProcess(
    integration: any,
    normalized: NormalizedTransaction,
    rawPayload: any,
    rawBody: string,
    signature: string,
    provider: string,
    adapter: any,
  ): Promise<{ extTxn: IExternalTransaction; isDuplicate: boolean }> {
    // Verify signature
    if (!adapter.validateSignature(rawBody, signature, integration.webhookSecret)) {
      throw new Error('Invalid webhook signature');
    }

    // Check IP whitelist
    // (IP check handled at route level via req.ip)

    // Generate dedup hash
    const txnHash = generateTxnHash(provider, normalized.externalId, normalized.amount);

    // Check for duplicate
    const existing = await ExternalTransaction.findOne({ txnHash }).lean();
    if (existing) {
      return { extTxn: existing as unknown as IExternalTransaction, isDuplicate: true };
    }

    // Match user by phone/email
    const user = await this.matchUser(normalized.customerRef);

    // Create ExternalTransaction
    const extTxn = await ExternalTransaction.create({
      merchant: integration.merchant,
      store: integration.store,
      integration: integration._id,
      sourceType: integration.integrationType || 'pos',
      provider,
      externalId: normalized.externalId,
      txnHash,
      amount: normalized.amount,
      currency: normalized.currency,
      items: normalized.items,
      customerRef: normalized.customerRef,
      user: user?._id,
      status: 'pending',
      rewardStatus: 'pending',
      rawPayload,
    });

    // Process reward inline (or queue if available)
    let syncStatus = 'success';
    if (user) {
      try {
        await this.issueReward(extTxn, user._id.toString(), integration.store.toString());
      } catch (err) {
        syncStatus = 'reward_failed';
        logger.error('Failed to issue reward for external transaction', err as Error, {
          extTxnId: extTxn._id?.toString(),
        });
      }
    } else {
      // No matched user — mark as verified but reward skipped
      extTxn.status = 'verified';
      extTxn.rewardStatus = 'skipped';
      extTxn.rejectionReason = 'No matching Rez user found for customer reference';
      await extTxn.save();
    }

    // Update integration sync timestamp AFTER processing
    if (syncStatus === 'success') {
      await MerchantIntegration.findByIdAndUpdate(integration._id, {
        $set: { lastSyncAt: new Date(), lastSyncStatus: syncStatus, errorCount: 0 },
      });
    } else {
      await MerchantIntegration.findByIdAndUpdate(integration._id, {
        $set: { lastSyncAt: new Date(), lastSyncStatus: syncStatus },
        $inc: { errorCount: 1 },
      });
    }

    return { extTxn, isDuplicate: false };
  }

  /**
   * Match a Rez user by phone number, email, or loyalty ID.
   */
  async matchUser(customerRef: NormalizedTransaction['customerRef']): Promise<any | null> {
    if (!customerRef) return null;

    const conditions: any[] = [];
    if (customerRef.phone) conditions.push({ phoneNumber: customerRef.phone });
    if (customerRef.email) conditions.push({ email: customerRef.email });
    if (customerRef.loyaltyId) conditions.push({ _id: customerRef.loyaltyId });

    if (conditions.length === 0) return null;

    return User.findOne({ $or: conditions }).select('_id phoneNumber email').lean();
  }

  /**
   * Issue cashback reward for a verified external transaction.
   */
  async issueReward(
    extTxn: IExternalTransaction,
    userId: string,
    storeId: string,
  ): Promise<void> {
    // Get store cashback rate
    const store = await Store.findById(storeId).select('rewardRules').lean();
    const cashbackPercent = (store as any)?.rewardRules?.baseCashbackPercent || 5;
    const rewardAmount = Math.floor(extTxn.amount * (cashbackPercent / 100));

    if (rewardAmount <= 0) {
      await ExternalTransaction.findByIdAndUpdate(extTxn._id, {
        status: 'verified',
        rewardStatus: 'skipped',
        rewardAmount: 0,
        processedAt: new Date(),
        rejectionReason: 'Calculated reward is 0',
      });
      return;
    }

    try {
      const result = await walletService.credit({
        userId,
        amount: rewardAmount,
        source: 'cashback',
        description: `Cashback from ${extTxn.provider} transaction`,
        operationType: 'cashback',
        referenceId: `ext-txn:${extTxn._id}`,
        referenceModel: 'ExternalTransaction',
        metadata: {
          idempotencyKey: `ext-txn:${extTxn._id}`,
          externalId: extTxn.externalId,
          provider: extTxn.provider,
          storeId,
        },
      });

      await ExternalTransaction.findByIdAndUpdate(extTxn._id, {
        status: 'rewarded',
        rewardStatus: 'issued',
        rewardAmount,
        coinTransactionId: result.transactionId,
        processedAt: new Date(),
      });

      logger.info('Reward issued for external transaction', {
        extTxnId: extTxn._id?.toString(),
        userId,
        rewardAmount,
        provider: extTxn.provider,
      });
    } catch (err: any) {
      await ExternalTransaction.findByIdAndUpdate(extTxn._id, {
        status: 'failed',
        rewardStatus: 'failed',
        processedAt: new Date(),
        rejectionReason: err.message || 'Reward issuance failed',
      });
      throw err;
    }
  }

  /**
   * Process a batch of CSV rows as external transactions.
   */
  async processBatch(
    merchantId: string,
    storeId: string,
    provider: string,
    rows: Array<{ externalId: string; amount: number; customerPhone?: string; customerEmail?: string; date?: string }>,
  ): Promise<{ processed: number; failed: number; duplicates: number }> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    let processed = 0;
    let failed = 0;
    let duplicates = 0;

    for (const row of rows) {
      const txnHash = generateTxnHash(provider, row.externalId, row.amount);

      // Check duplicate
      const existing = await ExternalTransaction.findOne({ txnHash }).lean();
      if (existing) {
        duplicates++;
        continue;
      }

      try {
        const user = await this.matchUser({ phone: row.customerPhone, email: row.customerEmail });

        const extTxn = await ExternalTransaction.create({
          merchant: new Types.ObjectId(merchantId),
          store: new Types.ObjectId(storeId),
          sourceType: 'batch',
          provider,
          externalId: row.externalId,
          txnHash,
          amount: row.amount,
          currency: 'INR',
          items: [],
          customerRef: { phone: row.customerPhone, email: row.customerEmail },
          user: user?._id,
          status: 'pending',
          rewardStatus: 'pending',
          rawPayload: row,
          batchId,
        });

        if (user) {
          await this.issueReward(extTxn, user._id.toString(), storeId);
        } else {
          await ExternalTransaction.findByIdAndUpdate(extTxn._id, {
            status: 'verified',
            rewardStatus: 'skipped',
            rejectionReason: 'No matching user',
          });
        }
        processed++;
      } catch {
        failed++;
      }
    }

    return { processed, failed, duplicates };
  }

  /**
   * Find integration by provider name and external merchant ID.
   */
  private async findIntegrationByProvider(provider: string, externalMerchantId: string): Promise<any | null> {
    // Try matching by provider + external merchant ID in config or metadata
    if (externalMerchantId) {
      const byExternalId = await MerchantIntegration.findOne({
        provider: provider.toLowerCase(),
        status: 'active',
        $or: [
          { 'config.externalMerchantId': externalMerchantId },
          { 'metadata.externalId': externalMerchantId },
          { 'config.merchantCode': externalMerchantId },
        ],
      }).lean();
      if (byExternalId) return byExternalId;
    }

    // Fallback: single active integration for this provider (small merchants with one store)
    const singleMatch = await MerchantIntegration.findOne({
      provider: provider.toLowerCase(),
      status: 'active',
    }).lean();
    return singleMatch;
  }

  /**
   * Get integration status for a merchant's store.
   */
  async getIntegrationStatus(merchantId: string, storeId: string) {
    const integrations = await MerchantIntegration.find({
      merchant: merchantId,
      store: storeId,
    }).lean();

    const recentTxns = await ExternalTransaction.countDocuments({
      merchant: merchantId,
      store: storeId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const pendingTxns = await ExternalTransaction.countDocuments({
      merchant: merchantId,
      store: storeId,
      status: 'pending',
    });

    return { integrations, recentTransactions: recentTxns, pendingTransactions: pendingTxns };
  }
}

export const integrationService = new IntegrationService();
export default integrationService;
