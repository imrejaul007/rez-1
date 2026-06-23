/**
 * Request Signing Middleware with AWS Signature Version 4 (SigV4)
 *
 * Implements AWS SigV4 signing for API requests
 * Provides cryptographic verification that requests haven't been tampered with
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * AWS SigV4 signing configuration
 */
export interface SigningConfig {
  service: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Signature verification result
 */
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  timestamp?: Date;
}

/**
 * Create canonical request for AWS SigV4
 */
function createCanonicalRequest(
  method: string,
  path: string,
  query: string,
  headers: Record<string, string>,
  payload: string,
): string {
  // Canonical request format:
  // HTTPMethod + '\n' +
  // CanonicalURI + '\n' +
  // CanonicalQueryString + '\n' +
  // CanonicalHeaders + '\n' +
  // SignedHeaders + '\n' +
  // HashedPayload

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n');

  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(';');

  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');

  return [method, path, query, canonicalHeaders + '\n', signedHeaders, hashedPayload].join('\n');
}

/**
 * Create string to sign for AWS SigV4
 */
function createStringToSign(
  timestamp: string,
  datestamp: string,
  region: string,
  service: string,
  canonicalRequest: string,
): string {
  const algorithm = 'AWS4-HMAC-SHA256';
  const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;

  return [algorithm, timestamp, credentialScope, canonicalRequestHash].join('\n');
}

/**
 * Calculate AWS SigV4 signature
 */
function calculateSignature(
  stringToSign: string,
  secretAccessKey: string,
  datestamp: string,
  region: string,
  service: string,
): string {
  // Derive signing key
  const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(datestamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

  // Calculate signature
  return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
}

/**
 * Verify AWS SigV4 signature in request
 */
export function verifyAwsSigV4Signature(req: Request, config: SigningConfig): VerificationResult {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      return { valid: false, reason: 'Missing Authorization header' };
    }

    // Parse authorization header
    // Format: AWS4-HMAC-SHA256 Credential=AccessKeyId/Datestamp/Region/Service/aws4_request, SignedHeaders=..., Signature=...
    const credentialMatch = authHeader.match(/Credential=([^,]+)/);
    const signedHeadersMatch = authHeader.match(/SignedHeaders=([^,]+)/);
    const signatureMatch = authHeader.match(/Signature=([^,\s]+)/);

    if (!credentialMatch || !signedHeadersMatch || !signatureMatch) {
      return { valid: false, reason: 'Malformed Authorization header' };
    }

    const [, credential] = credentialMatch;
    const [, signedHeaders] = signedHeadersMatch;
    const [, providedSignature] = signatureMatch;

    // Parse credential
    const [accessKeyId, datestamp, region, service] = credential.split('/');

    if (accessKeyId !== config.accessKeyId) {
      return { valid: false, reason: 'Invalid access key' };
    }

    // Extract timestamp from x-amz-date header
    const amzDate = req.headers['x-amz-date'];
    if (!amzDate || typeof amzDate !== 'string') {
      return { valid: false, reason: 'Missing x-amz-date header' };
    }

    // Verify timestamp freshness (5 minute window)
    const requestTime = new Date(amzDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
    const now = new Date();
    const timeDiffMs = Math.abs(now.getTime() - requestTime.getTime());

    if (timeDiffMs > 5 * 60 * 1000) {
      return { valid: false, reason: 'Request timestamp too old' };
    }

    // Create headers object from signed headers list
    const headersToSign: Record<string, string> = {};
    const signedHeaderArray = signedHeaders.split(';');

    for (const header of signedHeaderArray) {
      const value = req.headers[header];
      if (value !== undefined) {
        headersToSign[header] = typeof value === 'string' ? value : value.toString();
      }
    }

    // Get request body
    const payload = (req as any).rawBody || JSON.stringify(req.body) || '';

    // Create canonical request
    const canonicalRequest = createCanonicalRequest(
      req.method,
      req.path,
      req.url.split('?')[1] || '',
      headersToSign,
      payload,
    );

    // Create string to sign
    const stringToSign = createStringToSign(amzDate, datestamp, region, service, canonicalRequest);

    // Calculate expected signature
    const expectedSignature = calculateSignature(stringToSign, config.secretAccessKey, datestamp, region, service);

    // Compare signatures using constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
      logger.warn('[SigV4] Signature verification failed', {
        accessKeyId,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return { valid: false, reason: 'Signature verification failed' };
    }

    logger.debug('[SigV4] Signature verified successfully', {
      accessKeyId,
      path: req.path,
      method: req.method,
    });

    return { valid: true, timestamp: requestTime };
  } catch (error) {
    logger.error('[SigV4] Error verifying signature', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });

    return { valid: false, reason: 'Signature verification error' };
  }
}

/**
 * Generate AWS SigV4 signature for outgoing requests
 */
export function generateAwsSigV4Signature(
  method: string,
  path: string,
  query: string,
  headers: Record<string, string>,
  payload: string,
  config: SigningConfig,
): string {
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]/g, '')
    .replace(/\.\d{3}/, '');
  const datestamp = amzDate.substring(0, 8);

  // Add required headers
  headers['x-amz-date'] = amzDate;

  // Create canonical request
  const canonicalRequest = createCanonicalRequest(method, path, query, headers, payload);

  // Create string to sign
  const stringToSign = createStringToSign(amzDate, datestamp, config.region, config.service, canonicalRequest);

  // Calculate signature
  const signature = calculateSignature(stringToSign, config.secretAccessKey, datestamp, config.region, config.service);

  return signature;
}

/**
 * Middleware to verify AWS SigV4 signature
 *
 * NOTE: This middleware is not currently wired to any route.
 * The argument-order bug (calculateSignature(amzDate, ...) instead of
 * calculateSignature(stringToSign, ...)) has been fixed in verifyAwsSigV4Signature
 * and generateAwsSigV4Signature above. Wire this only after setting the
 * required SigningConfig env vars (accessKeyId, secretAccessKey, region, service).
 */
export const verifySigV4Signature = (config: SigningConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = verifyAwsSigV4Signature(req, config);

    if (!result.valid) {
      logger.warn('[SigV4] Unauthorized request', {
        reason: result.reason,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid request signature',
      });
      return;
    }

    // Attach verification result to request
    (req as any).sigV4Verified = result;

    next();
  };
};

/**
 * Optional SigV4 verification (doesn't block, just sets flag)
 */
export const optionalSigV4Verification = (config: SigningConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = verifyAwsSigV4Signature(req, config);
    (req as any).sigV4Verified = result.valid;

    next();
  };
};

export default {
  verifyAwsSigV4Signature,
  generateAwsSigV4Signature,
  verifySigV4Signature,
  optionalSigV4Verification,
};
