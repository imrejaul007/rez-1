import { logger } from '../config/logger';
import { aggregatorSyncConflicts } from '../config/prometheus';

/**
 * Aggregator Sync Service — detects and resolves price/name/availability conflicts
 * between REZ and external platforms (Swiggy, Zomato).
 *
 * When a merchant edits a price on Swiggy's panel, REZ's next sync will overwrite it.
 * This service detects that drift BEFORE overwriting and notifies the merchant,
 * so they can make an informed decision ("REZ wins" is the default, but merchant is told).
 *
 * v3 Architecture: Part 7 — Aggregator Conflict Notification System.
 * The CTO flagged: "Merchant edits price on Swiggy panel. REZ will overwrite. Merchant must be told."
 */

export interface AggregatorMenuItem {
  id: string; // aggregator's internal item ID
  name: string;
  price: number;
  available: boolean;
}

export interface Conflict {
  itemName: string;
  field: 'price' | 'name' | 'availability';
  rezValue: string; // what REZ has
  aggregatorValue: string; // what the aggregator had before we overwrote
  resolution: 'rez_wins'; // always REZ wins — but merchant is notified
}

export interface ConflictSummary {
  conflicts: Conflict[];
  platform: string;
  syncedAt: Date;
}

/**
 * Detect conflicts between REZ menu items and aggregator menu items.
 * Notifies the merchant if conflicts found. Returns summary for audit log.
 *
 * @param merchantId       Merchant's MongoDB ObjectId string
 * @param platform         Aggregator platform name ('swiggy' | 'zomato' | 'dunzo')
 * @param rezItems         Current product list from REZ DB
 * @param aggregatorItems  Current menu fetched from aggregator API
 */
export async function detectAndNotifyConflicts(
  merchantId: string,
  platform: string,
  rezItems: any[], // Product documents from REZ DB
  aggregatorItems: AggregatorMenuItem[],
): Promise<ConflictSummary> {
  const conflicts: Conflict[] = [];

  for (const aggItem of aggregatorItems) {
    // Find the REZ product mapped to this aggregator item
    const rezItem = rezItems.find((r) => r.aggregatorMapping?.[platform] === aggItem.id);
    if (!rezItem) continue; // new item on aggregator side — handled by sync, not here

    // Price drift: ₹1 tolerance (rounding differences are acceptable)
    const priceConflict = Math.abs((rezItem.price ?? 0) - aggItem.price) > 1;
    // Name drift: trim whitespace before comparing
    const nameConflict = rezItem.name?.trim() !== aggItem.name?.trim();
    // Availability drift: REZ is86d (sold out) vs aggregator available
    const availConflict = !rezItem.is86d !== aggItem.available;

    if (priceConflict || nameConflict || availConflict) {
      const field: Conflict['field'] = priceConflict ? 'price' : nameConflict ? 'name' : 'availability';

      conflicts.push({
        itemName: rezItem.name,
        field,
        rezValue: priceConflict
          ? `₹${rezItem.price}`
          : nameConflict
            ? rezItem.name
            : rezItem.is86d
              ? 'unavailable'
              : 'available',
        aggregatorValue: priceConflict
          ? `₹${aggItem.price}`
          : nameConflict
            ? aggItem.name
            : aggItem.available
              ? 'available'
              : 'unavailable',
        resolution: 'rez_wins',
      });

      // Increment Prometheus conflict counter
      try {
        aggregatorSyncConflicts.inc({ platform, field });
      } catch {
        /* prometheus may not be initialized */
      }
    }
  }

  if (conflicts.length > 0) {
    logger.info('[AggregatorSync] Conflicts detected', {
      merchantId,
      platform,
      conflictCount: conflicts.length,
      fields: conflicts.map((c) => c.field),
    });

    // Persist to AggregatorSyncLog for audit trail
    await persistConflictsToLog(merchantId, platform, conflicts);

    // Notify merchant via in-app notification
    await notifyMerchantOfConflicts(merchantId, platform, conflicts);
  }

  return {
    conflicts,
    platform,
    syncedAt: new Date(),
  };
}

// ── Persist conflicts to audit log ───────────────────────────────────────────
async function persistConflictsToLog(merchantId: string, platform: string, conflicts: Conflict[]): Promise<void> {
  try {
    const AggregatorSyncLog = await import('../models/AggregatorSyncLog')
      .then((m) => m.default || m.AggregatorSyncLog)
      .catch(() => null);

    if (!AggregatorSyncLog) return; // model may not exist yet

    await (AggregatorSyncLog as any).findOneAndUpdate(
      { merchantId, platform, status: 'pending' },
      {
        $push: { conflicts: { $each: conflicts } },
        $setOnInsert: { aggregatorName: platform, syncType: 'menu' },
      },
      { upsert: true, new: true },
    );
  } catch (err) {
    logger.warn('[AggregatorSync] Failed to persist conflicts to log', {
      err: (err as Error)?.message,
    });
  }
}

// ── Notify merchant ───────────────────────────────────────────────────────────
async function notifyMerchantOfConflicts(merchantId: string, platform: string, conflicts: Conflict[]): Promise<void> {
  try {
    const { default: merchantNotificationService } = await import('./merchantNotificationService').catch(() => ({
      default: null,
    }));

    if (!merchantNotificationService) return;

    const conflictCount = conflicts.length;
    const itemNames = conflicts
      .map((c) => c.itemName)
      .slice(0, 3)
      .join(', ');
    const moreSuffix = conflicts.length > 3 ? ` and ${conflicts.length - 3} more` : '';
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

    await (merchantNotificationService as any).notify?.({
      merchantId,
      type: 'warning',
      category: 'general',
      priority: 'medium',
      title: `${conflictCount} ${platformName} price${conflictCount > 1 ? 's' : ''} overwritten`,
      message: `${itemNames}${moreSuffix} had different ${platformName} prices. REZ values applied.`,
      data: {
        conflicts,
        platform,
        screen: 'integrations', // deep-link to integrations screen in merchant app
      },
    });
  } catch (err) {
    logger.warn('[AggregatorSync] Failed to send merchant conflict notification', {
      err: (err as Error)?.message,
    });
  }
}

export default { detectAndNotifyConflicts };
