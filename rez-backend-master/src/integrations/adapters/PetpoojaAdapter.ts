import { ProviderAdapter, NormalizedTransaction, defaultValidateSignature } from './index';

/**
 * Petpooja POS Adapter — maps Petpooja bill webhook to normalized format.
 *
 * Petpooja sends bill events with their own field names.
 */
export class PetpoojaAdapter implements ProviderAdapter {
  normalize(rawPayload: any): NormalizedTransaction {
    const order = rawPayload.order || rawPayload;
    return {
      externalId: order.orderid || order.billnumber || order.id || `pp-${Date.now()}`,
      merchantExternalId: rawPayload.restID || rawPayload.merchantExternalId || '',
      amount: Number(order.total || order.amount || order.net_total) || 0,
      currency: 'INR',
      items: (order.details || order.items || []).map((item: any) => ({
        name: item.itemname || item.name || 'Item',
        price: Number(item.price || item.rate) || 0,
        qty: Number(item.quantity || item.qty) || 1,
      })),
      customerRef: {
        phone: order.customer_phone || order.phone || rawPayload.customer?.phone,
        email: order.customer_email || rawPayload.customer?.email,
      },
      timestamp: order.created_on ? new Date(order.created_on) : new Date(),
      metadata: { source: 'petpooja', orderType: order.ordertype },
    };
  }

  validateSignature(rawBody: string, signature: string, secret: string): boolean {
    return defaultValidateSignature(rawBody, signature, secret);
  }
}
