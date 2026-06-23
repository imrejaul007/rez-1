/**
 * Field-Level Encryption Utility
 *
 * Provides encryption/decryption for sensitive data fields
 * Uses AES-256-GCM for authenticated encryption
 */

import * as crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  masterKey: string; // Base64-encoded 32-byte key
  algorithm: string; // AES algorithm
  encoding: 'utf8' | 'json';
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

/**
 * Field encryption configuration for different data types
 */
export const FIELD_ENCRYPTION_CONFIG = {
  // PII fields
  phone: { encrypt: true, length: 10, regex: /^\d{10}$/ },
  email: { encrypt: true, length: 254 },
  ssn: { encrypt: true, length: 11 },
  cardNumber: { encrypt: true, length: 16, regex: /^\d{16}$/ },
  cardCvv: { encrypt: true, length: 3, regex: /^\d{3}$/ },
  bankAccount: { encrypt: true, length: 18 },

  // Address fields
  address: { encrypt: true, length: 500 },
  city: { encrypt: true, length: 100 },
  state: { encrypt: true, length: 50 },
  zipCode: { encrypt: true, length: 6 },

  // Financial data
  transactionAmount: { encrypt: false }, // Amount visible for auditing
  accountBalance: { encrypt: true },
  bankDetails: { encrypt: true, length: 1000 },

  // Authentication
  password: { encrypt: true }, // Usually hashed, but encrypting sensitive reset tokens
  twoFactorSecret: { encrypt: true, length: 32 },

  // User data
  dateOfBirth: { encrypt: true, length: 10 }, // YYYY-MM-DD
  governmentId: { encrypt: true, length: 20 },
  preferredName: { encrypt: true, length: 100 },
};

/**
 * Field-level encryption manager
 */
export class FieldEncryptionManager {
  private masterKey: Buffer;
  private algorithm: string = 'aes-256-gcm';

  constructor(config: EncryptionConfig) {
    try {
      this.masterKey = Buffer.from(config.masterKey, 'base64');
      if (this.masterKey.length !== 32) {
        throw new Error('Master key must be 32 bytes (256 bits)');
      }
    } catch (error) {
      throw new Error(`Invalid encryption configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encrypt a field value
   */
  encryptField(fieldName: string, value: any): EncryptedData {
    try {
      // Validate field configuration
      const fieldConfig = FIELD_ENCRYPTION_CONFIG[fieldName as keyof typeof FIELD_ENCRYPTION_CONFIG];
      if (!fieldConfig?.encrypt) {
        throw new Error(`Field "${fieldName}" is not configured for encryption`);
      }

      // Convert value to string
      let plaintext: string;
      if (typeof value === 'object') {
        plaintext = JSON.stringify(value);
      } else {
        plaintext = String(value);
      }

      // Validate field length
      const fieldLength = (fieldConfig as { encrypt: boolean; length?: number }).length;
      if (fieldLength && plaintext.length > fieldLength) {
        throw new Error(`Field "${fieldName}" exceeds maximum length of ${fieldLength}: ${plaintext.length}`);
      }

      // Validate field format if regex provided
      const fieldRegex = (fieldConfig as { encrypt: boolean; regex?: RegExp }).regex;
      if (fieldRegex && !fieldRegex.test(plaintext)) {
        throw new Error(`Field "${fieldName}" format validation failed`);
      }

      // Generate IV (initialization vector)
      const iv = crypto.randomBytes(16);

      // Create cipher — cast to GCM variant which exposes getAuthTag()
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv) as crypto.CipherGCM;

      // Encrypt data
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      logger.debug('[Field Encryption] Field encrypted', {
        fieldName,
        plaintextLength: plaintext.length,
        ciphertextLength: ciphertext.length,
      });

      return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.algorithm,
      };
    } catch (error) {
      logger.error('[Field Encryption] Encryption error', {
        fieldName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Decrypt a field value
   */
  decryptField(fieldName: string, encrypted: EncryptedData | string): any {
    try {
      // Parse if string (JSON)
      let encryptedData: EncryptedData;
      if (typeof encrypted === 'string') {
        encryptedData = JSON.parse(encrypted);
      } else {
        encryptedData = encrypted;
      }

      // Validate encrypted data structure
      if (!encryptedData.ciphertext || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Invalid encrypted data structure');
      }

      // Decode buffers from base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');

      // Create decipher — cast to GCM variant which exposes setAuthTag()
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      // Decrypt data
      let plaintext: string = decipher.update(ciphertext, undefined, 'utf8');
      plaintext += decipher.final('utf8');

      logger.debug('[Field Encryption] Field decrypted', {
        fieldName,
        ciphertextLength: ciphertext.length,
        plaintextLength: plaintext.length,
      });

      return plaintext;
    } catch (error) {
      logger.error('[Field Encryption] Decryption error', {
        fieldName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  encryptObject(obj: Record<string, any>, fieldsToEncrypt: string[]): Record<string, any> {
    const encrypted = { ...obj };

    for (const fieldName of fieldsToEncrypt) {
      if (fieldName in obj && obj[fieldName] !== null && obj[fieldName] !== undefined) {
        encrypted[fieldName] = this.encryptField(fieldName, obj[fieldName]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt multiple fields in an object
   */
  decryptObject(obj: Record<string, any>, fieldsToDecrypt: string[]): Record<string, any> {
    const decrypted = { ...obj };

    for (const fieldName of fieldsToDecrypt) {
      if (fieldName in obj && obj[fieldName] !== null && obj[fieldName] !== undefined) {
        try {
          decrypted[fieldName] = this.decryptField(fieldName, obj[fieldName]);
        } catch (error) {
          logger.warn('[Field Encryption] Failed to decrypt field, keeping encrypted', {
            fieldName,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return decrypted;
  }

  /**
   * Check if a value is encrypted (has EncryptedData structure)
   */
  isEncrypted(value: any): value is EncryptedData {
    return (
      value &&
      typeof value === 'object' &&
      'ciphertext' in value &&
      'iv' in value &&
      'authTag' in value &&
      'algorithm' in value
    );
  }

  /**
   * Mask a field for logging (show first/last chars only)
   */
  maskField(fieldName: string, value: any, showChars: number = 4): string {
    if (value === null || value === undefined) {
      return '[MASKED]';
    }

    const str = String(value);
    if (str.length <= showChars * 2) {
      return '[MASKED]';
    }

    return `${str.substring(0, showChars)}${'*'.repeat(str.length - showChars * 2)}${str.substring(str.length - showChars)}`;
  }

  /**
   * Get fields that should be encrypted
   */
  getEncryptableFields(): string[] {
    return Object.keys(FIELD_ENCRYPTION_CONFIG).filter(
      (k) => FIELD_ENCRYPTION_CONFIG[k as keyof typeof FIELD_ENCRYPTION_CONFIG].encrypt,
    );
  }

  /**
   * Validate that all required encryption fields are present
   */
  validateEncryptedFields(obj: Record<string, any>, requiredFields: string[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
        missing.push(field);
      }
    }

    return { valid: missing.length === 0, missing };
  }
}

/**
 * Generate a random encryption key (for setup/rotation)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Hash a field value for indexing (deterministic but irreversible)
 */
export function hashFieldForIndex(fieldName: string, value: any): string {
  const str = String(value);
  return crypto.createHash('sha256').update(`${fieldName}:${str}`).digest('hex');
}

export default FieldEncryptionManager;
