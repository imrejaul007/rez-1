import { createServiceLogger } from '../config/logger';

/**
 * Structured wallet logger.
 * All wallet mutations should use this instead of console.log.
 * Includes PII masking from the global logger config.
 */
export const walletLogger = createServiceLogger('wallet');

/**
 * Log a wallet mutation with standard context fields.
 */
export function logWalletMutation(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: {
    userId?: string;
    walletId?: string;
    operation?: string;
    amount?: number;
    coinType?: string;
    requestId?: string;
    correlationId?: string;
    [key: string]: any;
  }
) {
  const { correlationId, ...meta } = context;
  walletLogger[level](message, meta, correlationId);
}
