// @ts-nocheck
/**
 * User Validation Schemas
 * Zod schemas for user-related input validation
 */

import { z } from 'zod';

// Phone number: E.164 format (international)
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number must be in E.164 format (e.g., +919876543210)');

// Name: 2-100 characters, letters and spaces only
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Email: Standard email format
export const emailSchema = z.string().email('Invalid email address');

// User ID: MongoDB ObjectId format
export const userIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID format');

// User registration
export const userRegistrationSchema = z.object({
  phone: phoneSchema,
  name: nameSchema,
  email: emailSchema.optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase, one uppercase, and one number',
    )
    .optional(),
});

// User login
export const userLoginSchema = z
  .object({
    phone: phoneSchema,
    otp: z.string().length(6, 'OTP must be 6 digits').optional(),
    password: z.string().optional(),
  })
  .refine((data) => data.otp || data.password, { message: 'Either OTP or password is required' });

// User update profile
export const userUpdateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  profileImage: z.string().url('Invalid URL').optional(),
});

// Password change
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase, one uppercase, and one number',
    ),
});

// Export types
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
