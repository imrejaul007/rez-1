import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

// Import all models to trigger their index definitions
import '../models/User';
import '../models/Store';
import '../models/Order';
import '../models/ServiceAppointment';
import '../models/TrialBooking';
import '../models/Review';
import '../models/CoinTransaction';
import '../models/Notification';
import '../models/OTPLog';
import '../models/Cart';
import '../models/Wallet';
import '../models/WalletConfig';
import '../models/Product';
import '../models/MerchantOrder';
import '../models/MerchantUser';
import '../models/Coupon';
import '../models/Discount';
import '../models/Offer';
import '../models/Category';
import '../models/Payment';
import '../models/Transaction';
import '../models/Refund';
import '../models/AnalyticsEvent';
import '../models/AuditLog';
import '../models/AdminAuditLog';
import '../models/SupportTicket';
import '../models/Message';
import '../models/Notification';

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('Connected to MongoDB');

    // Get all registered models
    const modelNames = mongoose.modelNames();
    logger.info(`Found ${modelNames.length} registered models`);

    // Sync indexes for each model
    let successCount = 0;
    let errorCount = 0;

    for (const name of modelNames) {
      try {
        const model = mongoose.model(name);
        await model.syncIndexes();
        logger.info(`✅ Synced indexes for ${name}`);
        successCount++;
      } catch (error) {
        logger.error(`❌ Failed to sync indexes for ${name}:`, error);
        errorCount++;
      }
    }

    // Summary
    logger.info('='.repeat(50));
    logger.info(`Index Sync Summary:`);
    logger.info(`  ✅ Success: ${successCount}`);
    logger.info(`  ❌ Errors: ${errorCount}`);
    logger.info('='.repeat(50));

    // List top indexes by size
    if (process.env.SHOW_INDEX_STATS === 'true') {
      logger.info('Index statistics (sample):');
      const indexStats = await mongoose.connection.db?.stats();
      logger.info(JSON.stringify(indexStats, null, 2));
    }

    await mongoose.disconnect();
    logger.info('Done! All indexes synced.');
    process.exit(successCount > 0 && errorCount === 0 ? 0 : 1);
  } catch (error) {
    logger.error('Fatal error during index sync:', error);
    process.exit(1);
  }
}

main().catch(logger.error);
