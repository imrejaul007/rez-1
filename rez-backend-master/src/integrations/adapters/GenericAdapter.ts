import { ProviderAdapter, NormalizedTransaction, defaultValidateSignature } from './index';

/**
 * Generic Adapter — handles the standard ReZ webhook format.
 *
 * Expected payload:
 * {
 *   provider: "provider_name",
 *   event: "bill.closed",
 *   merchantExternalId: "PP-8821",
 *   transaction: {
 *     id: "BILL-9981",
 *     amount: 1240,
 *     currency: "INR",
 *     items: [{ name: "Burger", price: 240, qty: 2 }],
 *     timestamp: "2026-03-11T18:32:00Z",
 *     customer: { phone: "98XXXXXX21", email?: "", loyaltyId?: "" }
 *   }
 * }
 */
export class GenericAdapter implements ProviderAdapter {
  normalize(rawPayload: any): NormalizedTransaction {
    const txn = rawPayload.transaction || rawPayload;
    return {
      externalId: txn.id || txn.billId || txn.invoiceNo || `gen-${Date.now()}`,
      merchantExternalId: rawPayload.merchantExternalId || rawPayload.merchantId || '',
      amount: Number(txn.amount) || 0,
      currency: txn.currency || 'INR',
      items: (txn.items || []).map((item: any) => ({
        name: item.name || 'Item',
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 1,
      })),
      customerRef: {
        phone: txn.customer?.phone || txn.customerPhone,
        email: txn.customer?.email,
        loyaltyId: txn.customer?.loyaltyId,
      },
      timestamp: txn.timestamp ? new Date(txn.timestamp) : new Date(),
      metadata: { event: rawPayload.event, provider: rawPayload.provider },
    };
  }

  validateSignature(rawBody: string, signature: string, secret: string): boolean {
    return defaultValidateSignature(rawBody, signature, secret);
  }
}
