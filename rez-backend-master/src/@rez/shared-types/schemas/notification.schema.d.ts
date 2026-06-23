// @ts-nocheck
/**
 * Notification API validation schemas
 * Validates SendNotification, NotificationEvent, and NotificationResponse requests/responses
 */
import { z } from 'zod';
export declare const NOTIFICATION_TYPE: z.ZodEnum<
  ['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']
>;
export declare const NOTIFICATION_CHANNEL: z.ZodEnum<['push', 'email', 'sms', 'in_app']>;
export declare const NotificationEventSchema: z.ZodObject<
  {
    type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
    entityId: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
    data?: Record<string, string | number | boolean>;
    entityId?: string;
    entityType?: string;
  },
  {
    type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
    data?: Record<string, string | number | boolean>;
    entityId?: string;
    entityType?: string;
  }
>;
export declare const NotificationRecipientSchema: z.ZodObject<
  {
    userId: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    pushToken: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    userId?: string;
    phone?: string;
    email?: string;
    pushToken?: string;
  },
  {
    userId?: string;
    phone?: string;
    email?: string;
    pushToken?: string;
  }
>;
export declare const SendNotificationSchema: z.ZodObject<
  {
    event: z.ZodObject<
      {
        type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
        entityId: z.ZodOptional<z.ZodString>;
        entityType: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
        data?: Record<string, string | number | boolean>;
        entityId?: string;
        entityType?: string;
      },
      {
        type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
        data?: Record<string, string | number | boolean>;
        entityId?: string;
        entityType?: string;
      }
    >;
    recipients: z.ZodArray<
      z.ZodObject<
        {
          userId: z.ZodString;
          email: z.ZodOptional<z.ZodString>;
          phone: z.ZodOptional<z.ZodString>;
          pushToken: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          userId?: string;
          phone?: string;
          email?: string;
          pushToken?: string;
        },
        {
          userId?: string;
          phone?: string;
          email?: string;
          pushToken?: string;
        }
      >,
      'many'
    >;
    type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
    channel: z.ZodEnum<['push', 'email', 'sms', 'in_app']>;
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    scheduledFor: z.ZodOptional<z.ZodDate>;
  },
  'strip',
  z.ZodTypeAny,
  {
    message?: string;
    type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
    event?: {
      type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
      data?: Record<string, string | number | boolean>;
      entityId?: string;
      entityType?: string;
    };
    channel?: 'push' | 'email' | 'sms' | 'in_app';
    title?: string;
    recipients?: {
      userId?: string;
      phone?: string;
      email?: string;
      pushToken?: string;
    }[];
    payload?: Record<string, string | number | boolean>;
    scheduledFor?: Date;
  },
  {
    message?: string;
    type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
    event?: {
      type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
      data?: Record<string, string | number | boolean>;
      entityId?: string;
      entityType?: string;
    };
    channel?: 'push' | 'email' | 'sms' | 'in_app';
    title?: string;
    recipients?: {
      userId?: string;
      phone?: string;
      email?: string;
      pushToken?: string;
    }[];
    payload?: Record<string, string | number | boolean>;
    scheduledFor?: Date;
  }
>;
export declare const NotificationResponseSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    event: z.ZodObject<
      {
        type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
        entityId: z.ZodOptional<z.ZodString>;
        entityType: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
        data?: Record<string, string | number | boolean>;
        entityId?: string;
        entityType?: string;
      },
      {
        type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
        data?: Record<string, string | number | boolean>;
        entityId?: string;
        entityType?: string;
      }
    >;
    recipients: z.ZodArray<
      z.ZodObject<
        {
          userId: z.ZodString;
          email: z.ZodOptional<z.ZodString>;
          phone: z.ZodOptional<z.ZodString>;
          pushToken: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          userId?: string;
          phone?: string;
          email?: string;
          pushToken?: string;
        },
        {
          userId?: string;
          phone?: string;
          email?: string;
          pushToken?: string;
        }
      >,
      'many'
    >;
    type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
    channel: z.ZodEnum<['push', 'email', 'sms', 'in_app']>;
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    isRead: z.ZodOptional<z.ZodBoolean>;
    readAt: z.ZodOptional<z.ZodDate>;
    sentAt: z.ZodOptional<z.ZodDate>;
    failureReason: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodOptional<z.ZodDate>;
  },
  'strip',
  z.ZodTypeAny,
  {
    message?: string;
    type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    event?: {
      type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
      data?: Record<string, string | number | boolean>;
      entityId?: string;
      entityType?: string;
    };
    failureReason?: string;
    channel?: 'push' | 'email' | 'sms' | 'in_app';
    sentAt?: Date;
    title?: string;
    recipients?: {
      userId?: string;
      phone?: string;
      email?: string;
      pushToken?: string;
    }[];
    payload?: Record<string, string | number | boolean>;
    isRead?: boolean;
    readAt?: Date;
  },
  {
    message?: string;
    type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    event?: {
      type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
      data?: Record<string, string | number | boolean>;
      entityId?: string;
      entityType?: string;
    };
    failureReason?: string;
    channel?: 'push' | 'email' | 'sms' | 'in_app';
    sentAt?: Date;
    title?: string;
    recipients?: {
      userId?: string;
      phone?: string;
      email?: string;
      pushToken?: string;
    }[];
    payload?: Record<string, string | number | boolean>;
    isRead?: boolean;
    readAt?: Date;
  }
>;
export declare const NotificationListResponseSchema: z.ZodArray<
  z.ZodObject<
    {
      _id: z.ZodOptional<z.ZodString>;
      event: z.ZodObject<
        {
          type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
          entityId: z.ZodOptional<z.ZodString>;
          entityType: z.ZodOptional<z.ZodString>;
          data: z.ZodOptional<
            z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>
          >;
        },
        'strip',
        z.ZodTypeAny,
        {
          type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
          data?: Record<string, string | number | boolean>;
          entityId?: string;
          entityType?: string;
        },
        {
          type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
          data?: Record<string, string | number | boolean>;
          entityId?: string;
          entityType?: string;
        }
      >;
      recipients: z.ZodArray<
        z.ZodObject<
          {
            userId: z.ZodString;
            email: z.ZodOptional<z.ZodString>;
            phone: z.ZodOptional<z.ZodString>;
            pushToken: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            userId?: string;
            phone?: string;
            email?: string;
            pushToken?: string;
          },
          {
            userId?: string;
            phone?: string;
            email?: string;
            pushToken?: string;
          }
        >,
        'many'
      >;
      type: z.ZodEnum<['order', 'payment', 'promotion', 'wallet', 'referral', 'system', 'alert']>;
      channel: z.ZodEnum<['push', 'email', 'sms', 'in_app']>;
      title: z.ZodOptional<z.ZodString>;
      message: z.ZodString;
      payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
      isRead: z.ZodOptional<z.ZodBoolean>;
      readAt: z.ZodOptional<z.ZodDate>;
      sentAt: z.ZodOptional<z.ZodDate>;
      failureReason: z.ZodOptional<z.ZodString>;
      createdAt: z.ZodDate;
      updatedAt: z.ZodOptional<z.ZodDate>;
    },
    'strip',
    z.ZodTypeAny,
    {
      message?: string;
      type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
      _id?: string;
      createdAt?: Date;
      updatedAt?: Date;
      event?: {
        type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
        data?: Record<string, string | number | boolean>;
        entityId?: string;
        entityType?: string;
      };
      failureReason?: string;
      channel?: 'push' | 'email' | 'sms' | 'in_app';
      sentAt?: Date;
      title?: string;
      recipients?: {
        userId?: string;
        phone?: string;
        email?: string;
        pushToken?: string;
      }[];
      payload?: Record<string, string | number | boolean>;
      isRead?: boolean;
      readAt?: Date;
    },
    {
      message?: string;
      type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
      _id?: string;
      createdAt?: Date;
      updatedAt?: Date;
      event?: {
        type?: 'referral' | 'wallet' | 'order' | 'payment' | 'promotion' | 'system' | 'alert';
        data?: Record<string, string | number | boolean>;
        entityId?: string;
        entityType?: string;
      };
      failureReason?: string;
      channel?: 'push' | 'email' | 'sms' | 'in_app';
      sentAt?: Date;
      title?: string;
      recipients?: {
        userId?: string;
        phone?: string;
        email?: string;
        pushToken?: string;
      }[];
      payload?: Record<string, string | number | boolean>;
      isRead?: boolean;
      readAt?: Date;
    }
  >,
  'many'
>;
export declare const MarkNotificationAsReadSchema: z.ZodObject<
  {
    notificationId: z.ZodString;
    readAt: z.ZodOptional<z.ZodDate>;
  },
  'strip',
  z.ZodTypeAny,
  {
    readAt?: Date;
    notificationId?: string;
  },
  {
    readAt?: Date;
    notificationId?: string;
  }
>;
export declare const BatchMarkAsReadSchema: z.ZodObject<
  {
    notificationIds: z.ZodArray<z.ZodString, 'many'>;
  },
  'strip',
  z.ZodTypeAny,
  {
    notificationIds?: string[];
  },
  {
    notificationIds?: string[];
  }
>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;
export type SendNotificationRequest = z.infer<typeof SendNotificationSchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type NotificationType = z.infer<typeof NOTIFICATION_TYPE>;
export type NotificationChannel = z.infer<typeof NOTIFICATION_CHANNEL>;
//# sourceMappingURL=notification.schema.d.ts.map
