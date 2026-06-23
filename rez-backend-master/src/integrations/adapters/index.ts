import crypto from 'crypto';

/**
 * Normalized transaction shape — every adapter must produce this.
 */
export interface NormalizedTransaction {
  externalId: string;
  merchantExternalId: string;
  amount: number;
  currency: string;
  items: Array<{ name: string; price: number; qty: number }>;
  customerRef: { phone?: string; email?: string; loyaltyId?: string };
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Provider Adapter interface — each POS/PMS/booking provider implements this.
 */
export interface ProviderAdapter {
  /** Map provider-specific payload to normalized format */
  normalize(rawPayload: any): NormalizedTransaction;
  /** Verify webhook HMAC signature */
  validateSignature(rawBody: string, signature: string, secret: string): boolean;
}

/**
 * Default HMAC-SHA256 signature verification (most providers use this).
 */
export function defaultValidateSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Generate transaction hash for deduplication.
 */
export function generateTxnHash(provider: string, externalId: string, amount: number): string {
  return crypto.createHash('sha256').update(`${provider}:${externalId}:${amount}`).digest('hex');
}

// ── Adapter Registry ─────────────────────────────────────

import { GenericAdapter } from './GenericAdapter';
import { PetpoojaAdapter } from './PetpoojaAdapter';
import { CloudbedsAdapter } from './CloudbedsAdapter';

const adapterRegistry: Record<string, ProviderAdapter> = {
  generic: new GenericAdapter(),
  petpooja: new PetpoojaAdapter(),
  cloudbeds: new CloudbedsAdapter(),
};

/**
 * Get adapter for a given provider. Falls back to generic adapter.
 */
export function getAdapter(provider: string): ProviderAdapter {
  return adapterRegistry[provider.toLowerCase()] || adapterRegistry.generic;
}
