import { Request, Response } from 'express';
import shareService from '../services/shareService';
import { asyncHandler } from '../utils/asyncHandler';

class ShareController {
  // GET /api/share/content
  getShareableContent = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const content = await shareService.getShareableContent(userId);

      res.json({
        success: true,
        data: content
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/share/track
  createShare = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { contentType, contentId, platform } = req.body;

      if (!contentType || !contentId || !platform) {
        return res.status(400).json({
          success: false,
          message: 'contentType, contentId, and platform are required'
        });
      }

      const share = await shareService.createShare(userId, contentType, contentId, platform);

      res.json({
        success: true,
        data: {
          shareUrl: share.shareUrl,
          trackingCode: share.trackingCode,
          expiresAt: share.expiresAt
        },
        message: 'Share link created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/share/click/:trackingCode (public endpoint)
  trackClick = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { trackingCode } = req.params;

      const result = await shareService.trackClick(trackingCode);

      if (!result.success) {
        return res.redirect(result.redirectUrl);
      }

      res.redirect(result.redirectUrl);
    } catch (error: any) {
      res.redirect('/');
    }
  });

  // POST /api/share/conversion (internal webhook)
  trackConversion = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { trackingCode } = req.body;

      if (!trackingCode) {
        return res.status(400).json({
          success: false,
          message: 'trackingCode is required'
        });
      }

      await shareService.trackConversion(trackingCode);

      res.json({
        success: true,
        message: 'Conversion tracked'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/share/history
  getShareHistory = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { contentType, limit = 20, offset = 0 } = req.query;

      const result = await shareService.getShareHistory(
        userId,
        contentType as string | undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: result.shares,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/share/stats
  getShareStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const stats = await shareService.getShareStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/share/daily-limits
  getDailyLimits = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const limits = await shareService.getDailySharesRemaining(userId);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/share/purchase - Share a purchase and earn 5% coins
  sharePurchase = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { orderId, platform } = req.body;

      if (!orderId || !platform) {
        return res.status(400).json({
          success: false,
          message: 'orderId and platform are required'
        });
      }

      const result = await shareService.sharePurchase(
        userId,
        orderId,
        platform
      );

      res.json({
        success: true,
        data: {
          shareUrl: result.share.shareUrl,
          trackingCode: result.share.trackingCode,
          coinsEarned: result.coinsEarned,
          expiresAt: result.share.expiresAt
        },
        message: `Purchase shared! You earned ${result.coinsEarned} coins (5% of order total)`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/share/can-share/:orderId - Check if an order can be shared
  canShareOrder = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'orderId is required'
        });
      }

      const result = await shareService.canShareOrder(userId, orderId);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
}

export default new ShareController();
