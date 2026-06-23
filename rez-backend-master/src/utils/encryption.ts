import crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * Field Encryption Utility
 * Encrypts sensitive fields like bank account numbers, SSN, etc.
 * Uses AES-256-GCM for authenticated encryption
 */

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-encryption-key-change-this';

// Ensure key is 32 bytes for AES-256
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(text: string): string {
  if (!text) return '';

  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);

    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag for authenticated encryption
    const authTag = cipher.getAuthTag();

    // Return encrypted data with IV and auth tag
    const encryptedData: EncryptedData = {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };

    return JSON.stringify(encryptedData);
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedString - Encrypted data string
 * @returns Decrypted plain text
 */
export function decrypt(encryptedString: string): string {
  if (!encryptedString) return '';

  try {
    // Parse encrypted data
    const encryptedData: EncryptedData = JSON.parse(encryptedString);

    // Convert hex strings back to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const encrypted = encryptedData.encrypted;

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 * Used for data that doesn't need to be retrieved (like verification codes)
 * @param text - Text to hash
 * @returns Hashed string
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate secure random token
 * @param length - Length of token in bytes (default 32)
 * @returns Random token in hex format
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Mask sensitive data for logging/display
 * Shows only first and last few characters
 * @param text - Text to mask
 * @param visibleChars - Number of visible characters at start/end (default 4)
 * @returns Masked string
 */
export function maskSensitiveData(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars * 2) {
    return '***';
  }

  const start = text.substring(0, visibleChars);
  const end = text.substring(text.length - visibleChars);
  const maskedLength = text.length - (visibleChars * 2);
  const mask = '*'.repeat(Math.min(maskedLength, 10));

  return `${start}${mask}${end}`;
}

/**
 * Encrypt bank account number
 * Special handling for bank account numbers
 */
export function encryptBankAccount(accountNumber: string): string {
  // Remove any spaces or dashes
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  return encrypt(cleaned);
}

/**
 * Decrypt bank account number
 */
export function decryptBankAccount(encryptedAccount: string): string {
  return decrypt(encryptedAccount);
}

/**
 * Encrypt PAN/Tax ID
 */
export function encryptTaxId(taxId: string): string {
  const cleaned = taxId.replace(/[\s-]/g, '').toUpperCase();
  return encrypt(cleaned);
}

/**
 * Decrypt PAN/Tax ID
 */
export function decryptTaxId(encryptedTaxId: string): string {
  return decrypt(encryptedTaxId);
}

/**
 * Compare encrypted value with plain text
 * @param plainText - Plain text to compare
 * @param encryptedString - Encrypted string
 * @returns True if values match
 */
export function compareEncrypted(plainText: string, encryptedString: string): boolean {
  try {
    const decrypted = decrypt(encryptedString);
    return plainText === decrypted;
  } catch (error) {
    return false;
  }
}

/**
 * Encrypt object fields
 * Encrypts specified fields in an object
 * @param obj - Object to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export function encryptObjectFields(obj: any, fieldsToEncrypt: string[]): any {
  const encrypted = { ...obj };

  fieldsToEncrypt.forEach(field => {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });

  return encrypted;
}

/**
 * Decrypt object fields
 * Decrypts specified fields in an object
 * @param obj - Object to decrypt
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export function decryptObjectFields(obj: any, fieldsToDecrypt: string[]): any {
  const decrypted = { ...obj };

  fieldsToDecrypt.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        // If decryption fails, field might not be encrypted
        logger.warn(`Failed to decrypt field: ${field}`);
      }
    }
  });

  return decrypted;
}

export default {
  encrypt,
  decrypt,
  hash,
  generateSecureToken,
  maskSensitiveData,
  encryptBankAccount,
  decryptBankAccount,
  encryptTaxId,
  decryptTaxId,
  compareEncrypted,
  encryptObjectFields,
  decryptObjectFields
};
