/**
 * Privacy and GDPR-related type definitions
 * Complies with GDPR Articles 13-22
 */

/**
 * Types of personal data collected
 */
export enum DataCategory {
  IDENTITY = 'identity',
  CONTACT = 'contact',
  TECHNICAL = 'technical',
  ACTIVITY = 'activity',
  FINANCIAL = 'financial',
}

/**
 * Legal basis for data processing under GDPR Article 6
 */
export enum LegalBasis {
  CONSENT = 'consent', // Article 6(1)(a)
  CONTRACT = 'contract', // Article 6(1)(b)
  LEGAL_OBLIGATION = 'legal_obligation', // Article 6(1)(c)
  VITAL_INTERESTS = 'vital_interests', // Article 6(1)(d)
  PUBLIC_TASK = 'public_task', // Article 6(1)(e)
  LEGITIMATE_INTERESTS = 'legitimate_interests', // Article 6(1)(f)
}

/**
 * GDPR data subject rights (Articles 15-22)
 */
export enum DataSubjectRight {
  ACCESS = 'access', // Article 15
  RECTIFICATION = 'rectification', // Article 16
  ERASURE = 'erasure', // Article 17 (Right to be forgotten)
  RESTRICTION = 'restriction', // Article 18
  PORTABILITY = 'portability', // Article 20
  OBJECTION = 'objection', // Article 21
  AUTOMATED_DECISION = 'automated_decision', // Article 22
}

/**
 * Data collected in referral program
 */
export interface ReferralDataCollection {
  /**
   * Referrer's personal information
   */
  referrer: {
    userId: string;
    name?: string;
    email: string;
    joinDate: Date;
  };

  /**
   * Referred user's information
   */
  referredUser: {
    email: string;
    name?: string;
    registrationDate?: Date;
    conversionStatus: 'pending' | 'converted' | 'expired';
  };

  /**
   * Activity tracking data
   */
  activityData: {
    referralCode: string;
    clickTimestamp: Date;
    conversionTimestamp?: Date;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
  };

  /**
   * Legal basis for processing this data
   */
  legalBasis: LegalBasis;
}

/**
 * Privacy consent record
 */
export interface PrivacyConsent {
  userId: string;
  consentType: 'referral_program' | 'marketing' | 'analytics' | 'data_sharing';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  withdrawnAt?: Date;
  version: string; // Privacy policy version
}

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  dataCategory: DataCategory;
  retentionPeriod: number; // in days
  retentionBasis: string; // Legal justification
  deletionMethod: 'automatic' | 'manual' | 'anonymization';
}

/**
 * Data subject request (DSR)
 */
export interface DataSubjectRequest {
  requestId: string;
  userId: string;
  requestType: DataSubjectRight;
  submittedAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  completedAt?: Date;
  notes?: string;
  verificationMethod: 'email' | 'id_document' | 'two_factor';
  verifiedAt?: Date;
}

/**
 * Data processing activity (for GDPR Article 30 record-keeping)
 */
export interface DataProcessingActivity {
  activityId: string;
  purpose: string;
  dataCategories: DataCategory[];
  legalBasis: LegalBasis;
  recipients?: string[]; // Third parties who receive data
  internationalTransfers: boolean;
  safeguards?: string; // For international transfers
  retentionPeriod: string;
  securityMeasures: string[];
}

/**
 * Third-party data processor
 */
export interface DataProcessor {
  processorId: string;
  name: string;
  purpose: 'payment' | 'analytics' | 'fraud_prevention' | 'email' | 'storage';
  location: string; // Country/region
  dpaSignedAt?: Date; // Data Processing Agreement
  adequacyDecision?: string; // EU Commission adequacy decision
  standardContractualClauses?: boolean;
}

/**
 * Privacy notice metadata
 */
export interface PrivacyNoticeMetadata {
  version: string;
  effectiveDate: Date;
  lastUpdated: Date;
  language: string;
  jurisdiction: 'EU' | 'US' | 'UK' | 'OTHER';
  dataController: {
    name: string;
    address: string;
    email: string;
    dpoEmail?: string; // Data Protection Officer
  };
}

/**
 * User privacy preferences
 */
export interface PrivacyPreferences {
  userId: string;
  marketing: boolean;
  analytics: boolean;
  personalization: boolean;
  dataSharing: boolean;
  updatedAt: Date;
}

/**
 * Privacy audit log entry
 */
export interface PrivacyAuditLog {
  logId: string;
  timestamp: Date;
  userId: string;
  action: 'consent_granted' | 'consent_withdrawn' | 'data_accessed' | 'data_exported' | 'data_deleted' | 'data_modified';
  dataCategories: DataCategory[];
  performedBy: string; // User or admin ID
  ipAddress?: string;
  details?: Record<string, any>;
}

/**
 * Data breach notification (GDPR Article 33-34)
 */
export interface DataBreachNotification {
  breachId: string;
  detectedAt: Date;
  reportedToAuthority: boolean;
  reportedToAuthorityAt?: Date;
  affectedUsers: string[];
  dataCategories: DataCategory[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationSteps: string[];
  usersNotified: boolean;
  usersNotifiedAt?: Date;
}

/**
 * Props for PrivacyNotice component
 */
export interface PrivacyNoticeProps {
  defaultExpanded?: boolean;
  privacyPolicyUrl?: string;
  containerStyle?: any;
  onExpand?: () => void;
  onCollapse?: () => void;
  showContactInfo?: boolean;
  customDataController?: PrivacyNoticeMetadata['dataController'];
}

/**
 * Privacy settings form data
 */
export interface PrivacySettingsFormData {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  thirdPartySharing: boolean;
  dataRetention: 'minimal' | 'standard' | 'extended';
  profileVisibility: 'private' | 'friends' | 'public';
}

export default {
  DataCategory,
  LegalBasis,
  DataSubjectRight,
};
