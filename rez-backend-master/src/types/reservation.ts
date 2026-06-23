import { Types } from 'mongoose';

/**
 * Stock Reservation Types
 *
 * These types define the structure for temporary stock reservations
 * that prevent overselling during the checkout process.
 */

// Individual reserved item in a cart
export interface IReservedItem {
  productId: Types.ObjectId;
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
  reservedAt: Date;
  expiresAt: Date;
}

// Reservation operation result
export interface IReservationResult {
  success: boolean;
  message: string;
  availableStock?: number;
  reservedQuantity?: number;
  expiresAt?: Date;
}

// Reservation extension result
export interface IReservationExtension {
  success: boolean;
  message: string;
  newExpiresAt?: Date;
}

// Cleanup result
export interface ICleanupResult {
  releasedCount: number;
  releasedItems: Array<{
    cartId: string;
    productId: string;
    quantity: number;
    variant?: {
      type: string;
      value: string;
    };
  }>;
  errors: Array<{
    cartId: string;
    productId: string;
    error: string;
  }>;
}

// Reservation constants
export const RESERVATION_TIMEOUT_MINUTES = 15;
export const CLEANUP_INTERVAL_MINUTES = 5;