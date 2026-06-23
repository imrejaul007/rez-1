import { logger } from '../config/logger';
// Menu Controller - Handle menu operations
import { Request, Response } from 'express';
import Menu, { IMenuItem, IMenuCategory } from '../models/Menu';
import PreOrder from '../models/PreOrder';
import { Store } from '../models/Store';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get store menu by store ID
 * GET /api/menu/store/:storeId
 */
export const getStoreMenu = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendError(res, 'Store not found', 404);
    }

    // Get menu
    const menu = await Menu.findByStoreId(storeId);

    if (!menu) {
      return sendSuccess(res, {
        storeId,
        storeName: store.name,
        categories: [],
        isActive: false,
        lastUpdated: new Date().toISOString(),
      }, 'No menu available for this store');
    }

    // Transform response
    const response = {
      storeId: menu.storeId,
      storeName: store.name,
      categories: menu.categories.map((cat: IMenuCategory) => ({
        _id: cat._id,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        items: cat.items.map((item: IMenuItem) => ({
          _id: item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          category: item.category,
          isAvailable: item.isAvailable,
          preparationTime: item.preparationTime,
          nutritionalInfo: item.nutritionalInfo,
          dietaryInfo: item.dietaryInfo,
          spicyLevel: item.spicyLevel,
          allergens: item.allergens,
          tags: item.tags,
        })),
      })),
      isActive: menu.isActive,
      lastUpdated: menu.updatedAt,
    };

    sendSuccess(res, response, 'Menu retrieved successfully');
});

/**
 * Create or update store menu
 * POST /api/menu/store/:storeId
 */
export const createOrUpdateMenu = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { categories } = req.body;

    // Validate request
    if (!categories || !Array.isArray(categories)) {
      return sendError(res, 'Categories array is required', 400);
    }

    // Check if store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendError(res, 'Store not found', 404);
    }

    // Find existing menu or create new
    let menu = await Menu.findOne({ storeId });

    if (menu) {
      // Update existing menu
      menu.categories = categories;
      menu.isActive = true;
      await menu.save();
    } else {
      // Create new menu
      menu = new Menu({
        storeId,
        categories,
        isActive: true,
      });
      await menu.save();

      // Update store to indicate it has a menu
      await Store.findByIdAndUpdate(storeId, {
        hasMenu: true,
        menuCategories: categories.map((cat: IMenuCategory) => cat.name),
      });
    }

    sendSuccess(res, menu, 'Menu saved successfully', 201);
});

/**
 * Add menu item to category
 * POST /api/menu/items
 */
export const addMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { storeId, categoryId, item } = req.body;

    // Validate request
    if (!storeId || !categoryId || !item) {
      return sendError(res, 'Store ID, category ID, and item data are required', 400);
    }

    // Get menu
    const menu = await Menu.findOne({ storeId }).lean();
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    // Add item to category
    await menu.addMenuItem(categoryId, item);

    sendSuccess(res, menu, 'Menu item added successfully', 201);
});

/**
 * Update menu item
 * PUT /api/menu/items/:itemId
 */
export const updateMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { storeId, categoryId, ...updateData } = req.body;

    // Validate request
    if (!storeId || !categoryId) {
      return sendError(res, 'Store ID and category ID are required', 400);
    }

    // Get menu
    const menu = await Menu.findOne({ storeId }).lean();
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    // Update item
    await menu.updateMenuItem(categoryId, itemId, updateData);

    sendSuccess(res, menu, 'Menu item updated successfully');
});

/**
 * Delete menu item
 * DELETE /api/menu/items/:itemId
 */
export const deleteMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { storeId, categoryId } = req.body;

    // Validate request
    if (!storeId || !categoryId) {
      return sendError(res, 'Store ID and category ID are required', 400);
    }

    // Get menu
    const menu = await Menu.findOne({ storeId }).lean();
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    // Delete item
    await menu.deleteMenuItem(categoryId, itemId);

    sendSuccess(res, { deleted: true }, 'Menu item deleted successfully');
});

/**
 * Get menu item by ID
 * GET /api/menu/items/:itemId
 */
export const getMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { storeId, categoryId } = req.query;

    if (!storeId || !categoryId) {
      return sendError(res, 'Store ID and category ID are required', 400);
    }

    const menu = await Menu.findOne({ storeId }).lean();
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    const item = menu.getMenuItem(categoryId as string, itemId);
    if (!item) {
      return sendError(res, 'Menu item not found', 404);
    }

    sendSuccess(res, item, 'Menu item retrieved successfully');
});

/**
 * Create pre-order
 * POST /api/menu/pre-orders
 */
export const createPreOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const {
      storeId,
      items,
      scheduledTime,
      deliveryType,
      tableNumber,
      deliveryAddress,
      contactPhone,
      notes,
    } = req.body;

    // Validate request
    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Store ID and items are required', 400);
    }

    if (!deliveryType || !['pickup', 'delivery', 'dine_in'].includes(deliveryType)) {
      return sendError(res, 'Valid delivery type (pickup/delivery/dine_in) is required', 400);
    }

    if (deliveryType === 'dine_in' && !tableNumber) {
      return sendError(res, 'Table number is required for dine-in orders', 400);
    }

    // For dine-in, contactPhone is optional (we have the authenticated user)
    if (!contactPhone && deliveryType !== 'dine_in') {
      return sendError(res, 'Contact phone is required', 400);
    }

    // Get menu to validate items and prices
    const menu = await Menu.findByStoreId(storeId);
    if (!menu) {
      return sendError(res, 'Menu not found for this store', 404);
    }

    // Validate and price items
    const orderItems = [];
    for (const requestItem of items) {
      let found = false;
      for (const category of menu.categories) {
        const menuItem = category.items.find((item: any) => item._id?.toString() === requestItem.menuItemId);
        if (menuItem) {
          if (!menuItem.isAvailable) {
            return sendError(res, `Item "${menuItem.name}" is not available`, 400);
          }

          orderItems.push({
            menuItemId: menuItem._id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: requestItem.quantity,
            specialInstructions: requestItem.specialInstructions,
          });

          found = true;
          break;
        }
      }

      if (!found) {
        return sendError(res, `Menu item not found: ${requestItem.menuItemId}`, 404);
      }
    }

    // Create pre-order
    const preOrder = new PreOrder({
      storeId,
      userId,
      items: orderItems,
      scheduledTime,
      deliveryType,
      ...(tableNumber && { tableNumber }),
      deliveryAddress,
      contactPhone,
      notes,
    });

    // Calculate totals
    preOrder.calculateTotals();

    await preOrder.save();

    // Populate store details
    await preOrder.populate('storeId', 'name logo location');

    sendSuccess(res, preOrder, 'Pre-order created successfully', 201);
});

/**
 * Get user's pre-orders
 * GET /api/menu/pre-orders/user
 */
export const getUserPreOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const preOrders = await PreOrder.findUserOrders(userId, limit);

    sendSuccess(res, preOrders, 'Pre-orders retrieved successfully');
});

/**
 * Get pre-order by ID
 * GET /api/menu/pre-orders/:preOrderId
 */
export const getPreOrder = asyncHandler(async (req: Request, res: Response) => {
    const { preOrderId } = req.params;
    const userId = req.userId;

    const preOrder = await PreOrder.findById(preOrderId)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName profile.avatar').lean();

    if (!preOrder) {
      return sendError(res, 'Pre-order not found', 404);
    }

    // Check authorization
    if (userId && preOrder.userId._id.toString() !== userId) {
      return sendError(res, 'Unauthorized to view this pre-order', 403);
    }

    sendSuccess(res, preOrder, 'Pre-order retrieved successfully');
});

/**
 * Cancel pre-order
 * PUT /api/menu/pre-orders/:preOrderId/cancel
 */
export const cancelPreOrder = asyncHandler(async (req: Request, res: Response) => {
    const { preOrderId } = req.params;
    const userId = req.userId;

    const preOrder = await PreOrder.findById(preOrderId).lean();
    if (!preOrder) {
      return sendError(res, 'Pre-order not found', 404);
    }

    // Check authorization
    if (userId && preOrder.userId.toString() !== userId) {
      return sendError(res, 'Unauthorized to cancel this pre-order', 403);
    }

    // Update status to cancelled
    await preOrder.updateStatus('cancelled');

    sendSuccess(res, preOrder, 'Pre-order cancelled successfully');
});

/**
 * Search menu items
 * GET /api/menu/search
 */
export const searchMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const { query, storeId } = req.query;

    if (!query) {
      return sendError(res, 'Search query is required', 400);
    }

    const searchQuery: any = {
      isActive: true,
      $text: { $search: query as string },
    };

    if (storeId) {
      searchQuery.storeId = storeId;
    }

    const menus = await Menu.find(searchQuery).lean();

    // Extract matching items from all menus
    const results: any[] = [];
    for (const menu of menus) {
      for (const category of menu.categories) {
        for (const item of category.items) {
          if (
            item.name.toLowerCase().includes((query as string).toLowerCase()) ||
            item.description?.toLowerCase().includes((query as string).toLowerCase()) ||
            item.tags?.some(tag => tag.toLowerCase().includes((query as string).toLowerCase()))
          ) {
            results.push({
              _id: item._id,
              name: item.name,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              image: item.image,
              category: item.category,
              isAvailable: item.isAvailable,
              preparationTime: item.preparationTime,
              nutritionalInfo: item.nutritionalInfo,
              dietaryInfo: item.dietaryInfo,
              spicyLevel: item.spicyLevel,
              allergens: item.allergens,
              tags: item.tags,
              storeId: menu.storeId,
              categoryName: category.name,
            });
          }
        }
      }
    }

    sendSuccess(res, results, `Found ${results.length} menu items`);
});
