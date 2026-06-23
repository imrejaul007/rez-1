import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { liabilityService } from '../../services/liabilityService';
import { InvoiceService } from '../../services/InvoiceService';
import { createServiceLogger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';

const logger = createServiceLogger('admin-merchant-liability');
const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/merchant-liability/:merchantId
 * View merchant liability records (paginated)
 */
router.get('/:merchantId', asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { cycleId, campaignId, status, page, limit } = req.query;

    const result = await liabilityService.getStatement(merchantId, {
      cycleId: cycleId as string,
      campaignId: campaignId as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    return res.json({ success: true, data: result });
  }));

/**
 * POST /api/admin/merchant-liability/:merchantId/settle
 * Admin triggers settlement for a specific cycle
 */
router.post('/:merchantId/settle', asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { cycleId, dryRun, autoDebit } = req.body;

    if (!cycleId) {
      return res.status(400).json({ success: false, message: 'cycleId is required' });
    }

    const result = await liabilityService.settleCycle(merchantId, cycleId, {
      dryRun: dryRun === true,
      autoDebit: autoDebit !== false, // default true
    });

    return res.json({ success: true, data: result });
  }));

/**
 * GET /api/admin/merchant-liability/:merchantId/statement/:cycleId
 * Download PDF liability statement
 */
router.get('/:merchantId/statement/:cycleId', asyncHandler(async (req: Request, res: Response) => {
    const { merchantId, cycleId } = req.params;

    const pdfBuffer = await InvoiceService.generateLiabilityStatement(merchantId, cycleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=liability-${merchantId}-${cycleId}.pdf`);
    return res.send(pdfBuffer);
  }));

export default router;
