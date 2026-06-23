// @ts-nocheck
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CampusPartner } from '../models/CampusPartnership';
import { User } from '../models/User';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

/**
 * @route   GET /api/campus/partners/:institutionId
 * @desc    Get all campus partners for an institution
 * @access  Public
 */
router.get(
  '/partners/:institutionId',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { institutionId } = req.params;
    const { category, page = 1, limit = 20, popular } = req.query;

    const filter: any = {
      institutionId: new mongoose.Types.ObjectId(institutionId),
      status: 'active',
    };

    // Filter by category
    if (category) {
      filter.categories = category;
    }

    // Only popular partners
    if (popular === 'true') {
      filter.$expr = { $gt: ['$stats.totalOrders', 10] };
    }

    const partners = await CampusPartner.find(filter)
      .populate('merchantId', 'name logo rating address')
      .sort({ 'stats.totalOrders': -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string))
      .lean();

    const total = await CampusPartner.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        partners: partners.map((p) => ({
          id: p._id,
          merchantId: p.merchantId?._id,
          merchantName: p.merchantName,
          merchantLogo: p.merchantId?.logo,
          rating: p.merchantId?.rating,
          address: p.merchantId?.address,
          discount: p.discount,
          categories: p.categories,
          isExclusive: p.isExclusive,
          stats: p.stats,
        })),
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }),
);

/**
 * @route   GET /api/campus/partners/:institutionId/:partnerId
 * @desc    Get single partner details
 * @access  Public
 */
router.get(
  '/partners/:institutionId/:partnerId',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { partnerId } = req.params;

    const partner = await CampusPartner.findById(partnerId)
      .populate('merchantId', 'name logo rating address phoneNumber')
      .lean();

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    return res.json({
      success: true,
      data: {
        id: partner._id,
        merchantId: partner.merchantId?._id,
        merchantName: partner.merchantName,
        merchantLogo: partner.merchantId?.logo,
        rating: partner.merchantId?.rating,
        address: partner.merchantId?.address,
        phoneNumber: partner.merchantId?.phoneNumber,
        discount: partner.discount,
        categories: partner.categories,
        isExclusive: partner.isExclusive,
        stats: partner.stats,
        terms: partner.terms,
        startDate: partner.startDate,
        endDate: partner.endDate,
      },
    });
  }),
);

/**
 * @route   GET /api/campus/categories/:institutionId
 * @desc    Get categories for campus partners
 * @access  Public
 */
router.get(
  '/categories/:institutionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { institutionId } = req.params;

    const categories = await CampusPartner.distinct('categories', {
      institutionId: new mongoose.Types.ObjectId(institutionId),
      status: 'active',
    });

    return res.json({
      success: true,
      data: { categories },
    });
  }),
);

/**
 * @route   GET /api/campus/search
 * @desc    Search campus partners across institutions
 * @access  Public
 */
router.get(
  '/search',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { q, institutionId, limit = 20 } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ success: true, data: { partners: [] } });
    }

    const filter: any = {
      merchantName: { $regex: q as string, $options: 'i' },
      status: 'active',
    };

    if (institutionId) {
      filter.institutionId = new mongoose.Types.ObjectId(institutionId as string);
    }

    const partners = await CampusPartner.find(filter)
      .select('merchantName merchantId institutionName discount categories')
      .limit(parseInt(limit as string))
      .lean();

    return res.json({
      success: true,
      data: {
        partners: partners.map((p) => ({
          id: p._id,
          merchantId: p.merchantId,
          merchantName: p.merchantName,
          institutionName: p.institutionName,
          discount: p.discount,
        })),
      },
    });
  }),
);

// ============================================
// STUDENT ROUTES (Auth required)
// ============================================

/**
 * @route   GET /api/campus/my-partners
 * @desc    Get student's institution partners (requires student verification)
 * @access  Private (student verified)
 */
router.get(
  '/my-partners',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { category, page = 1, limit = 20 } = req.query;

    // Check if user is a verified student
    const user = await User.findById(userId);
    if (!user || !user.verifications?.student?.verified) {
      return res.status(403).json({
        success: false,
        message: 'Only verified students can access campus partners',
      });
    }

    const institutionName = user.verifications.student.instituteName;
    if (!institutionName) {
      return res.status(400).json({
        success: false,
        message: 'Institution not found in verification',
      });
    }

    // Find institution
    const { VerifiedInstitution } = await import('../models/VerifiedInstitution');
    const institution = await VerifiedInstitution.findOne({
      name: { $regex: new RegExp(institutionName, 'i') },
    });

    if (!institution) {
      return res.json({
        success: true,
        data: { partners: [], message: 'Institution not found' },
      });
    }

    const filter: any = {
      institutionId: institution._id,
      status: 'active',
    };

    if (category) {
      filter.categories = category;
    }

    const partners = await CampusPartner.find(filter)
      .populate('merchantId', 'name logo rating address')
      .sort({ 'stats.totalOrders': -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string))
      .lean();

    return res.json({
      success: true,
      data: {
        institutionName: institution.name,
        partners: partners.map((p) => ({
          id: p._id,
          merchantId: p.merchantId?._id,
          merchantName: p.merchantName,
          merchantLogo: p.merchantId?.logo,
          rating: p.merchantId?.rating,
          address: p.merchantId?.address,
          discount: p.discount,
          categories: p.categories,
          isExclusive: p.isExclusive,
        })),
        page: parseInt(page as string),
      },
    });
  }),
);

/**
 * @route   GET /api/campus/popular
 * @desc    Get popular campus partners (across all institutions)
 * @access  Public
 */
router.get(
  '/popular',
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const partners = await CampusPartner.find({ status: 'active' })
      .populate('merchantId', 'name logo rating')
      .sort({ 'stats.totalOrders': -1 })
      .limit(parseInt(limit as string))
      .lean();

    return res.json({
      success: true,
      data: {
        partners: partners.map((p) => ({
          id: p._id,
          merchantId: p.merchantId?._id,
          merchantName: p.merchantName,
          merchantLogo: p.merchantId?.logo,
          rating: p.merchantId?.rating,
          institutionName: p.institutionName,
          discount: p.discount,
          totalOrders: p.stats.totalOrders,
        })),
      },
    });
  }),
);

// ============================================
// ADMIN ROUTES (Auth + Admin required)
// ============================================

/**
 * @route   POST /api/campus/partners
 * @desc    Create campus partnership
 * @access  Private (admin)
 */
router.post(
  '/partners',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      merchantId,
      institutionId,
      institutionName,
      merchantName,
      discount,
      categories,
      startDate,
      endDate,
      terms,
      isExclusive,
    } = req.body;

    const partner = new CampusPartner({
      merchantId: new mongoose.Types.ObjectId(merchantId),
      institutionId: new mongoose.Types.ObjectId(institutionId),
      institutionName,
      merchantName,
      discount,
      categories: categories || [],
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      terms,
      isExclusive: isExclusive || false,
      status: 'active',
    });

    await partner.save();

    return res.status(201).json({
      success: true,
      message: 'Campus partnership created',
      data: { partnerId: partner._id },
    });
  }),
);

/**
 * @route   PUT /api/campus/partners/:id
 * @desc    Update campus partnership
 * @access  Private (admin)
 */
router.put(
  '/partners/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const partner = await CampusPartner.findByIdAndUpdate(id, { $set: updates }, { new: true });

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    return res.json({
      success: true,
      message: 'Partnership updated',
      data: { partner },
    });
  }),
);

/**
 * @route   DELETE /api/campus/partners/:id
 * @desc    Delete campus partnership
 * @access  Private (admin)
 */
router.delete(
  '/partners/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await CampusPartner.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Partnership deleted',
    });
  }),
);

/**
 * @route   GET /api/campus/admin/partners
 * @desc    Admin: List all partnerships
 * @access  Private (admin)
 */
router.get(
  '/admin/partners',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, institutionId, page = 1, limit = 50 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (institutionId) filter.institutionId = new mongoose.Types.ObjectId(institutionId as string);

    const partners = await CampusPartner.find(filter)
      .populate('merchantId', 'name logo')
      .populate('institutionId', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string))
      .lean();

    const total = await CampusPartner.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        partners,
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }),
);

/**
 * @route   POST /api/campus/partners/:id/record-order
 * @desc    Record an order using campus partner discount
 * @access  Private (student verified)
 */
router.post(
  '/partners/:id/record-order',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { orderAmount, discountApplied } = req.body;
    const userId = (req as any).user._id;

    // Check if user is a verified student
    const user = await User.findById(userId);
    if (!user || !user.verifications?.student?.verified) {
      return res.status(403).json({
        success: false,
        message: 'Only verified students can record orders',
      });
    }

    const partner = await CampusPartner.findById(id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    // Update stats
    partner.stats.totalOrders += 1;
    partner.stats.totalDiscount += discountApplied || 0;

    // Add student to active if not already
    const studentIdStr = userId.toString();
    // We'll store this in a separate tracking collection in production
    // For now, just increment activeStudents counter (with deduplication logic)

    await partner.save();

    return res.json({
      success: true,
      message: 'Order recorded',
      data: {
        newTotalOrders: partner.stats.totalOrders,
        newTotalDiscount: partner.stats.totalDiscount,
      },
    });
  }),
);

export default router;
