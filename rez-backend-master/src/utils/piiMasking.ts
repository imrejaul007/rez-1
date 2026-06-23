/**
 * PII (Personally Identifiable Information) Masking Utility
 *
 * Automatically masks sensitive data in logs and responses
 * Prevents accidental exposure of customer data
 */

/**
 * PII patterns and masking rules
 */
export const PII_PATTERNS = {
  // Phone numbers: mask middle digits
  phone: {
    pattern: /\b(\d{2})\d{4}(\d{4})\b/g,
    mask: '$1****$2',
    description: 'Phone number',
  },

  // Email: mask local part
  email: {
    pattern: /\b([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    mask: '$1****@$2',
    description: 'Email address',
  },

  // Credit card: mask middle digits
  creditCard: {
    pattern: /\b(\d{4})\d{8}(\d{4})\b/g,
    mask: '$1****$2',
    description: 'Credit card number',
  },

  // SSN/National ID: mask middle digits
  ssn: {
    pattern: /\b(\d{2})-?\d{5}-?(\d{4})\b/g,
    mask: '$1-****-$2',
    description: 'Social Security Number',
  },

  // Bank account: mask middle digits
  bankAccount: {
    pattern: /\b(\d{2})\d{10}(\d{4})\b/g,
    mask: '$1****$2',
    description: 'Bank account number',
  },

  // JWT tokens: mask payload
  jwt: {
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    mask: 'eyJ[REDACTED]',
    description: 'JWT token',
  },

  // API keys: mask after 8 chars
  apiKey: {
    pattern: /api[_-]?key[=:\s]+['"]?([A-Za-z0-9]{8})[A-Za-z0-9]*['"]?/gi,
    mask: 'api_key=$1****',
    description: 'API key',
  },

  // Passwords: mask completely
  password: {
    pattern: /password[=:\s]+['"]?[^'"\s,}]+['"]?/gi,
    mask: 'password=[REDACTED]',
    description: 'Password',
  },

  // OAuth tokens
  token: {
    pattern: /token[=:\s]+['"]?([a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]*['"]?/gi,
    mask: 'token=$1****',
    description: 'Token',
  },

  // IP addresses: mask last octet
  ipAddress: {
    pattern: /\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}\b/g,
    mask: '$1.***',
    description: 'IP address',
  },
};

/**
 * Custom patterns for domain-specific data
 */
export interface CustomPiiPattern {
  pattern: RegExp;
  mask: string;
  description: string;
}

/**
 * PII Masking manager
 */
export class PiiMaskingManager {
  private patterns: Map<string, CustomPiiPattern>;
  private customPatterns: CustomPiiPattern[] = [];

  constructor() {
    this.patterns = new Map(Object.entries(PII_PATTERNS).map(([key, value]) => [key, value as CustomPiiPattern]));
  }

  /**
   * Add a custom PII pattern
   */
  addPattern(name: string, pattern: CustomPiiPattern): void {
    this.patterns.set(name, pattern);
    this.customPatterns.push(pattern);
  }

  /**
   * Mask all known PII in a string
   */
  maskString(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let masked = text;

    // Apply all patterns
    for (const pattern of this.patterns.values()) {
      masked = masked.replace(pattern.pattern, pattern.mask);
    }

    return masked;
  }

  /**
   * Mask PII in an object (recursive)
   */
  maskObject(obj: any, fieldsToMask: string[] = []): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObject(item, fieldsToMask));
    }

    // Object
    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if this key should be masked
      if (fieldsToMask.includes(key) || this.isSensitiveField(key)) {
        if (typeof value === 'string') {
          masked[key] = this.maskString(value);
        } else if (typeof value === 'object' && value !== null) {
          masked[key] = this.maskObject(value, fieldsToMask);
        } else {
          masked[key] = '[MASKED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObject(value, fieldsToMask);
      } else if (typeof value === 'string') {
        // Always mask string values that contain PII patterns
        masked[key] = this.maskString(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Mask PII in a log message
   */
  maskLogMessage(message: string, metadata?: Record<string, any>): { message: string; metadata?: Record<string, any> } {
    return {
      message: this.maskString(message),
      metadata: metadata ? this.maskObject(metadata) : undefined,
    };
  }

  /**
   * Check if a field name suggests sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase();
    const sensitiveKeywords = [
      'password',
      'secret',
      'token',
      'key',
      'auth',
      'ssn',
      'phone',
      'email',
      'credit',
      'card',
      'cvv',
      'pin',
      'otp',
      'apikey',
      'authorization',
      'bearer',
      'jwt',
      'hash',
      'signature',
      'private',
      'confidential',
    ];

    return sensitiveKeywords.some((keyword) => lowerName.includes(keyword));
  }

  /**
   * Get a masked version of a value for error messages
   */
  maskValue(value: any): string {
    if (value === null || value === undefined) {
      return '[null]';
    }

    if (typeof value === 'string') {
      if (value.length === 0) {
        return '[empty]';
      }
      if (value.length <= 4) {
        return '[MASKED]';
      }
      return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
    }

    if (typeof value === 'object') {
      return '[object]';
    }

    return String(value);
  }

  /**
   * Create a sanitized log entry
   */
  createSanitizedLogEntry(
    level: string,
    message: string,
    metadata?: Record<string, any>,
  ): { level: string; message: string; metadata?: Record<string, any>; timestamp: string } {
    const { message: maskedMessage, metadata: maskedMetadata } = this.maskLogMessage(message, metadata);

    return {
      level,
      message: maskedMessage,
      metadata: maskedMetadata,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if a string contains PII
   */
  containsPii(text: string): { contains: boolean; types: string[] } {
    if (!text || typeof text !== 'string') {
      return { contains: false, types: [] };
    }

    const foundTypes: string[] = [];

    for (const [name, pattern] of this.patterns) {
      if (pattern.pattern.test(text)) {
        foundTypes.push(name);
        // Reset regex state
        pattern.pattern.lastIndex = 0;
      }
    }

    return {
      contains: foundTypes.length > 0,
      types: foundTypes,
    };
  }

  /**
   * Batch mask multiple strings
   */
  maskBatch(texts: string[]): string[] {
    return texts.map((text) => this.maskString(text));
  }

  /**
   * Get all registered pattern names
   */
  getPatternNames(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Get pattern description
   */
  getPatternDescription(name: string): string {
    return this.patterns.get(name)?.description || 'Unknown pattern';
  }
}

/**
 * Singleton instance
 */
let piiMaskingInstance: PiiMaskingManager | null = null;

/**
 * Get PII masking instance (singleton)
 */
export function getPiiMaskingManager(): PiiMaskingManager {
  if (!piiMaskingInstance) {
    piiMaskingInstance = new PiiMaskingManager();
  }
  return piiMaskingInstance;
}

/**
 * Quick masking functions
 */
export const maskPhone = (phone: string): string => getPiiMaskingManager().maskString(phone);
export const maskEmail = (email: string): string => getPiiMaskingManager().maskString(email);
export const maskCreditCard = (card: string): string => getPiiMaskingManager().maskString(card);
export const maskToken = (token: string): string => getPiiMaskingManager().maskString(token);
export const maskObject = (obj: any): any => getPiiMaskingManager().maskObject(obj);
export const maskValue = (value: any): string => getPiiMaskingManager().maskValue(value);

export default PiiMaskingManager;
