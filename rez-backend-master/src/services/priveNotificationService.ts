import { Types } from 'mongoose';
import PriveVoucher from '../models/PriveVoucher';
import PriveOffer from '../models/PriveOffer';
import { UserMission } from '../models/UserMission';
import { PriveMission } from '../models/PriveMission';
import PriveInviteCode from '../models/PriveInviteCode';
import { UserReputation } from '../models/UserReputation';
import { getCachedWalletConfig } from './walletCacheService';
import { logger } from '../config/logger';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  urgency: 'critical' | 'warning' | 'info';
  daysRemaining: number;
  deepLink?: string;
}

class PriveNotificationService {
  async getNotifications(userId: string, tier: string): Promise<{
    notifications: NotificationItem[];
    counts: { critical: number; warning: number; info: number };
  }> {
    const userObjectId = new Types.ObjectId(userId);

    // Get warning days from config (default 7)
    let warningDays = 7;
    try {
      const config = await getCachedWalletConfig();
      warningDays = config?.priveProgramConfig?.notificationConfig?.expiryWarningDays || 7;
    } catch (err) { logger.warn('[PriveNotification] Failed to load notification config', { error: (err as Error).message }); }

    const warningDate = new Date(Date.now() + warningDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Fetch all expiring items in parallel
    const [vouchers, offers, missions, inviteCodes, reputation] = await Promise.all([
      // Expiring vouchers
      PriveVoucher.find({
        userId: userObjectId,
        status: 'active',
        expiresAt: { $lte: warningDate, $gt: now },
      }).select('code type value expiresAt').lean().catch(() => []),

      // Expiring offers (filtered by user's tier so we don't show inaccessible offers)
      PriveOffer.find({
        isActive: true,
        expiresAt: { $lte: warningDate, $gt: now },
        $or: [
          { tierRequired: { $exists: false } },
          { tierRequired: 'none' },
          { tierRequired: tier },
          ...(tier === 'signature' ? [{ tierRequired: 'entry' }] : []),
          ...(tier === 'elite' ? [{ tierRequired: { $in: ['entry', 'signature'] } }] : []),
        ],
      }).select('title expiresAt').limit(10).lean().catch(() => []),

      // Active missions with approaching deadlines
      UserMission.find({
        userId: userObjectId,
        status: 'active',
      }).populate({
        path: 'missionId',
        select: 'title endDate',
        match: { endDate: { $lte: warningDate, $gt: now } },
      }).lean().catch(() => []),

      // Expiring invite codes
      PriveInviteCode.find({
        creatorId: userObjectId,
        isActive: true,
        expiresAt: { $lte: warningDate, $gt: now },
      }).select('code expiresAt').lean().catch(() => []),

      // Reputation trend (check for declining)
      UserReputation.findOne({ userId: userObjectId }).select('totalScore tier history').lean().catch(() => null),
    ]);

    const notifications: NotificationItem[] = [];

    // Voucher expiry notifications
    for (const v of (vouchers as any[])) {
      const days = Math.max(0, Math.ceil((new Date(v.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      notifications.push({
        id: `voucher_${v._id}`,
        type: 'voucher_expiry',
        title: `Voucher Expiring`,
        message: `Your ${v.type} voucher (${v.code}) expires in ${days} day${days !== 1 ? 's' : ''}`,
        urgency: days <= 1 ? 'critical' : days <= 3 ? 'warning' : 'info',
        daysRemaining: days,
        deepLink: '/prive/vouchers',
      });
    }

    // Offer expiry notifications
    for (const o of (offers as any[])) {
      const days = Math.max(0, Math.ceil((new Date(o.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      notifications.push({
        id: `offer_${o._id}`,
        type: 'offer_expiry',
        title: `Offer Ending Soon`,
        message: `"${o.title}" ends in ${days} day${days !== 1 ? 's' : ''}`,
        urgency: days <= 1 ? 'critical' : days <= 3 ? 'warning' : 'info',
        daysRemaining: days,
        deepLink: '/prive/prive-offers',
      });
    }

    // Mission deadline notifications
    for (const m of (missions as any[])) {
      if (!m.missionId) continue;
      const days = Math.max(0, Math.ceil((new Date(m.missionId.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      notifications.push({
        id: `mission_${m._id}`,
        type: 'mission_deadline',
        title: `Mission Deadline`,
        message: `"${m.missionId.title}" ends in ${days} day${days !== 1 ? 's' : ''}`,
        urgency: days <= 1 ? 'critical' : days <= 3 ? 'warning' : 'info',
        daysRemaining: days,
        deepLink: '/prive/missions',
      });
    }

    // Invite code expiry
    for (const ic of (inviteCodes as any[])) {
      const days = Math.max(0, Math.ceil((new Date(ic.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      notifications.push({
        id: `invite_${ic._id}`,
        type: 'invite_expiry',
        title: `Invite Code Expiring`,
        message: `Your invite code ${ic.code} expires in ${days} day${days !== 1 ? 's' : ''}`,
        urgency: days <= 2 ? 'warning' : 'info',
        daysRemaining: days,
        deepLink: '/prive/invite-dashboard',
      });
    }

    // Tier risk detection (declining reputation)
    if (reputation && reputation.history && reputation.history.length >= 2) {
      const recent = reputation.history.slice(-3);
      const declining = recent.length >= 2 && recent[recent.length - 1].totalScore < recent[0].totalScore - 5;
      if (declining) {
        notifications.push({
          id: 'tier_risk',
          type: 'tier_risk',
          title: 'Reputation Declining',
          message: 'Your reputation score is trending down. Take action to maintain your tier.',
          urgency: 'warning',
          daysRemaining: 30,
          deepLink: '/prive/next-actions',
        });
      }
    }

    // Sort by urgency then days remaining
    const urgencyOrder = { critical: 0, warning: 1, info: 2 };
    notifications.sort((a, b) => {
      const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgDiff !== 0) return urgDiff;
      return a.daysRemaining - b.daysRemaining;
    });

    const counts = {
      critical: notifications.filter(n => n.urgency === 'critical').length,
      warning: notifications.filter(n => n.urgency === 'warning').length,
      info: notifications.filter(n => n.urgency === 'info').length,
    };

    return { notifications, counts };
  }
}

export const priveNotificationService = new PriveNotificationService();
export default priveNotificationService;
