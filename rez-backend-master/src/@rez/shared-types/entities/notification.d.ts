// @ts-nocheck
/**
 * Notification entity types.
 *
 * Mirrors rez-notification-events + the notifications collection in the
 * monolith. The `data` / `payload` fields are typed as
 * `INotificationPayload` — scalar-only records, plus a few known keys
 * (deepLinkUrl, orderId, ctaText) the client actually consumes.
 */
import { NotificationType, NotificationChannel } from '../enums/index';
/**
 * Scalar-only payload bag with known keys surfaced.
 * Unknown keys are tolerated via the index signature but must be scalars.
 */
export interface INotificationPayload {
  /** Client-resolvable deep link (rezapp://... or https://). */
  deepLinkUrl?: string;
  /** Related order identifier (if any). */
  orderId?: string;
  /** Related payment identifier (if any). */
  paymentId?: string;
  /** Related merchant identifier (if any). */
  merchantId?: string;
  /** Button/cta text for rich notifications. */
  ctaText?: string;
  /** Optional image URL for rich push. */
  imageUrl?: string;
  [key: string]: string | number | boolean | null | undefined;
}
export interface INotificationEvent {
  type: NotificationType;
  entityId?: string;
  entityType?: string;
  data?: INotificationPayload;
}
export interface INotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushToken?: string;
}
export interface INotification {
  _id?: string;
  event: INotificationEvent;
  recipients: INotificationRecipient[];
  type: NotificationType;
  channel: NotificationChannel;
  title?: string;
  message: string;
  payload?: INotificationPayload;
  isRead?: boolean;
  readAt?: Date | string;
  sentAt?: Date | string;
  failureReason?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
//# sourceMappingURL=notification.d.ts.map
