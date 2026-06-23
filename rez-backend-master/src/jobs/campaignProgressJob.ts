import { DiscoveryCampaign } from '../models/DiscoveryCampaign';
import { logger } from '../config/logger';

/**
 * Background job to handle campaign ending and cleanup
 * Cron: 0 20 * * * (8pm daily)
 * 1. Find campaigns ending today and mark them as inactive
 * 2. Send push notifications to participants
 */
export async function campaignProgressJob(): Promise<void> {
  try {
    logger.info('[CAMPAIGN PROGRESS JOB] Starting campaign progress check');

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

    // Find campaigns ending today
    const endingCampaigns = await DiscoveryCampaign.find({
      isActive: true,
      endsAt: { $gte: now, $lt: endOfToday },
    }).lean();

    if (endingCampaigns.length === 0) {
      logger.info('[CAMPAIGN PROGRESS JOB] No campaigns ending today');
      return;
    }

    logger.info('[CAMPAIGN PROGRESS JOB] Found campaigns ending today', {
      count: endingCampaigns.length,
      titles: endingCampaigns.map((c) => c.title),
    });

    // Mark them as inactive
    const campaignIds = endingCampaigns.map((c) => c._id);
    const updateResult = await DiscoveryCampaign.updateMany(
      { _id: { $in: campaignIds }, isActive: true },
      { isActive: false, updatedAt: new Date() },
    );

    logger.info('[CAMPAIGN PROGRESS JOB] Campaigns marked as inactive', {
      markedInactive: updateResult.modifiedCount,
    });

    // TODO: Send push notifications to campaign participants
    // This would integrate with a notification service
    // for (const campaign of endingCampaigns) {
    //   await notificationService.sendCampaignEndingNotification(campaign);
    // }

    logger.info('[CAMPAIGN PROGRESS JOB] Campaign progress check completed');
  } catch (error: any) {
    logger.error('[CAMPAIGN PROGRESS JOB] Error during campaign progress check: ' + error.message);
    // Don't throw - let the cron job continue
  }
}

export default campaignProgressJob;
