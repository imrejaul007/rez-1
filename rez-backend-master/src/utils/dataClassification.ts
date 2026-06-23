/**
 * Data Classification System
 *
 * Classifies data by sensitivity level for appropriate handling
 * Determines encryption, retention, and access control requirements
 */

/**
 * Data sensitivity levels
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC', // Publicly available information
  INTERNAL = 'INTERNAL', // Internal use only
  CONFIDENTIAL = 'CONFIDENTIAL', // Sensitive business data
  RESTRICTED = 'RESTRICTED', // Highly sensitive, heavily regulated
}

/**
 * Data classification rules
 */
export interface ClassificationRule {
  classification: DataClassification;
  requiresEncryption: boolean;
  requiresAccessControl: boolean;
  auditLogging: boolean;
  maxRetentionDays: number;
  allowExport: boolean;
  allowSharing: boolean;
}

/**
 * Classification rules for different data types
 */
export const CLASSIFICATION_RULES: Record<DataClassification, ClassificationRule> = {
  [DataClassification.PUBLIC]: {
    classification: DataClassification.PUBLIC,
    requiresEncryption: false,
    requiresAccessControl: false,
    auditLogging: false,
    maxRetentionDays: -1, // No limit
    allowExport: true,
    allowSharing: true,
  },

  [DataClassification.INTERNAL]: {
    classification: DataClassification.INTERNAL,
    requiresEncryption: false,
    requiresAccessControl: true,
    auditLogging: true,
    maxRetentionDays: 365,
    allowExport: true,
    allowSharing: false,
  },

  [DataClassification.CONFIDENTIAL]: {
    classification: DataClassification.CONFIDENTIAL,
    requiresEncryption: true,
    requiresAccessControl: true,
    auditLogging: true,
    maxRetentionDays: 90,
    allowExport: false,
    allowSharing: false,
  },

  [DataClassification.RESTRICTED]: {
    classification: DataClassification.RESTRICTED,
    requiresEncryption: true,
    requiresAccessControl: true,
    auditLogging: true,
    maxRetentionDays: 30,
    allowExport: false,
    allowSharing: false,
  },
};

/**
 * Field classification mapping
 */
export const FIELD_CLASSIFICATION: Record<string, DataClassification> = {
  // User Information
  userId: DataClassification.INTERNAL,
  email: DataClassification.CONFIDENTIAL,
  phone: DataClassification.CONFIDENTIAL,
  name: DataClassification.INTERNAL,
  dateOfBirth: DataClassification.RESTRICTED,
  governmentId: DataClassification.RESTRICTED,

  // Financial Information
  accountNumber: DataClassification.RESTRICTED,
  routingNumber: DataClassification.RESTRICTED,
  cardNumber: DataClassification.RESTRICTED,
  cvv: DataClassification.RESTRICTED,
  transactionAmount: DataClassification.CONFIDENTIAL,
  accountBalance: DataClassification.CONFIDENTIAL,
  bankDetails: DataClassification.RESTRICTED,

  // Address Information
  address: DataClassification.CONFIDENTIAL,
  city: DataClassification.INTERNAL,
  state: DataClassification.INTERNAL,
  country: DataClassification.INTERNAL,
  zipCode: DataClassification.CONFIDENTIAL,

  // Authentication
  password: DataClassification.RESTRICTED,
  passwordHash: DataClassification.RESTRICTED,
  twoFactorSecret: DataClassification.RESTRICTED,
  sessionToken: DataClassification.RESTRICTED,
  refreshToken: DataClassification.RESTRICTED,
  apiKey: DataClassification.RESTRICTED,

  // Business Data
  businessName: DataClassification.INTERNAL,
  taxId: DataClassification.RESTRICTED,
  revenue: DataClassification.CONFIDENTIAL,
  employeeCount: DataClassification.INTERNAL,

  // Order Information
  orderId: DataClassification.INTERNAL,
  orderStatus: DataClassification.INTERNAL,
  orderItems: DataClassification.INTERNAL,
  deliveryAddress: DataClassification.CONFIDENTIAL,

  // Log Data
  ipAddress: DataClassification.CONFIDENTIAL,
  userAgent: DataClassification.INTERNAL,
  timestamp: DataClassification.PUBLIC,
};

/**
 * Data type classification mappings
 */
export const DATA_TYPE_CLASSIFICATION: Record<string, DataClassification> = {
  // PII
  'pii/phone': DataClassification.CONFIDENTIAL,
  'pii/email': DataClassification.CONFIDENTIAL,
  'pii/name': DataClassification.INTERNAL,
  'pii/address': DataClassification.CONFIDENTIAL,
  'pii/ssn': DataClassification.RESTRICTED,
  'pii/dob': DataClassification.RESTRICTED,
  'pii/government_id': DataClassification.RESTRICTED,

  // Financial
  'financial/card_number': DataClassification.RESTRICTED,
  'financial/bank_account': DataClassification.RESTRICTED,
  'financial/amount': DataClassification.CONFIDENTIAL,
  'financial/balance': DataClassification.CONFIDENTIAL,
  'financial/transaction': DataClassification.CONFIDENTIAL,

  // Authentication
  'auth/password': DataClassification.RESTRICTED,
  'auth/token': DataClassification.RESTRICTED,
  'auth/api_key': DataClassification.RESTRICTED,
  'auth/session': DataClassification.RESTRICTED,

  // Business
  'business/proprietary': DataClassification.CONFIDENTIAL,
  'business/strategy': DataClassification.CONFIDENTIAL,
  'business/financials': DataClassification.CONFIDENTIAL,

  // Public
  'public/product': DataClassification.PUBLIC,
  'public/pricing': DataClassification.PUBLIC,
  'public/category': DataClassification.PUBLIC,
};

/**
 * Data classification manager
 */
export class DataClassificationManager {
  /**
   * Classify a field by name
   */
  classifyField(fieldName: string): DataClassification {
    return FIELD_CLASSIFICATION[fieldName] || DataClassification.INTERNAL;
  }

  /**
   * Classify data by type
   */
  classifyDataType(dataType: string): DataClassification {
    return DATA_TYPE_CLASSIFICATION[dataType] || DataClassification.INTERNAL;
  }

  /**
   * Get classification rules for a field
   */
  getFieldRules(fieldName: string): ClassificationRule {
    const classification = this.classifyField(fieldName);
    return CLASSIFICATION_RULES[classification];
  }

  /**
   * Check if a field requires encryption
   */
  requiresEncryption(fieldName: string): boolean {
    return this.getFieldRules(fieldName).requiresEncryption;
  }

  /**
   * Check if a field requires access control
   */
  requiresAccessControl(fieldName: string): boolean {
    return this.getFieldRules(fieldName).requiresAccessControl;
  }

  /**
   * Check if a field allows export
   */
  allowsExport(fieldName: string): boolean {
    return this.getFieldRules(fieldName).allowExport;
  }

  /**
   * Check if a field allows sharing
   */
  allowsSharing(fieldName: string): boolean {
    return this.getFieldRules(fieldName).allowSharing;
  }

  /**
   * Get maximum retention period for a field (in days)
   */
  getMaxRetention(fieldName: string): number {
    return this.getFieldRules(fieldName).maxRetentionDays;
  }

  /**
   * Classify all fields in an object
   */
  classifyObject(obj: Record<string, any>): Record<string, DataClassification> {
    const classification: Record<string, DataClassification> = {};

    for (const fieldName of Object.keys(obj)) {
      classification[fieldName] = this.classifyField(fieldName);
    }

    return classification;
  }

  /**
   * Get fields that require encryption in an object
   */
  getEncryptableFields(obj: Record<string, any>): string[] {
    return Object.keys(obj).filter((fieldName) => this.requiresEncryption(fieldName));
  }

  /**
   * Get fields that require access control
   */
  getAccessControlledFields(obj: Record<string, any>): string[] {
    return Object.keys(obj).filter((fieldName) => this.requiresAccessControl(fieldName));
  }

  /**
   * Validate data export compliance
   */
  validateExportCompliance(obj: Record<string, any>): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const [fieldName, value] of Object.entries(obj)) {
      if (!this.allowsExport(fieldName)) {
        violations.push(`Field "${fieldName}" (${this.classifyField(fieldName)}) cannot be exported`);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Get data retention schedule for an object
   */
  getRetentionSchedule(obj: Record<string, any>): Record<string, number> {
    const schedule: Record<string, number> = {};

    for (const fieldName of Object.keys(obj)) {
      const maxRetention = this.getMaxRetention(fieldName);
      if (maxRetention > 0) {
        schedule[fieldName] = maxRetention;
      }
    }

    return schedule;
  }

  /**
   * Generate data handling requirements summary
   */
  getHandlingRequirements(fieldName: string): {
    classification: DataClassification;
    encryption: boolean;
    accessControl: boolean;
    auditLogging: boolean;
    retention: number;
    export: boolean;
    sharing: boolean;
  } {
    const rules = this.getFieldRules(fieldName);

    return {
      classification: this.classifyField(fieldName),
      encryption: rules.requiresEncryption,
      accessControl: rules.requiresAccessControl,
      auditLogging: rules.auditLogging,
      retention: rules.maxRetentionDays,
      export: rules.allowExport,
      sharing: rules.allowSharing,
    };
  }

  /**
   * Check if two fields have compatible classifications for combining
   */
  areClassificationsCompatible(field1: string, field2: string): boolean {
    const class1 = this.classifyField(field1);
    const class2 = this.classifyField(field2);

    // Most restrictive classification wins
    const hierarchy = [
      DataClassification.PUBLIC,
      DataClassification.INTERNAL,
      DataClassification.CONFIDENTIAL,
      DataClassification.RESTRICTED,
    ];

    const index1 = hierarchy.indexOf(class1);
    const index2 = hierarchy.indexOf(class2);

    // Allow combining if they're close in hierarchy (within 2 levels)
    return Math.abs(index1 - index2) <= 2;
  }
}

export default DataClassificationManager;
