"use strict";
/**
 * Finance transaction entity — canonical shape for FinanceTransaction.
 *
 * Covers BNPL, bill pay, recharge, EMI, credit card payments. One row
 * per customer-initiated fintech action. 4 statuses, 5 transaction types
 * (see `FinanceTransactionType` / `FinanceTransactionStatus` in enums).
 *
 * v2 hardening: `metadata: Record<string, any>` → typed
 * `IFinanceTransactionMetadata` with scalar-only catchall + known keys
 * surfaced.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=finance.js.map