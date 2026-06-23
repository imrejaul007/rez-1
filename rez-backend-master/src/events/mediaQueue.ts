/**
 * Media Queue — BullMQ-backed durable media processing pipeline
 *
 * WHY: Post-upload media operations (variant generation, CDN invalidation,
 * cleanup of temp files, deletion propagation) currently run inline in
 * request handlers. This queue moves heavy/slow operations out of the
 * request cycle, improving upload response times.
 *
 * WHAT IT HANDLES:
 *   - generate-variants: Create thumbnail/medium/large from uploaded image
 *   - delete-asset: Remove from Cloudinary + any local cache
 *   - invalidate-cdn: Purge Cloudinary CDN edge caches for updated assets
 *   - cleanup-temp: Remove orphaned temp files from disk
 *
 * STRATEGY: Strangler Fig (Phase A — async post-processing)
 *   - Uploads remain synchronous (client needs the URL in the response)
 *   - Post-upload variant generation + cleanup is offloaded to this queue
 *   - Phase B: extract queue consumer into `rez-media-service` process
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('media-queue');

export const MEDIA_QUEUE_NAME = 'media-events';

// ── Event types ────────────────────────────────────────────────────────────────

export type MediaOperation = 'generate-variants' | 'delete-asset' | 'invalidate-cdn' | 'cleanup-temp';

export interface MediaEvent {
  /** Unique event ID for idempotency */
  eventId: string;
  /** Operation type */
  operation: MediaOperation;
  /** Cloudinary public ID of the asset (for cloud operations) */
  publicId?: string;
  /** Cloudinary secure URL */
  url?: string;
  /** Resource type */
  resourceType?: 'image' | 'video' | 'raw';
  /** Merchant context */
  merchantId?: string;
  /** Variant generation options */
  variants?: {
    name: string;
    width: number;
    height: number;
    crop?: string;
    quality?: number | string;
  }[];
  /** Local file path (for cleanup operations) */
  localPath?: string;
  /** Source of the request */
  source?: string;
  /** Timestamp */
  createdAt: string;
}

// ── Queue (producer side) ───────────────────────────────────────────────────

let _queue: Queue | null = null;

export function getMediaQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(MEDIA_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 3600 }, // 1 hour
        removeOnFail: { age: 7 * 24 * 3600 }, // 7 days
      },
    });
    _queue.on('error', (err) => {
      logger.error('[MediaQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish a media event to the BullMQ queue.
 * Fail-open: media processing failures must not break the upload response.
 */
export async function publishMediaEvent(event: MediaEvent): Promise<void> {
  try {
    const queue = getMediaQueue();
    await queue.add(event.operation, event, {
      jobId: event.eventId,
    });
    logger.info('[MediaQueue] Event published', {
      eventId: event.eventId,
      operation: event.operation,
      publicId: event.publicId,
    });
  } catch (err: any) {
    logger.error('[MediaQueue] Publish failed (non-fatal)', {
      eventId: event.eventId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ──────────────────────────────────────────────────

export function startMediaWorker(): Worker {
  const worker = new Worker(
    MEDIA_QUEUE_NAME,
    async (job: Job<MediaEvent>) => {
      const event = job.data;

      logger.info('[MediaWorker] Processing', {
        eventId: event.eventId,
        operation: event.operation,
        publicId: event.publicId,
      });

      // Validate URL if provided
      if (event.url) {
        try {
          const urlObj = new URL(event.url);
          // Only allow HTTPS URLs to prevent SSRF/man-in-the-middle attacks
          if (urlObj.protocol !== 'https:') {
            logger.warn('[MediaWorker] Non-HTTPS URL rejected', { url: event.url, eventId: event.eventId });
            return { status: 'skipped', reason: 'non-https-url' };
          }
        } catch (urlErr: any) {
          logger.error('[MediaWorker] Invalid URL format', { url: event.url, error: urlErr.message });
          return { status: 'skipped', reason: 'invalid-url' };
        }
      }

      switch (event.operation) {
        case 'generate-variants': {
          // Generate image variants via Cloudinary eager transformations
          if (!event.publicId || !event.variants?.length) {
            return { status: 'skipped', reason: 'no-publicId-or-variants' };
          }

          const { v2: cloudinary } = await import('cloudinary');
          const results: Record<string, string> = {};

          for (const variant of event.variants) {
            try {
              const url = cloudinary.url(event.publicId, {
                transformation: [
                  {
                    width: variant.width,
                    height: variant.height,
                    crop: variant.crop || 'fill',
                    quality: variant.quality || 'auto',
                    fetch_format: 'auto',
                  },
                ],
              });

              // Validate URL format before storing
              try {
                new URL(url);
              } catch (urlErr: any) {
                logger.error('[MediaWorker] Cloudinary returned invalid URL', {
                  variant: variant.name,
                  url,
                  error: urlErr.message,
                });
                results[variant.name] = `failed:invalid-url`;
                continue;
              }

              results[variant.name] = url;

              // Warm the CDN cache by fetching the variant URL once
              const http = await import('http');
              const https = await import('https');
              const client = url.startsWith('https') ? https : http;
              await new Promise<void>((resolve) => {
                (client as any)
                  .get(url, (res: any) => {
                    res.resume(); // drain response
                    resolve();
                  })
                  .on('error', () => resolve()); // non-fatal
              });
            } catch (err: any) {
              results[variant.name] = `failed:${err.message}`;
            }
          }

          return { status: 'completed', variants: results };
        }

        case 'delete-asset': {
          if (!event.publicId) {
            return { status: 'skipped', reason: 'no-publicId' };
          }

          const { CloudinaryService } = await import('../services/CloudinaryService');
          if (event.resourceType === 'video') {
            await CloudinaryService.deleteVideo(event.publicId);
          } else {
            await CloudinaryService.deleteFile(event.publicId);
          }

          return { status: 'deleted', publicId: event.publicId };
        }

        case 'invalidate-cdn': {
          if (!event.publicId) {
            return { status: 'skipped', reason: 'no-publicId' };
          }

          // Cloudinary auto-invalidation via upload API with invalidate flag
          const { v2: cloudinary } = await import('cloudinary');
          await cloudinary.uploader.explicit(event.publicId, {
            type: 'upload',
            invalidate: true,
            resource_type: event.resourceType || 'image',
          });

          return { status: 'invalidated', publicId: event.publicId };
        }

        case 'cleanup-temp': {
          if (!event.localPath) {
            return { status: 'skipped', reason: 'no-localPath' };
          }

          const fs = await import('fs');
          if (fs.existsSync(event.localPath)) {
            fs.unlinkSync(event.localPath);
            logger.info('[MediaWorker] Cleaned up temp file', { path: event.localPath });
            return { status: 'cleaned', path: event.localPath };
          }

          return { status: 'already-gone', path: event.localPath };
        }

        default:
          return { status: 'unknown-operation', operation: event.operation };
      }
    },
    {
      connection: bullmqRedis,
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 1000, // max 50 media ops/second (Cloudinary API rate limits)
      },
    },
  );
  attachFailureHandler(worker, MEDIA_QUEUE_NAME);

  worker.on('failed', (job, err) => {
    logger.error('[MediaWorker] Job failed', {
      jobId: job?.id,
      eventId: (job?.data as MediaEvent)?.eventId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('[MediaWorker] Worker error: ' + err.message);
  });

  logger.info('[MediaWorker] Started (concurrency=5, rate=50/s)');
  return worker;
}

// ── Graceful shutdown ───────────────────────────────────────────────────────

export async function closeMediaQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
