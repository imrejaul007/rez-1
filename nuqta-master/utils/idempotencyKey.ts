/**
 * Idempotency Key Generator
 * Generates unique keys for wallet mutation operations to prevent duplicate processing.
 * Used with transfer, gift, and gift card purchase APIs.
 */

/**
 * Generate a unique idempotency key for a wallet operation.
 * Format: {operation}_{timestamp}_{random}
 */
export function generateIdempotencyKey(operation: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${operation}_${timestamp}_${random}`;
}
