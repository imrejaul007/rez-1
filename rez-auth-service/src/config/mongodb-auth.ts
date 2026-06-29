/**
 * MongoDB Connection with Authentication Support
 *
 * CRITICAL SECURITY: This module supports MongoDB authentication.
 * Enable by setting MONGODB_USERNAME and MONGODB_PASSWORD env vars.
 *
 * Usage:
 *   1. Set environment variables:
 *      MONGODB_USERNAME=your_username
 *      MONGODB_PASSWORD=your_password
 *      MONGODB_AUTH_SOURCE=admin (default)
 *
 *   2. Update MONGODB_URI to include authSource:
 *      mongodb+srv://cluster.mongodb.net/database?authSource=admin
 *
 * For MongoDB Atlas:
 *   1. Create database user in Atlas Security > Database Access
 *   2. Add user credentials to MONGODB_URI:
 *      mongodb+srv://username:password@cluster.mongodb.net/database?authSource=admin
 */

import mongoose from 'mongoose';
import { logger } from './logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Build MongoDB URI with authentication credentials
 * Supports both authenticated and unauthenticated connections
 */
export function buildMongoUri(): string {
  let baseUri = process.env.MONGODB_URI || '';

  if (!baseUri) {
    throw new Error('[MongoDB] MONGODB_URI environment variable is not set');
  }

  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;

  // If credentials are provided, inject them into the URI
  if (username && password) {
    // Handle mongodb+srv:// protocol
    if (baseUri.startsWith('mongodb+srv://')) {
      // Remove existing credentials if any
      baseUri = baseUri.replace(/:\/\/[^@]+@/, '://');
      // Insert credentials after ://
      baseUri = baseUri.replace('mongodb+srv://', `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@`);
    }
    // Handle mongodb:// protocol
    else if (baseUri.startsWith('mongodb://')) {
      baseUri = baseUri.replace(/:\/\/[^@]+@/, '://');
      baseUri = baseUri.replace('mongodb://', `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@`);
    }
  }

  return baseUri;
}

/**
 * Extract replica set name from URI for connection options
 */
function extractReplicaSetName(uri: string): string | undefined {
  const match = uri.match(/replicaSet=([^&]+)/);
  return match ? match[1] : undefined;
}

/**
 * Mask URI for logging (hide credentials)
 */
function maskUri(uri: string): string {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Connect to MongoDB with authentication support
 *
 * Authentication is automatically enabled when:
 * - MONGODB_USERNAME and MONGODB_PASSWORD are set, OR
 * - URI already contains credentials
 */
export async function connectMongoDB(): Promise<void> {
  const uri = buildMongoUri();
  const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';
  const hasCredentials = !!(process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD);

  if (hasCredentials) {
    logger.info('[MongoDB] Authentication enabled (credentials from env vars)');
  }

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    replicaSet: extractReplicaSetName(uri),
    readPreference: (process.env.MONGODB_READ_PREFERENCE || 'primary') as 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest',
    authSource: authSource,
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
        authEnabled: hasCredentials,
      });
      return;
    } catch (err) {
      logger.error(`[MongoDB] Connection attempt ${attempt}/${MAX_RETRIES} failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt === MAX_RETRIES) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}

/**
 * Gracefully disconnect from MongoDB
 */
export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('[MongoDB] Disconnected gracefully');
  } catch (err) {
    logger.error('[MongoDB] Error during disconnect', { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Check if MongoDB is connected
 */
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
