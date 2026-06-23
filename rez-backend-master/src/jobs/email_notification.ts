/**
 * email_notification job handler
 *
 * Consumed by the 'notifications' BullMQ worker via genericJobHandler.
 * Enqueued by:
 *   - notificationManagement (template-based admin sends, email channel)
 *
 * Job data shape:
 *   { userId, email, title, body, data?, source? }
 *
 * Either userId (looked up → email) or email directly must be provided.
 */

import { EmailService } from '../services/EmailService';
import { User } from '../models/User';
import { logger } from '../config/logger';

interface EmailNotificationJobData {
  userId?: string;
  email?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  source?: string;
}

export default async function email_notification(jobData: EmailNotificationJobData): Promise<boolean> {
  const { userId, title, body, source } = jobData;
  let { email } = jobData;

  if (!title || !body) {
    logger.warn('[email_notification] Missing required fields — skipping', { userId, title });
    return false;
  }

  // Resolve email from userId if not provided
  if (!email && userId) {
    const user = await User.findById(userId).select('email').lean<{ email?: string }>();
    email = user?.email;
  }

  if (!email) {
    logger.warn('[email_notification] No email address resolved — skipping', { userId, source });
    return false;
  }

  try {
    await EmailService.send({
      to: email,
      subject: title,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    });

    logger.debug('[email_notification] Sent', { email, source });
    return true;
  } catch (err: any) {
    logger.error('[email_notification] Failed', { email, source, error: err.message });
    throw err; // rethrow so BullMQ retries on transient failures
  }
}
