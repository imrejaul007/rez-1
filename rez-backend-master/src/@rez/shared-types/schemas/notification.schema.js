"use strict";
/**
 * Notification API validation schemas
 * Validates SendNotification, NotificationEvent, and NotificationResponse requests/responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchMarkAsReadSchema = exports.MarkNotificationAsReadSchema = exports.NotificationListResponseSchema = exports.NotificationResponseSchema = exports.SendNotificationSchema = exports.NotificationRecipientSchema = exports.NotificationEventSchema = exports.NOTIFICATION_CHANNEL = exports.NOTIFICATION_TYPE = void 0;
const zod_1 = require("zod");
// Notification type enum
exports.NOTIFICATION_TYPE = zod_1.z.enum([
    'order',
    'payment',
    'promotion',
    'wallet',
    'referral',
    'system',
    'alert',
]);
// Notification channel enum
exports.NOTIFICATION_CHANNEL = zod_1.z.enum([
    'push',
    'email',
    'sms',
    'in_app',
]);
// Notification Event schema
exports.NotificationEventSchema = zod_1.z.object({
    type: exports.NOTIFICATION_TYPE,
    entityId: zod_1.z.string().optional(),
    entityType: zod_1.z.string().optional(),
    data: zod_1.z
        .record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()]))
        .optional(),
});
// Notification Recipient schema
exports.NotificationRecipientSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    email: zod_1.z.string().email('Invalid email').optional(),
    phone: zod_1.z.string().optional(),
    pushToken: zod_1.z.string().optional(),
});
// Send Notification Request
exports.SendNotificationSchema = zod_1.z.object({
    event: exports.NotificationEventSchema,
    recipients: zod_1.z.array(exports.NotificationRecipientSchema).min(1, 'At least one recipient is required'),
    type: exports.NOTIFICATION_TYPE,
    channel: exports.NOTIFICATION_CHANNEL,
    title: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1, 'Message is required'),
    payload: zod_1.z
        .record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()]))
        .optional(),
    scheduledFor: zod_1.z.date().optional(),
});
// Notification Response
exports.NotificationResponseSchema = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    event: exports.NotificationEventSchema,
    recipients: zod_1.z.array(exports.NotificationRecipientSchema),
    type: exports.NOTIFICATION_TYPE,
    channel: exports.NOTIFICATION_CHANNEL,
    title: zod_1.z.string().optional(),
    message: zod_1.z.string(),
    payload: zod_1.z
        .record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()]))
        .optional(),
    isRead: zod_1.z.boolean().optional(),
    readAt: zod_1.z.date().optional(),
    sentAt: zod_1.z.date().optional(),
    failureReason: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date().optional(),
});
// Notification List Response
exports.NotificationListResponseSchema = zod_1.z.array(exports.NotificationResponseSchema);
// Mark Notification as Read Request
exports.MarkNotificationAsReadSchema = zod_1.z.object({
    notificationId: zod_1.z.string().min(1, 'Notification ID is required'),
    readAt: zod_1.z.date().optional(),
});
// Batch Mark as Read Request
exports.BatchMarkAsReadSchema = zod_1.z.object({
    notificationIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one notification ID is required'),
});
//# sourceMappingURL=notification.schema.js.map