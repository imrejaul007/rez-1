// @ts-nocheck
/**
 * Notification API validation schemas
 * Validates SendNotification, NotificationEvent, and NotificationResponse requests/responses
 */

import { z } from 'zod';

// Notification type enum
export const NOTIFICATION_TYPE = z.enum(['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']);

// Notification channel enum
export const NOTIFICATION_CHANNEL = z.enum(['push', 'email', 'sms', 'in_app']);

// Notification Event schema
export const NotificationEventSchema = z.object({
  type: NOTIFICATION_TYPE,
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

// Notification Recipient schema
export const NotificationRecipientSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  pushToken: z.string().optional(),
});

// Send Notification Request
export const SendNotificationSchema = z.object({
  event: NotificationEventSchema,
  recipients: z.array(NotificationRecipientSchema).min(1, 'At least one recipient is required'),
  type: NOTIFICATION_TYPE,
  channel: NOTIFICATION_CHANNEL,
  title: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  scheduledFor: z.date().optional(),
});

// Notification Response
export const NotificationResponseSchema = z.object({
  _id: z.string().optional(),
  event: NotificationEventSchema,
  recipients: z.array(NotificationRecipientSchema),
  type: NOTIFICATION_TYPE,
  channel: NOTIFICATION_CHANNEL,
  title: z.string().optional(),
  message: z.string(),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  isRead: z.boolean().optional(),
  readAt: z.date().optional(),
  sentAt: z.date().optional(),
  failureReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// Notification List Response
export const NotificationListResponseSchema = z.array(NotificationResponseSchema);

// Mark Notification as Read Request
export const MarkNotificationAsReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
  readAt: z.date().optional(),
});

// Batch Mark as Read Request
export const BatchMarkAsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID is required'),
});

// Infer TypeScript types
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;
export type SendNotificationRequest = z.infer<typeof SendNotificationSchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type NotificationType = z.infer<typeof NOTIFICATION_TYPE>;
export type NotificationChannel = z.infer<typeof NOTIFICATION_CHANNEL>;
