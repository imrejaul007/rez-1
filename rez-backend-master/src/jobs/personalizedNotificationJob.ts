import { logger } from '../config/logger';
import { User } from '../models/User';
import ExclusiveOffer from '../models/ExclusiveOffer';

type NotificationWindow = 'lunch' | 'hangout';

const WINDOW_CONFIG: Record<NotificationWindow, {
  tags: string[];
  studentTitle: string;
  employeeTitle: string;
}> = {
  lunch: {
    tags: ['food', 'cafe', 'restaurant', 'lunch', 'dining'],
    studentTitle: 'Student lunch deals near you',
    employeeTitle: 'Lunch deals near your office',
  },
  hangout: {
    tags: ['salon', 'gym', 'entertainment', 'spa', 'fitness'],
    studentTitle: 'After-class deals near campus',
    employeeTitle: 'After-work perks nearby',
  },
};

export const personalizedNotificationJob = {
  async run(window: NotificationWindow): Promise<void> {
    const config = WINDOW_CONFIG[window];
    if (!config) {
      logger.warn(`[PersonalizedNotif] Unknown window: ${window}`);
      return;
    }

    try {
      // Find relevant deals (active, not expired, matching tags)
      const now = new Date();
      const deals = await ExclusiveOffer.find({
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
        targetAudience: { $in: ['student', 'corporate', 'all'] },
      })
        .sort({ discount: -1 })
        .limit(4)
        .lean();

      if (deals.length === 0) {
        logger.info(`[PersonalizedNotif] No deals for ${window} window — skipping`);
        return;
      }

      // Find verified students
      const students = await User.find({
        segment: 'verified_student',
        isActive: true,
        'pushTokens.0': { $exists: true },
      })
        .select('_id pushTokens')
        .lean();

      // Find verified employees
      const employees = await User.find({
        segment: 'verified_employee',
        isActive: true,
        'pushTokens.0': { $exists: true },
      })
        .select('_id pushTokens')
        .lean();

      const dealSummary = deals
        .slice(0, 2)
        .map((d) => `${d.title} — save ${d.discount}%`)
        .join(', ');

      logger.info(
        `[PersonalizedNotif] ${window}: ${students.length} students, ${employees.length} employees, ${deals.length} deals`
      );

      // TODO: Wire to actual push notification service
      // For each student: send push with config.studentTitle + dealSummary
      // For each employee: send push with config.employeeTitle + dealSummary
      // Data payload: { screen: '/offers/student' or '/offers/corporate', type: 'daily_deal', window }

    } catch (error) {
      logger.error(`[PersonalizedNotif] Error in ${window} window:`, error);
    }
  },
};

export default personalizedNotificationJob;
