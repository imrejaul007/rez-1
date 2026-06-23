import { Request, Response } from 'express';
import {
  sendSuccess,
  sendBadRequest,
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import reorderService from '../services/reorderService';
import { logger } from '../config/logger';

// ─── reorderFullOrder ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/reorder:
 *   post:
 *     summary: Reorder all items from a previous order
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Reorder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Original order not found
 */
export const reorderFullOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId);

    sendSuccess(res, result, 'Items added to cart successfully');

  } catch (error: any) {
    logger.error('[REORDER] Full order reorder error:', error);
    throw error;
  }
});

// ─── reorderItems ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/reorder/items:
 *   post:
 *     summary: Reorder selected items from a previous order
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: Selected items reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (empty itemIds, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Original order not found
 */
export const reorderItems = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.body;
  const userId = req.userId!;

  try {
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return sendBadRequest(res, 'Item IDs are required');
    }

    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId, itemIds);

    sendSuccess(res, result, 'Selected items added to cart successfully');

  } catch (error: any) {
    logger.error('[REORDER] Selective reorder error:', error);
    throw error;
  }
});

// ─── validateReorder ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/reorder/validate:
 *   get:
 *     summary: Validate items for reorder (check availability and prices)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: itemIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Item IDs to validate (pass multiple via ?itemIds=id1&itemIds=id2)
 *     responses:
 *       200:
 *         description: Reorder validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const validateReorder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.query;
  const userId = req.userId!;

  try {
    let selectedItemIds: string[] | undefined;
    if (itemIds) {
      selectedItemIds = Array.isArray(itemIds) ? itemIds as string[] : [itemIds as string];
    }

    const validation = await reorderService.validateReorder(userId, orderId, selectedItemIds);

    sendSuccess(res, validation, 'Reorder validation complete');

  } catch (error: any) {
    logger.error('[REORDER] Validation error:', error);
    throw error;
  }
});

// ─── getFrequentlyOrdered ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/reorder/frequently-ordered:
 *   get:
 *     summary: Get frequently ordered items
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: List of frequently ordered items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getFrequentlyOrdered = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { limit = 10 } = req.query;

  try {
    const items = await reorderService.getFrequentlyOrdered(userId, Number(limit));

    sendSuccess(res, items, 'Frequently ordered items retrieved successfully');

  } catch (error: any) {
    logger.error('[REORDER] Frequently ordered error:', error);
    throw error;
  }
});

// ─── getReorderSuggestions ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/reorder/suggestions:
 *   get:
 *     summary: Personalized reorder suggestions
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personalized reorder suggestions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getReorderSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const suggestions = await reorderService.getReorderSuggestions(userId);

    sendSuccess(res, suggestions, 'Reorder suggestions retrieved successfully');

  } catch (error: any) {
    logger.error('[REORDER] Suggestions error:', error);
    throw error;
  }
});
