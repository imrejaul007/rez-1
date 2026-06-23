"use strict";
/**
 * Analytics event entity.
 *
 * `properties` carries freeform-but-scalar event properties (what the
 * client reports per event). `metrics` is the dedicated numeric channel
 * — use it for anything you want to aggregate.
 *
 * v2 hardening: `properties: Record<string, any>` → typed
 * `IAnalyticsProperties` (scalars only + array of scalars). Consumers
 * that were putting objects into properties should flatten them out
 * first — nested objects were never actually being aggregated correctly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=analytics.js.map