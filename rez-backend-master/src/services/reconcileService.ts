import mongoose from 'mongoose';
import { Reconciliation, IReconciliation } from '../models/Reconciliation';
import { WebOrder } from '../models/WebOrder';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

export interface ReconciliationTransaction {
  paymentId: string;
  type: 'digital' | 'cash';
  amount: number;
  status: 'completed' | 'pending';
  createdAt: string;
}

export interface ReconciliationResult {
  date: string;
  storeSlug: string;
  totalDigital: number;
  totalCash: number;
  expectedCash: number;
  discrepancy: number;
  discrepancyPercent: number;
  status: 'open' | 'reconciled' | 'flagged';
  reconciledAt?: string;
  reconciledBy?: string;
  transactions: ReconciliationTransaction[];
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function computeDiscrepancyFields(record: IReconciliation): {
  discrepancy: number;
  discrepancyPercent: number;
  status: 'open' | 'reconciled' | 'flagged';
} {
  const discrepancy = record.totalCash - record.expectedCash;
  const total = record.totalDigital + record.totalCash;
  const discrepancyPercent = total > 0 ? Math.abs((discrepancy / total) * 100) : 0;

  let status: 'open' | 'reconciled' | 'flagged' = 'open';
  if (record.status === 'reconciled') {
    status = 'reconciled';
  } else if (discrepancyPercent > 5) {
    status = 'flagged';
  }

  return { discrepancy, discrepancyPercent, status };
}

function buildResult(record: IReconciliation, txList?: ReconciliationTransaction[]): ReconciliationResult {
  const { discrepancy, discrepancyPercent, status } = computeDiscrepancyFields(record);
  // Use provided txList (fresh from fetch) if available, otherwise use stored transactions
  const transactions = (txList ?? record.transactions).map((t) => ({
    paymentId: t.paymentId,
    type: t.type as 'digital' | 'cash',
    amount: t.amount,
    status: t.status as 'completed' | 'pending',
    createdAt: t.createdAt ?? '',
  }));
  return {
    date: record.date,
    storeSlug: record.storeSlug,
    totalDigital: record.totalDigital,
    totalCash: record.totalCash,
    expectedCash: record.expectedCash,
    discrepancy,
    discrepancyPercent,
    status: record.status === 'reconciled' ? 'reconciled' : status,
    reconciledAt: record.reconciledAt?.toISOString(),
    reconciledBy: record.reconciledBy,
    transactions,
  };
}

/**
 * Fetches today's completed digital orders for a store and calculates totals.
 */
async function fetchTodayDigitalTotals(
  storeSlug: string,
  date: string,
): Promise<{ totalDigital: number; transactions: ReconciliationTransaction[] }> {
  const startDate = new Date(`${date}T00:00:00.000Z`);
  const endDate = new Date(`${date}T23:59:59.999Z`);

  const orders = await WebOrder.find({
    storeSlug,
    paymentStatus: 'paid',
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .select('_id total createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const totalDigital = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const transactions: ReconciliationTransaction[] = orders.map((o) => ({
    paymentId: String(o._id),
    type: 'digital',
    amount: o.total || 0,
    status: 'completed',
    createdAt: (o.createdAt as Date).toISOString(),
  }));

  return { totalDigital, transactions };
}

/**
 * Gets or creates a reconciliation record for a store on a given date.
 * Creates with today's digital totals if no record exists.
 */
export async function getOrCreateReconciliation(storeSlug: string, date: string): Promise<ReconciliationResult> {
  const existing = await Reconciliation.findOne({ storeSlug, date }).lean();

  if (existing) {
    return buildResult(existing as unknown as IReconciliation);
  }

  // Ensure store exists
  const store = await Store.findOne({ slug: storeSlug }).select('_id merchantId').lean();
  if (!store) {
    throw new Error(`Store not found: ${storeSlug}`);
  }

  const { totalDigital, transactions } = await fetchTodayDigitalTotals(storeSlug, date);

  const record = await Reconciliation.create({
    storeSlug,
    merchantId: (store as any).merchantId,
    date,
    totalDigital,
    totalCash: 0,
    expectedCash: 0,
    discrepancy: 0,
    discrepancyPercent: 0,
    status: 'open',
    transactions,
  });

  return buildResult(record as unknown as IReconciliation, transactions);
}

/**
 * Submits a cash entry for a store on a given date.
 * Calculates expected cash and flags discrepancy.
 */
export async function submitCashEntry(
  storeSlug: string,
  date: string,
  cashAmount: number,
): Promise<ReconciliationResult> {
  // Ensure a record exists and get fresh transactions for display
  const { transactions } = await fetchTodayDigitalTotals(storeSlug, date);
  await getOrCreateReconciliation(storeSlug, date);

  const record = await Reconciliation.findOne({ storeSlug, date });
  if (!record) {
    throw new Error(`Reconciliation not found after creation for ${storeSlug} on ${date}`);
  }

  if (record.status === 'reconciled') {
    throw new Error('Cannot modify a reconciled reconciliation');
  }

  record.totalCash = cashAmount;
  // expectedCash = what cash was expected to equal (the digital total is the reference point
  // since cash is the variable entered by the merchant).
  // Discrepancy = entered cash - digital total. A large discrepancy means
  // either digital was undercounted or cash was miscounted.
  record.expectedCash = record.totalDigital || 0;

  const { discrepancy, discrepancyPercent, status } = computeDiscrepancyFields(record);
  record.discrepancy = discrepancy;
  record.discrepancyPercent = discrepancyPercent;

  // Auto-flag if discrepancy > 5% (computeDiscrepancyFields never returns 'reconciled')
  if (status === 'flagged') {
    record.status = 'flagged';
  }

  await record.save();
  return buildResult(record, transactions);
}

/**
 * Locks and reconciles the reconciliation record.
 */
export async function lockReconciliation(
  storeSlug: string,
  date: string,
  merchantId: string,
): Promise<ReconciliationResult> {
  const record = await Reconciliation.findOne({ storeSlug, date });

  if (!record) {
    throw new Error(`Reconciliation not found for ${storeSlug} on ${date}`);
  }

  if (record.status === 'reconciled') {
    return buildResult(record);
  }

  record.status = 'reconciled';
  record.reconciledAt = new Date();
  record.reconciledBy = merchantId;

  await record.save();
  return buildResult(record);
}

/**
 * Exports reconciliation data as a CSV string.
 */
export async function exportReconciliationCSV(storeSlug: string, date: string): Promise<string> {
  const record = await Reconciliation.findOne({ storeSlug, date }).lean();

  if (!record) {
    throw new Error(`Reconciliation not found for ${storeSlug} on ${date}`);
  }

  const header = 'Time,Type,Amount (Rs),Status';
  const rows = (record as unknown as IReconciliation).transactions.map(
    (t: { paymentId: string; type: string; amount: number; status: string; createdAt?: string }) => {
      const time = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('en-IN') : '';
      const amountRs = (t.amount / 100).toFixed(2);
      return `${time},${t.type},${amountRs},${t.status}`;
    },
  );

  const summary = [
    '',
    `Date,${date}`,
    `Store,${storeSlug}`,
    `Total Digital (Rs),${(record.totalDigital / 100).toFixed(2)}`,
    `Total Cash (Rs),${(record.totalCash / 100).toFixed(2)}`,
    `Expected Cash (Rs),${(record.expectedCash / 100).toFixed(2)}`,
    `Discrepancy (Rs),${(record.discrepancy / 100).toFixed(2)}`,
    `Discrepancy %,${record.discrepancyPercent.toFixed(2)}`,
    `Status,${record.status}`,
  ].join('\n');

  return [header, ...rows, summary].join('\n');
}

export default {
  getOrCreateReconciliation,
  submitCashEntry,
  lockReconciliation,
  exportReconciliationCSV,
};
