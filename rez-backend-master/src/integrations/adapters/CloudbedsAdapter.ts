import { ProviderAdapter, NormalizedTransaction, defaultValidateSignature } from './index';

/**
 * Cloudbeds PMS Adapter — maps hotel checkout webhook to normalized format.
 *
 * Triggered when guest checks out.
 */
export class CloudbedsAdapter implements ProviderAdapter {
  normalize(rawPayload: any): NormalizedTransaction {
    const reservation = rawPayload.reservation || rawPayload;
    const roomRevenue = Number(reservation.roomRevenue || reservation.total || 0);
    const extras = Number(reservation.extras || reservation.addOns || 0);

    return {
      externalId: reservation.reservationId || reservation.id || `cb-${Date.now()}`,
      merchantExternalId: rawPayload.propertyId || rawPayload.merchantExternalId || '',
      amount: roomRevenue + extras,
      currency: reservation.currency || 'AED',
      items: [
        ...(roomRevenue > 0 ? [{ name: 'Room Charges', price: roomRevenue, qty: 1 }] : []),
        ...(extras > 0 ? [{ name: 'Extras & Services', price: extras, qty: 1 }] : []),
      ],
      customerRef: {
        phone: reservation.guestPhone || reservation.phone,
        email: reservation.guestEmail || reservation.email,
      },
      timestamp: reservation.checkOutDate ? new Date(reservation.checkOutDate) : new Date(),
      metadata: { source: 'cloudbeds', status: reservation.status, nights: reservation.nights },
    };
  }

  validateSignature(rawBody: string, signature: string, secret: string): boolean {
    return defaultValidateSignature(rawBody, signature, secret);
  }
}
