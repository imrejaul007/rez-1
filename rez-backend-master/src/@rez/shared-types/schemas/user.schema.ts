// @ts-nocheck
/**
 * User API validation schemas
 * Validates CreateUser, UpdateProfile, and UserResponse requests/responses
 */

import { z } from 'zod';

// User role enum (7 types)
export const USER_ROLE = z.enum(['user', 'consumer', 'merchant', 'admin', 'support', 'operator', 'super_admin']);

// Gender enum
export const GENDER = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

// Account verification status (5 states: unverified → pending → verified/rejected/expired)
// Renamed 2026-04-16 from VERIFICATION_STATUS to avoid type collision with
// the 3-state VerificationStatus enum exported from enums/index.ts in the same package.
export const ACCOUNT_VERIFICATION_STATUS = z.enum(['unverified', 'pending', 'verified', 'rejected', 'expired']);

// Theme enum
export const THEME = z.enum(['light', 'dark', 'auto']);

// User Location schema
export const UserLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(), // [longitude, latitude]
});

// User Location History schema
export const UserLocationHistorySchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
  address: z.string(),
  city: z.string().optional(),
  timestamp: z.date(),
  source: z.string(),
});

// User Jewelry Preferences schema
export const UserJewelryPreferencesSchema = z.object({
  preferredMetals: z.array(z.string()).optional(),
  preferredStones: z.array(z.string()).optional(),
  style: z.string().optional(),
});

// User Verification Document schema
export const UserVerificationDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentNumber: z.string().min(1, 'Document number is required'),
  documentImage: z.string().url('Invalid document image URL'),
  submittedAt: z.date(),
});

// User Notification Preferences schema
export const UserNotificationPreferencesSchema = z.object({
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});

// User Profile schema
export const UserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  bio: z.string().optional(),
  website: z.string().url('Invalid website URL').optional(),
  dateOfBirth: z.date().optional(),
  gender: GENDER.optional(),
  location: UserLocationSchema.optional(),
  locationHistory: z.array(UserLocationHistorySchema).optional(),
  timezone: z.string().optional(),
  ringSize: z.string().optional(),
  jewelryPreferences: UserJewelryPreferencesSchema.optional(),
  verificationStatus: ACCOUNT_VERIFICATION_STATUS.optional(),
  verificationDocuments: UserVerificationDocumentSchema.optional(),
});

// User Preferences schema
export const UserPreferencesSchema = z.object({
  language: z.string().optional(),
  notifications: UserNotificationPreferencesSchema.optional(),
  categories: z.array(z.string()).optional(),
  theme: THEME.optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
});

// User Auth schema (read-only, not for creation)
export const UserAuthSchema = z.object({
  isVerified: z.boolean(),
  isOnboarded: z.boolean(),
  lastLogin: z.date().optional(),
  loginAttempts: z.number().int().min(0),
  totpEnabled: z.boolean().optional(),
});

// Create User Request
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: USER_ROLE.optional().default('user'),
  profile: UserProfileSchema.optional(),
  preferences: UserPreferencesSchema.optional(),
});

// Update Profile Request
export const UpdateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  bio: z.string().optional(),
  website: z.string().url('Invalid website URL').optional(),
  dateOfBirth: z.date().optional(),
  gender: GENDER.optional(),
  location: UserLocationSchema.optional(),
  timezone: z.string().optional(),
  ringSize: z.string().optional(),
  jewelryPreferences: UserJewelryPreferencesSchema.optional(),
  preferences: UserPreferencesSchema.optional(),
});

// User Response
export const UserResponseSchema = z.object({
  _id: z.string().optional(),
  email: z.string().email(),
  phone: z.string(),
  role: USER_ROLE,
  profile: UserProfileSchema.optional(),
  preferences: UserPreferencesSchema.optional(),
  auth: UserAuthSchema.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// User List Response
export const UserListResponseSchema = z.array(UserResponseSchema);

// Infer TypeScript types
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
export type UserRole = z.infer<typeof USER_ROLE>;
export type Gender = z.infer<typeof GENDER>;
export type AccountVerificationStatus = z.infer<typeof ACCOUNT_VERIFICATION_STATUS>;
export type Theme = z.infer<typeof THEME>;
