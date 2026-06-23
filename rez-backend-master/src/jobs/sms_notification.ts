/**
 * sms_notification job handler
 *
 * Consumed by the 'notifications' BullMQ worker via genericJobHandler.
 * Enqueued by:
 *   - notificationManagement (template-based admin sends, sms channel)
 *
 * Job data shape:
 *   { userId, phone, title, body, data?, source? }
 *
 * Either userId (looked up → phone) or phone directly must be provided.
 */

import { SMSService } from '../services/SMSService';
import { User } from '../models/User';
import { logger } from '../config/logger';

interface SmsNotificationJobData {
  userId?: string;
  phone?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  source?: string;
}

export default async function sms_notification(jobData: SmsNotificationJobData): Promise<boolean> {
  const { userId, title, body, source } = jobData;
  let { phone } = jobData;

  if (!body) {
    logger.warn('[sms_notification] Missing body — skipping', { userId });
    return false;
  }

  // Resolve phone from userId if not provided
  if (!phone && userId) {
    const user = await User.findById(userId).select('phoneNumber').lean<{ phoneNumber?: string }>();
    phone = user?.phoneNumber;
  }

  if (!phone) {
    logger.warn('[sms_notification] No phone number resolved — skipping', { userId, source });
    return false;
  }

  // Compose message: "Title: body" — SMS has no subject line
  const message = title ? `${title}: ${body}` : body;

  try {
    await SMSService.send({ to: phone, message });
    logger.debug('[sms_notification] Sent', { phone: `***${phone.slice(-4)}`, source });
    return true;
  } catch (err: any) {
    logger.error('[sms_notification] Failed', {
      phone: `***${phone.slice(-4)}`,
      source,
      error: err.message,
    });
    throw err; // rethrow so BullMQ retries on transient failures
  }
}
