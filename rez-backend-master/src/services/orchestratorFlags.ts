/**
 * orchestratorFlags.ts
 *
 * Lightweight, synchronous, in-process feature flags for the Payment and Refund
 * orchestrators.  These flags are intentionally separate from the DB-backed
 * FeatureFlagService so that:
 *   (a) Shadow-mode checks on every hot-path request cost zero DB/Redis RTTs.
 *   (b) The flags can be overridden at deploy-time via env vars (CI/CD pipeline
 *       sets PAYMENTS_ORCHESTRATOR_MODE=live when we're ready to cut over).
 *   (c) An admin API (or future DB sync job) can call setOrchestratorFlag() at
 *       runtime without a redeploy.
 *
 * Promotion path:
 *   1. Deploy with defaults ('shadow') — dual-run for 48-72 h, compare logs.
 *   2. Set env vars to 'live' and redeploy, OR call setOrchestratorFlag() via
 *      the admin API at runtime (change takes effect immediately on that pod;
 *      add Redis pub/sub to propagate to all pods if needed later).
 *   3. To disable entirely (e.g., roll back): set to 'disabled'.
 */

export type OrchestratorMode = 'disabled' | 'shadow' | 'live';

export interface OrchestratorFlagMap {
  'payments.orchestrator_mode': OrchestratorMode;
  'refunds.orchestrator_mode': OrchestratorMode;
  'orders.cancel_orchestrator_mode': OrchestratorMode;
}

function parseMode(raw: string | undefined, fallback: OrchestratorMode): OrchestratorMode {
  if (raw === 'disabled' || raw === 'shadow' || raw === 'live') return raw;
  return fallback;
}

// In-memory store — mutable at runtime via setOrchestratorFlag().
const FLAGS: OrchestratorFlagMap = {
  'payments.orchestrator_mode': parseMode(process.env.PAYMENTS_ORCHESTRATOR_MODE, 'shadow'),
  'refunds.orchestrator_mode': parseMode(process.env.REFUNDS_ORCHESTRATOR_MODE, 'shadow'),
  'orders.cancel_orchestrator_mode': parseMode(process.env.ORDERS_CANCEL_ORCHESTRATOR_MODE, 'shadow'),
};

/** Read a flag synchronously — zero latency, safe in hot paths. */
export function getOrchestratorFlag(key: keyof OrchestratorFlagMap): OrchestratorMode {
  return FLAGS[key];
}

/**
 * Set a flag at runtime (e.g., from an admin API route).
 * Change takes effect immediately on this pod/process.
 * For multi-pod propagation, call this on each pod (via a Redis pub/sub listener,
 * or redeploy with updated env vars).
 */
export function setOrchestratorFlag(key: keyof OrchestratorFlagMap, value: OrchestratorMode): void {
  FLAGS[key] = value;
}

/** Snapshot of all flags — useful for admin health/debug endpoints. */
export function getAllOrchestratorFlags(): Readonly<OrchestratorFlagMap> {
  return { ...FLAGS };
}

// ── Redis pub/sub for cross-pod flag propagation ──────────────────────────────

const ORCHESTRATOR_FLAG_CHANNEL = 'rez:orchestrator:flags';

/**
 * Publish a flag change to all pods via Redis pub/sub.
 * Non-fatal if Redis is unavailable — local change already applied.
 */
export async function publishFlagChange(key: keyof OrchestratorFlagMap, value: OrchestratorMode): Promise<void> {
  try {
    const redisService = (await import('./redisService')).default;
    await (redisService as any).publish(ORCHESTRATOR_FLAG_CHANNEL, JSON.stringify({ key, value }));
  } catch {
    // Non-fatal — local change already applied on this pod.
  }
}

/**
 * Subscribe to flag changes broadcast by other pods.
 * Call once at startup (server.ts). Safe to call multiple times — idempotent via try/catch.
 */
export async function subscribeToFlagChanges(): Promise<void> {
  try {
    const redisService = (await import('./redisService')).default;
    const client = (redisService as any).getClient?.();
    if (!client) return;
    const subscriber = client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(ORCHESTRATOR_FLAG_CHANNEL, (message: string) => {
      try {
        const { key, value } = JSON.parse(message);
        if (key && value && key in FLAGS && (value === 'disabled' || value === 'shadow' || value === 'live')) {
          FLAGS[key as keyof OrchestratorFlagMap] = value as OrchestratorMode;
        }
      } catch {
        /* ignore malformed messages */
      }
    });
  } catch {
    // Redis unavailable — in-process flags still work; just no cross-pod sync.
  }
}
