import { Request, Response } from 'express';
import sponsorService from '../services/sponsorService';
import { SponsorAllocation } from '../models/SponsorAllocation';
import { asyncHandler } from '../utils/asyncHandler';

class SponsorController {
  // GET /api/sponsors
  getSponsors = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { page, limit, isActive, industry, search } = req.query;

      const filters = {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        industry: industry as string | undefined,
        search: search as string | undefined
      };

      const pagination = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      const result = await sponsorService.getSponsors(filters, pagination);

      res.json({
        success: true,
        data: result.sponsors,
        pagination: {
          page: result.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/sponsors
  createSponsor = asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        name,
        logo,
        description,
        brandCoinName,
        brandCoinLogo,
        contactPerson,
        website,
        industry
      } = req.body;

      if (!name || !logo || !brandCoinName || !contactPerson?.name || !contactPerson?.email) {
        return res.status(400).json({
          success: false,
          message: 'name, logo, brandCoinName, and contactPerson (name, email) are required'
        });
      }

      const sponsor = await sponsorService.createSponsor({
        name,
        logo,
        description,
        brandCoinName,
        brandCoinLogo,
        contactPerson,
        website,
        industry
      });

      res.status(201).json({
        success: true,
        data: sponsor,
        message: 'Sponsor created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/sponsors/:id
  getSponsorById = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const sponsor = await sponsorService.getSponsorById(id);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        data: sponsor
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // PUT /api/sponsors/:id
  updateSponsor = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const sponsor = await sponsorService.updateSponsor(id, updateData);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        data: sponsor,
        message: 'Sponsor updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // DELETE /api/sponsors/:id (soft delete)
  deactivateSponsor = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const sponsor = await sponsorService.deactivateSponsor(id);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        message: 'Sponsor deactivated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/sponsors/:id/activate
  activateSponsor = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const sponsor = await sponsorService.activateSponsor(id);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        message: 'Sponsor activated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/sponsors/:id/events
  getSponsorEvents = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const events = await sponsorService.getSponsorEvents(id);

      res.json({
        success: true,
        data: events
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/sponsors/:id/analytics
  getSponsorAnalytics = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const analytics = await sponsorService.getSponsorAnalytics(id);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      if (error.message === 'Sponsor not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/sponsors/:id/fund - Fund sponsor budget
  fundSponsor = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'amount must be a positive number'
        });
      }

      const entry = await SponsorAllocation.recordFund(
        id,
        amount,
        adminId,
        description || `Budget funding of ${amount} coins`
      );

      res.json({
        success: true,
        message: `Successfully funded ${amount} branded coins`,
        data: entry
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/sponsors/:id/budget - Get budget summary
  getSponsorBudget = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const balance = await SponsorAllocation.getSponsorBalance(id);

      // Get total funded and disbursed
      const fundEntries = await SponsorAllocation.aggregate([
        { $match: { sponsor: new (require('mongoose').Types.ObjectId)(id) } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]);

      const totals: any = {};
      fundEntries.forEach((entry: any) => {
        totals[entry._id] = entry.total;
      });

      res.json({
        success: true,
        data: {
          currentBalance: balance,
          totalFunded: totals.fund || 0,
          totalAllocated: totals.allocate || 0,
          totalDisbursed: totals.disburse || 0,
          totalRefunded: totals.refund || 0
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/sponsors/:id/allocate - Allocate budget to event
  allocateBudget = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;
      const { programId, amount } = req.body;

      if (!programId || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'programId and a positive amount are required'
        });
      }

      const entry = await SponsorAllocation.recordAllocate(id, programId, amount, adminId);

      res.json({
        success: true,
        message: `Allocated ${amount} branded coins to event`,
        data: entry
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/sponsors/:id/ledger - Get allocation ledger
  getSponsorLedger = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page = '1', limit = '20', type } = req.query;

      const query: any = { sponsor: id };
      if (type) {
        query.type = type;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const [entries, total] = await Promise.all([
        SponsorAllocation.find(query)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .populate('program', 'name eventType')
          .lean(),
        SponsorAllocation.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
}

export default new SponsorController();
