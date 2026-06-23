/**
 * Migration Registry
 *
 * Lists all one-time data migration scripts for the REZ production database.
 * Run individually using ts-node:
 *
 *   MONGO_URI=mongodb+srv://... npx ts-node src/scripts/migrations/001-statusHistory-to-timeline.ts
 *
 * Order matters: run in sequence (001 → 007). Each script is idempotent
 * and safe to re-run, but running in order avoids any dependency issues.
 *
 * Production checklist before running any script:
 *   [ ] Take a MongoDB Atlas snapshot / backup
 *   [ ] Test script against a staging database first
 *   [ ] Run during low-traffic window
 *   [ ] Monitor Atlas metrics during execution
 *   [ ] Verify counts in the script output match expectations
 */

export interface MigrationEntry {
  id: string;
  name: string;
  description: string;
  bugRef: string;
  collections: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  type: 'write' | 'validate';
  notes?: string;
}

export const migrations: MigrationEntry[] = [
  {
    id: '001',
    name: 'statusHistory-to-timeline',
    description:
      'Migrate order statusHistory (written by merchant-service) into the timeline field (used by backend). Unsets statusHistory after merge.',
    bugRef: 'DM-C3',
    collections: ['orders'],
    risk: 'MEDIUM',
    type: 'write',
    notes: 'Use bulk operations. Adds updatedBy: "migration-001" to migrated timeline entries for traceability.',
  },
  {
    id: '002',
    name: 'nuqta-to-rez-cointype',
    description:
      'Rename coinType: "nuqta" to coinType: "rez" across all coin-related collections. Legacy brand name causes Mongoose validation errors on .save().',
    bugRef: 'DM-C4',
    collections: ['cointransactions', 'coinledgers', 'wallets', 'userloyalties'],
    risk: 'LOW',
    type: 'write',
    notes:
      'wallets collection uses arrayFilters for nested coins array. Existing migrate-coin-type-nuqta.ts covers cointransactions+coingifts+walletbalances — this script fills the gap for coinledgers and userloyalties.',
  },
  {
    id: '003',
    name: 'merchantwallet-merchantid-to-merchant',
    description:
      'Convert merchantId (string) → merchant (ObjectId) and storeId (string) → store (ObjectId) in merchantwallets collection. Fixes the split-visibility bug between wallet-service and merchant-service.',
    bugRef: 'DM-H3',
    collections: ['merchantwallets'],
    risk: 'HIGH',
    type: 'write',
    notes:
      'CAUTION: Docs with BOTH old and new field are skipped (requires manual review). Only processes docs with the old field AND missing the new field. Validates that string values are valid 24-char hex before converting.',
  },
  {
    id: '004',
    name: 'notification-read-to-isread',
    description:
      'Standardize MerchantNotification on isRead field. Promotes read=true to isRead=true where they conflict, then removes the legacy read field from all documents.',
    bugRef: 'DM-M1',
    collections: ['merchantnotifications'],
    risk: 'LOW',
    type: 'write',
    notes:
      'After running, remove read: Boolean and its index from MerchantNotification schema (rez-wallet-service/src/models/MerchantNotification.ts).',
  },
  {
    id: '005',
    name: 'segment-casing-fix',
    description:
      'Rename User.segment value "verified_differentlyAbled" (camelCase) to "verified_differently_abled" (snake_case) to match all other segment values.',
    bugRef: 'DM-M3',
    collections: ['users'],
    risk: 'LOW',
    type: 'write',
    notes: 'Single updateMany call. After running, update the enum in User.ts model to use the new value.',
  },
  {
    id: '006',
    name: 'finance-userid-validate',
    description:
      'READ-ONLY validation script. Checks that all userId values in finance collections are valid ObjectId strings before the schema migration from String to ObjectId can proceed.',
    bugRef: 'DM-M4',
    collections: ['creditprofiles', 'financetransactions', 'loanapplications'],
    risk: 'LOW',
    type: 'validate',
    notes:
      'Does NOT modify data. Run this first; if all userId values are valid 24-char hex, the schema migration (String → ObjectId) can proceed safely in Phase 2.',
  },
  {
    id: '007',
    name: 'dead-fields-cleanup',
    description:
      'Remove dead/stale schema fields: User.profile.ringSize, User.profile.jewelryPreferences, Order.payment.coinsUsed.wasilCoins (null/0 only), Wallet.categoryBalances (empty only). Reports User.wallet sub-doc status without removing it.',
    bugRef: 'DM-L1, DM-L2, DM-L3, DM-L4, DM-L5',
    collections: ['users', 'orders', 'wallets'],
    risk: 'LOW',
    type: 'write',
    notes:
      'DM-L4 (User.wallet sub-doc) is report-only — requires consumer app audit before removal. DM-L5 (averageOrderValue) is not removed — needs recalculation job instead.',
  },
];

/**
 * Print migration registry to stdout (useful for runbooks/ops review)
 */
export function printRegistry(): void {
  console.log('\n=== REZ Migration Registry ===\n');
  migrations.forEach((m) => {
    console.log(`[${m.id}] ${m.name} (${m.type.toUpperCase()}) — Risk: ${m.risk}`);
    console.log(`  Bug: ${m.bugRef}`);
    console.log(`  Collections: ${m.collections.join(', ')}`);
    console.log(`  Description: ${m.description}`);
    if (m.notes) console.log(`  Notes: ${m.notes}`);
    console.log('');
  });
}

// If run directly, print the registry
if (require.main === module) {
  printRegistry();
}
