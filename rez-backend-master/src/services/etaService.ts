/**
 * ETA Service
 *
 * Calculates estimated delivery time for orders based on:
 * - Status-based base times (preparation, dispatch)
 * - Distance calculation (Haversine formula)
 * - Merchant overrides (order.delivery.estimatedTime)
 */

import { Store } from '../models/Store';

// Base preparation times per fulfillment type (in minutes)
const PREP_TIMES: Record<string, number> = {
  delivery: 20,
  pickup: 15,
  drive_thru: 10,
  dine_in: 25,
};

// Average delivery speed in km/h
const AVG_DELIVERY_SPEED_KMH = 25;

// Status-based base remaining times (minutes) when no distance info available
const STATUS_BASE_TIMES: Record<string, number> = {
  placed: 45,
  confirmed: 40,
  preparing: 30,
  ready: 15,
  dispatched: 20,
  out_for_delivery: 10,
  delivered: 0,
  cancelled: 0,
  returned: 0,
  refunded: 0,
};

/**
 * Haversine formula to calculate distance between two coordinates.
 * Returns distance in kilometers.
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate estimated minutes remaining for an order.
 */
export async function calculateETA(order: any): Promise<number> {
  // Terminal statuses
  if (['delivered', 'cancelled', 'returned', 'refunded'].includes(order.status)) {
    return 0;
  }

  // If merchant has set estimatedTime, use it
  if (order.delivery?.estimatedTime) {
    const estimatedDate = new Date(order.delivery.estimatedTime);
    const remaining = (estimatedDate.getTime() - Date.now()) / 60000;
    return Math.max(0, Math.round(remaining));
  }

  let prepTime = 0;
  let deliveryTime = 0;

  const fulfillmentType = order.fulfillmentType || 'delivery';
  const basePrep = PREP_TIMES[fulfillmentType] || 20;

  // Calculate remaining prep time based on status
  if (['placed', 'confirmed'].includes(order.status)) {
    prepTime = basePrep;
  } else if (order.status === 'preparing') {
    // Halfway through prep
    prepTime = Math.round(basePrep * 0.5);
  }
  // For 'ready' and beyond, prep is done

  // Calculate delivery time based on distance (only for delivery fulfillment)
  if (fulfillmentType === 'delivery' && ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery'].includes(order.status)) {
    // Try to get store coordinates and delivery coordinates
    const deliveryCoords = order.delivery?.address?.coordinates || order.delivery?.address?.location;
    let storeCoords: { latitude: number; longitude: number } | null = null;

    // Get store location
    const storeId = order.store || order.items?.[0]?.store;
    if (storeId) {
      try {
        const storeIdStr = typeof storeId === 'object' ? storeId._id?.toString() || storeId.toString() : storeId;
        const store = await Store.findById(storeIdStr).select('location').lean();
        if (store?.location?.coordinates) {
          // GeoJSON [lng, lat] format
          storeCoords = {
            latitude: store.location.coordinates[1],
            longitude: store.location.coordinates[0],
          };
        }
      } catch {
        // Ignore store lookup errors
      }
    }

    if (storeCoords && deliveryCoords?.latitude && deliveryCoords?.longitude) {
      const distanceKm = haversineDistance(
        storeCoords.latitude, storeCoords.longitude,
        deliveryCoords.latitude, deliveryCoords.longitude
      );
      // Add 1.3x multiplier for road distance vs straight line
      deliveryTime = Math.round((distanceKm * 1.3 / AVG_DELIVERY_SPEED_KMH) * 60);
    } else {
      // Fallback: use status-based estimate for delivery portion
      if (['dispatched', 'out_for_delivery'].includes(order.status)) {
        deliveryTime = order.status === 'dispatched' ? 20 : 10;
      } else if (['placed', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
        deliveryTime = 15; // Default delivery time
      }
    }
  }

  return Math.max(0, prepTime + deliveryTime);
}

/**
 * Get a formatted ETA string for display.
 */
export async function getFormattedETA(order: any): Promise<string> {
  if (['delivered', 'cancelled', 'returned', 'refunded'].includes(order.status)) {
    if (order.status === 'delivered') return 'Delivered';
    if (order.status === 'cancelled') return 'Cancelled';
    if (order.status === 'returned') return 'Returned';
    return 'Refunded';
  }

  const minutes = await calculateETA(order);

  if (minutes <= 0) return 'Any moment now';
  if (minutes < 60) return `~${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

/**
 * Calculate an absolute ETA Date.
 */
export async function getETADate(order: any): Promise<Date | null> {
  if (['delivered', 'cancelled', 'returned', 'refunded'].includes(order.status)) {
    return null;
  }

  if (order.delivery?.estimatedTime) {
    return new Date(order.delivery.estimatedTime);
  }

  const minutes = await calculateETA(order);
  if (minutes <= 0) return new Date();

  return new Date(Date.now() + minutes * 60000);
}

export default {
  calculateETA,
  getFormattedETA,
  getETADate,
};
