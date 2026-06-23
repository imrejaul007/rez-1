/**
 * orchestratorReadinessService.ts
 *
 * Analyzes shadow-mode orchestrator activity to determine if promotion to 'live' is safe.
 *
 * Readiness criteria:
 *   1. >= 100 shadow runs in the last 48 hours
 *   2. Zero divergence events (shadow path disagreed with legacy path)
 *   3. Zero errors in shadow mode
 *   4. Legacy path success rate >= 99%
 *
 * Access via: GET /api/admin/orchestrator/readiness
 */

import { createServiceLogger } from '../config/logger';
import { getAllOrchestratorFlags } from './orchestratorFlags';

const logger = createServiceLogger('orchestrator-readiness');

export interface OrchestratorReadiness {
  ready: boolean;
  currentMode: string;
  shadowRunCount: number;
  divergenceCount: number;
  errorCount: number;
  legacySuccessRate: number;
  reasons: string[];
}

export interface ReadinessReport {
  timestamp: string;
  flags: Record<string, string>;
  payments: OrchestratorReadiness;
  refunds: OrchestratorReadiness;
  overallReady: boolean;
  recommendation: string;
}

async function analyzeOrchestrator(type: 'payment' | 'refund'): Promise<OrchestratorReadiness> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const txnType = type === 'payment' ? 'topup' : 'refund';
  const flags = getAllOrchestratorFlags();
  const flagKey = type === 'payment' ? 'payments.orchestrator_mode' : 'refunds.orchestrator_mode';
  const currentMode = flags[flagKey] || 'unknown';

  try {
    // Dynamic import to avoid circular dependency at module load time
    const mongoose = require('mongoose');

    // Use the TransactionLedger model if available, otherwise return "not enough data"
    let TransactionLedger: any;
    try {
      TransactionLedger = mongoose.model('TransactionLedger');
    } catch {
      return {
        ready: false,
        currentMode,
        shadowRunCount: 0,
        divergenceCount: 0,
        errorCount: 0,
        legacySuccessRate: 0,
        reasons: ['TransactionLedger model not registered — no shadow data available yet'],
      };
    }

    const [shadowRuns, divergences, errors, legacyTotal, legacySuccess] = await Promise.all([
      TransactionLedger.countDocuments({
        type: txnType,
        'metadata.shadowMode': true,
        createdAt: { $gte: since },
      }),
      TransactionLedger.countDocuments({
        type: txnType,
        'metadata.shadowMode': true,
        'metadata.shadowDivergence': true,
        createdAt: { $gte: since },
      }),
      TransactionLedger.countDocuments({
        type: txnType,
        'metadata.shadowMode': true,
        'metadata.shadowError': { $exists: true },
        createdAt: { $gte: since },
      }),
      TransactionLedger.countDocuments({
        type: txnType,
        createdAt: { $gte: since },
      }),
      TransactionLedger.countDocuments({
        type: txnType,
        status: 'SUCCESS',
        createdAt: { $gte: since },
      }),
    ]);

    const legacySuccessRate = legacyTotal > 0 ? legacySuccess / legacyTotal : 0;
    const reasons: string[] = [];

    if (shadowRuns < 100) reasons.push(`Only ${shadowRuns} shadow runs (need >= 100 in last 48h)`);
    if (divergences > 0) reasons.push(`${divergences} divergence events detected`);
    if (errors > 0) reasons.push(`${errors} shadow errors detected`);
    if (legacySuccessRate < 0.99) reasons.push(`Legacy success rate ${(legacySuccessRate * 100).toFixed(1)}% < 99%`);

    return {
      ready: reasons.length === 0,
      currentMode,
      shadowRunCount: shadowRuns,
      divergenceCount: divergences,
      errorCount: errors,
      legacySuccessRate,
      reasons,
    };
  } catch (err) {
    logger.error('Failed to analyze orchestrator readiness', { err });
    return {
      ready: false,
      currentMode,
      shadowRunCount: 0,
      divergenceCount: 0,
      errorCount: 0,
      legacySuccessRate: 0,
      reasons: ['Failed to query shadow logs: ' + (err as Error).message],
    };
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [payments, refunds] = await Promise.all([analyzeOrchestrator('payment'), analyzeOrchestrator('refund')]);

  const overallReady = payments.ready && refunds.ready;
  const recommendation = overallReady
    ? 'Safe to promote both orchestrators. Use POST /api/admin/orchestrator/flags with value=live for each flag.'
    : 'Not ready for promotion. Review reasons above and collect more shadow data (48h window).';

  return {
    timestamp: new Date().toISOString(),
    flags: getAllOrchestratorFlags() as Record<string, string>,
    payments,
    refunds,
    overallReady,
    recommendation,
  };
}
