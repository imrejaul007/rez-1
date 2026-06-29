import mongoose from 'mongoose';
import { logger } from './logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('[FATAL] MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  // Build connection options with replica set support
  const options: mongoose.ConnectOptions = {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    // Replica set options
    replicaSet: extractReplicaSetName(uri),
    // Read preference: primary for writes, secondary for reads (if specified)
    readPreference: (process.env.MONGODB_READ_PREFERENCE || 'primary') as 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest',
    // Auth source
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
  };

  mongoose.connection.on('connected', () => logger.info('[MongoDB] Connected', { uri: maskUri(uri) }));
  mongoose.connection.on('disconnected', () => logger.warn('[MongoDB] Disconnected'));
  mongoose.connection.on('error', (err) => logger.error('[MongoDB] Error: ' + err.message));
  mongoose.connection.on('reconnected', () => logger.info('[MongoDB] Reconnected'));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, options);
      logger.info('[MongoDB] Connected successfully', {
        attempt,
        replicaSet: options.replicaSet || 'none',
        readPreference: options.readPreference,
      });
      return;
    } catch (err) {
      logger.error(`[MongoDB] Connection attempt ${attempt}/${MAX_RETRIES} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt === MAX_RETRIES) {
        throw new Error(`[MongoDB] Failed to connect after ${MAX_RETRIES} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Extract replica set name from connection URI
 * Format: mongodb://host:27017/db?replicaSet=rs0
 */
function extractReplicaSetName(uri: string): string | undefined {
  try {
    const match = uri.match(/replicaSet=([^&]+)/i);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mask credentials in URI for logging
 */
function maskUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}
