import { logger } from '../config/logger';

/**
 * Default job handler — used as a fallback when a worker cannot find
 * the handler module for a given job name (e.g., typo in job name,
 * handler removed but jobs still in queue).
 */
export default async function defaultHandler(data: unknown): Promise<null> {
  logger.warn('[DefaultJobHandler] No handler found for job. Data:', data);
  return null;
}
