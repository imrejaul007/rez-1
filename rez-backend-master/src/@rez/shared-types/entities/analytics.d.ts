// @ts-nocheck
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
import { EventType } from '../enums/index';
/**
 * Flat event properties — scalars and arrays of scalars only. Keep each
 * event's property set stable; analytics pipelines build on the shape.
 */
export type IAnalyticsProperties = Record<string, string | number | boolean | null | string[] | number[]>;
export interface IAnalyticsEventContext {
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}
export interface IAnalyticsEvent {
  _id?: string;
  type: EventType;
  /** Event name — dotted style, e.g. "checkout.started". */
  name: string;
  timestamp: Date | string;
  context: IAnalyticsEventContext;
  properties?: IAnalyticsProperties;
  /** Numeric metrics suitable for aggregation (sum, avg, percentiles). */
  metrics?: Record<string, number>;
  source?: string;
  version?: string;
}
//# sourceMappingURL=analytics.d.ts.map
