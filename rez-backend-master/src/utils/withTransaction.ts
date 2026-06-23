import mongoose from 'mongoose';
import { logger } from '../config/logger';

/**
 * Execute a callback within a MongoDB transaction.
 * Falls back to running without a transaction if replica set is not available.
 */
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  // Try to start a transaction
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    let result: T;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    session.endSession();
    return result!;
  } catch (err: any) {
    if (session) {
      session.endSession();
    }
    // If transactions aren't supported (no replica set), fall back to sequential
    if (
      err.message?.includes('Transaction') ||
      err.message?.includes('replica set') ||
      err.codeName === 'IllegalOperation' ||
      err.code === 263 ||
      err.code === 20
    ) {
      logger.warn('⚠️ [TRANSACTION] MongoDB transactions not available (no replica set?). Running without transaction.');
      return callback(null);
    }
    throw err;
  }
}
