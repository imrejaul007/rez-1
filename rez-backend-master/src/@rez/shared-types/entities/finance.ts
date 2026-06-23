// @ts-nocheck
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

import { FinanceTransactionType, FinanceTransactionStatus } from '../enums/index';

/** Scalar-only metadata bag, with known billing keys surfaced. */
export interface IFinanceTransactionMetadata {
  /** Original consumer-visible reference / display ID. */
  customerRef?: string;
  /** Operator-returned receipt number (post-success). */
  receiptNumber?: string;
  /** Telco / biller circle or region code. */
  circle?: string;
  /** Plan identifier for recharges. */
  planId?: string;
  /** BBPS bill fetch reference (if applicable). */
  bbpsRequestId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface IFinanceTransaction {
  _id?: string;
  userId: string;
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  amount: number;
  /** ISO-4217 currency. Defaults to INR. */
  currency: string;

  /** Operator / biller details for bill pay or recharge. */
  operator?: string;
  billerId?: string;
  accountNumber?: string;

  /** Linked higher-level entities (one or the other). */
  loanApplicationId?: string;
  orderId?: string;

  /** Integration partner + their transaction id. */
  partnerId: string;
  partnerTxId?: string;

  /** Populated on failure. */
  failureReason?: string;

  /** Loyalty coins credited as a result of this transaction. */
  coinsAwarded: number;

  /** Parent reference for audit trails. */
  parentId?: string;
  parentType?: 'Payment' | 'LoanApplication' | 'Order';

  metadata?: IFinanceTransactionMetadata;

  createdAt: Date | string;
  updatedAt: Date | string;
}
