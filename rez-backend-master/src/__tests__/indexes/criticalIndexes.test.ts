/**
 * Verifies that critical indexes exist after ensureIndexes() runs.
 * Requires a MongoDB connection — runs in integration test mode.
 */
import mongoose from 'mongoose';
import { ensureIndexes } from '../../jobs/ensureIndexes';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-test-indexes';

describe('Critical Indexes', () => {
  beforeAll(async () => {
    // Only connect if not already connected (shared test environment uses global setup.ts)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    await ensureIndexes();
  });
  afterAll(async () => {
    // Only disconnect if we initiated the connection (readyState check avoids
    // tearing down the shared connection used by other test suites)
  });

  async function getIndexNames(collection: string): Promise<string[]> {
    const indexes = await mongoose.connection.collection(collection).indexes();
    return indexes.map((i: any) => i.name);
  }

  it('ledgerentries has balance compound index', async () => {
    const names = await getIndexNames('ledgerentries');
    expect(names).toContain('ledger_balance_compound');
  });

  it('payments has razorpayOrderId index', async () => {
    const names = await getIndexNames('payments');
    expect(names).toContain('payment_razorpay_order');
  });

  it('usercashbacks has due-for-credit index', async () => {
    const names = await getIndexNames('usercashbacks');
    expect(names).toContain('cashback_due_for_credit');
  });

  it('cointransactions has idempotency unique index', async () => {
    const names = await getIndexNames('cointransactions');
    // Either from schema or ensureIndexes
    const hasIdempotency = names.some((n) => n.includes('idempotency'));
    expect(hasIdempotency).toBe(true);
  });
});
