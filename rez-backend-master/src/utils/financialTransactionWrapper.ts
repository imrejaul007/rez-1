import { ClientSession } from 'mongoose';
import { withTransaction } from './withTransaction';
import { ledgerService, RecordEntryParams } from '../services/ledgerService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('financial-txn');

export interface FinancialTxnContext {
  session: ClientSession | null;
  /** Records a double-entry ledger pair within the current transaction session */
  recordLedger: (params: RecordEntryParams) => Promise<string>;
}

/**
 * Wraps a financial operation in a MongoDB transaction that guarantees
 * ledger + wallet mutation atomicity. If the transaction fails,
 * both the wallet update and ledger entry roll back together.
 *
 * Usage:
 *   await runFinancialTxn(async ({ session, recordLedger }) => {
 *     await recordLedger({ debitAccount, creditAccount, amount, ... });
 *     await Wallet.findOneAndUpdate(..., { session });
 *   });
 */
export async function runFinancialTxn<T>(
  callback: (ctx: FinancialTxnContext) => Promise<T>
): Promise<T> {
  return withTransaction(async (session) => {
    const ctx: FinancialTxnContext = {
      session,
      recordLedger: (params: RecordEntryParams) =>
        ledgerService.recordEntry(params, session ?? undefined),
    };
    return callback(ctx);
  });
}
