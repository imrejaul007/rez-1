/**
 * Batch Processor Utility
 *
 * Safely processes large MongoDB collections without loading everything into RAM.
 * Uses cursor streaming with chunked operations to prevent OOM crashes.
 *
 * Usage:
 * const results = await processBatch(
 *   Model.find(query).lean().cursor({ batchSize: 100 }),
 *   async (doc) => transform(doc),
 *   { chunkSize: 500 }
 * );
 */

import { logger } from '../config/logger';

export interface BatchProcessorOptions {
  chunkSize?: number; // Write to DB every N docs (default: 500)
  logInterval?: number; // Log progress every N docs (default: 1000)
  yieldInterval?: number; // Yield to event loop every N docs (default: 100)
}

/**
 * Process a large cursor with chunked writes (prevents OOM)
 *
 * @param cursor - MongoDB cursor (from Model.find().cursor())
 * @param transform - Transform function per doc
 * @param writeOp - Write function for each chunk
 * @param options - Configuration
 * @returns Completion stats
 */
export async function processBatchWithWrite<T extends { _id?: any }>(
  cursor: any,
  transform: (doc: any) => T,
  writeOp: (chunk: T[]) => Promise<void>,
  options: BatchProcessorOptions = {},
): Promise<{ processed: number; written: number; duration: number }> {
  const { chunkSize = 500, logInterval = 1000, yieldInterval = 100 } = options;

  const startTime = Date.now();
  let processed = 0;
  let written = 0;
  let chunk: T[] = [];

  for await (const doc of cursor) {
    chunk.push(transform(doc));
    processed++;

    // Yield to event loop
    if (processed % yieldInterval === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    // Log progress
    if (processed % logInterval === 0) {
      logger.debug(`[BatchProcessor] Processed ${processed} docs...`);
    }

    // Write chunk
    if (chunk.length >= chunkSize) {
      await writeOp(chunk);
      written += chunk.length;
      chunk = []; // Release memory
    }
  }

  // Write final chunk
  if (chunk.length > 0) {
    await writeOp(chunk);
    written += chunk.length;
  }

  const duration = Date.now() - startTime;
  logger.info(`[BatchProcessor] Complete: ${processed} processed, ${written} written in ${duration}ms`);

  return { processed, written, duration };
}

/**
 * Process a large cursor with in-memory accumulation (use only for small result sets)
 *
 * @param cursor - MongoDB cursor
 * @param transform - Transform function per doc
 * @param options - Configuration
 * @returns Array of transformed documents
 */
export async function processBatchInMemory<T>(
  cursor: any,
  transform: (doc: any) => T,
  options: BatchProcessorOptions = {},
): Promise<{ results: T[]; processed: number; duration: number }> {
  const { logInterval = 1000, yieldInterval = 100 } = options;

  const startTime = Date.now();
  let processed = 0;
  const results: T[] = [];

  for await (const doc of cursor) {
    results.push(transform(doc));
    processed++;

    // Yield to event loop
    if (processed % yieldInterval === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    // Log progress
    if (processed % logInterval === 0) {
      logger.debug(`[BatchProcessor] Processed ${processed} docs...`);
    }
  }

  const duration = Date.now() - startTime;
  logger.info(`[BatchProcessor] Complete: ${processed} docs in ${duration}ms`);

  return { results, processed, duration };
}

/**
 * Stream a large cursor to a response object (for API endpoints)
 *
 * Sends JSON array as streaming response:
 * {"data":[doc1,doc2,...]}
 *
 * @param cursor - MongoDB cursor
 * @param res - Express response object
 * @param options - Configuration
 */
export async function streamBatchToResponse(
  cursor: any,
  res: any,
  options: { logInterval?: number; yieldInterval?: number } = {},
): Promise<void> {
  const { logInterval = 1000, yieldInterval = 100 } = options;

  res.setHeader('Content-Type', 'application/json');
  res.write('{"data":[');

  let first = true;
  let processed = 0;

  for await (const doc of cursor) {
    if (!first) res.write(',');
    res.write(JSON.stringify(doc));
    first = false;
    processed++;

    if (processed % yieldInterval === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    if (processed % logInterval === 0) {
      logger.debug(`[StreamProcessor] Sent ${processed} docs...`);
    }
  }

  res.write(']}');
  res.end();
  logger.info(`[StreamProcessor] Complete: ${processed} docs streamed`);
}
