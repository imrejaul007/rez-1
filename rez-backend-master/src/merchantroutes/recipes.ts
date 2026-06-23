/**
 * merchantroutes/recipes.ts
 * Recipe and ingredient management routes for merchants
 */

import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { Ingredient } from '../models/Ingredient';
import { Recipe } from '../models/Recipe';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * GET /merchant/ingredients
 * List ingredients with optional filters
 */
router.get('/ingredients', async (req: Request, res: Response) => {
  try {
    const { storeId, category, isActive } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const filter: any = { storeId };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const ingredients = await Ingredient.find(filter).sort({ name: 1 });

    return res.json({
      success: true,
      data: ingredients,
      count: ingredients.length,
    });
  } catch (error) {
    logger.error('Error fetching ingredients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ingredients',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/ingredients
 * Create a new ingredient
 */
router.post('/ingredients', async (req: Request, res: Response) => {
  try {
    const { storeId, name, category, unit, costPerUnit } = req.body;

    if (!storeId || !name || !unit || costPerUnit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'storeId, name, unit, and costPerUnit are required',
      });
    }

    const ingredient = new Ingredient({
      storeId,
      name,
      category: category || 'other',
      unit,
      costPerUnit,
      currentStock: 0,
      isActive: true,
    });

    await ingredient.save();

    return res.status(201).json({
      success: true,
      data: ingredient,
      message: 'Ingredient created successfully',
    });
  } catch (error) {
    logger.error('Error creating ingredient:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create ingredient',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /merchant/ingredients/:id
 * Update an ingredient (cost, stock, or other fields)
 */
router.patch('/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate allowed updates
    const allowedFields = ['costPerUnit', 'currentStock', 'unit', 'category', 'name'];
    const validUpdates = Object.keys(updates).filter((key) => allowedFields.includes(key));

    if (validUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Allowed fields for update: ${allowedFields.join(', ')}`,
      });
    }

    const ingredient = await Ingredient.findByIdAndUpdate(
      id,
      { $set: Object.fromEntries(validUpdates.map((key) => [key, updates[key]])) },
      { new: true, runValidators: true },
    );

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found',
      });
    }

    return res.json({
      success: true,
      data: ingredient,
      message: 'Ingredient updated successfully',
    });
  } catch (error) {
    logger.error('Error updating ingredient:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update ingredient',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /merchant/ingredients/:id
 * Soft delete an ingredient (set isActive to false)
 */
router.delete('/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ingredient = await Ingredient.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found',
      });
    }

    return res.json({
      success: true,
      message: 'Ingredient deleted successfully',
      data: ingredient,
    });
  } catch (error) {
    logger.error('Error deleting ingredient:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete ingredient',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/recipes
 * List recipes for a store
 */
router.get('/recipes', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const recipes = await Recipe.find({ storeId }).populate('ingredients.ingredientId').sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: recipes,
      count: recipes.length,
    });
  } catch (error) {
    logger.error('Error fetching recipes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/recipes
 * Create a new recipe with ingredients array
 */
router.post('/recipes', async (req: Request, res: Response) => {
  try {
    const { storeId, name, sellingPrice, ingredients } = req.body;

    if (!storeId || !name || !sellingPrice || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'storeId, name, sellingPrice, and ingredients array are required',
      });
    }

    // Calculate food cost
    let totalFoodCost = 0;
    for (const ing of ingredients) {
      const ingredient = await Ingredient.findById(ing.ingredientId);
      if (!ingredient) {
        return res.status(400).json({
          success: false,
          message: `Ingredient not found: ${ing.ingredientId}`,
        });
      }
      totalFoodCost += ingredient.currentCost * ing.quantity;
    }

    const foodCostPct = (totalFoodCost / sellingPrice) * 100;
    const grossMargin = ((sellingPrice - totalFoodCost) / sellingPrice) * 100;

    const recipe = new Recipe({
      storeId,
      productName: name,
      sellingPrice,
      ingredients,
      totalCost: totalFoodCost,
      foodCostPct: Math.round(foodCostPct * 10) / 10,
      grossMargin: Math.round(grossMargin * 10) / 10,
    });

    await recipe.save();
    await recipe.populate('ingredients.ingredientId');

    return res.status(201).json({
      success: true,
      data: recipe,
      message: 'Recipe created successfully',
    });
  } catch (error) {
    logger.error('Error creating recipe:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /merchant/recipes/:id
 * Update a recipe
 */
router.patch('/recipes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sellingPrice, ingredients } = req.body;

    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    if (name) (recipe as any).productName = name;

    if (ingredients && Array.isArray(ingredients)) {
      recipe.ingredients = ingredients;

      // Recalculate food cost
      let totalFoodCost = 0;
      for (const ing of ingredients) {
        const ingredient = await Ingredient.findById(ing.ingredientId);
        if (!ingredient) {
          return res.status(400).json({
            success: false,
            message: `Ingredient not found: ${ing.ingredientId}`,
          });
        }
        totalFoodCost += ingredient.currentCost * ing.quantity;
      }

      recipe.totalCost = totalFoodCost;
    }

    if (sellingPrice !== undefined) {
      recipe.sellingPrice = sellingPrice;
    }

    // Recalculate percentages
    const foodCostPct = (recipe.totalCost / recipe.sellingPrice) * 100;
    const grossMargin = ((recipe.sellingPrice - recipe.totalCost) / recipe.sellingPrice) * 100;
    recipe.foodCostPct = Math.round(foodCostPct * 10) / 10;
    recipe.grossMargin = Math.round(grossMargin * 10) / 10;

    await recipe.save();
    await recipe.populate('ingredients.ingredientId');

    return res.json({
      success: true,
      data: recipe,
      message: 'Recipe updated successfully',
    });
  } catch (error) {
    logger.error('Error updating recipe:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/analytics/food-cost
 * Get food cost analytics for store
 */
router.get('/analytics/food-cost', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const recipes = await Recipe.find({ storeId });

    if (recipes.length === 0) {
      return res.json({
        success: true,
        data: {
          avgFoodCostPct: 0,
          totalRecipes: 0,
          highCostCount: 0,
          staleCostCount: 0,
        },
      });
    }

    const totalFoodCostPct = recipes.reduce((sum, r) => sum + r.foodCostPct, 0);
    const avgFoodCostPct = Math.round((totalFoodCostPct / recipes.length) * 10) / 10;
    const highCostCount = recipes.filter((r) => r.foodCostPct > 40).length;
    const staleCostCount = recipes.filter((r) => {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(r.updatedAt || r.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysSinceUpdate > 90;
    }).length;

    return res.json({
      success: true,
      data: {
        avgFoodCostPct,
        totalRecipes: recipes.length,
        highCostCount,
        staleCostCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching food cost analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch food cost analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/analytics/food-cost/by-product
 * Get recipes sorted by food cost percentage with color signals
 */
router.get('/analytics/food-cost/by-product', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const recipes = await Recipe.find({ storeId }).populate('ingredients.ingredientId').sort({ foodCostPct: -1 });

    const data = recipes.map((recipe) => ({
      id: recipe._id,
      productName: recipe.productName,
      foodCostPct: recipe.foodCostPct,
      grossMargin: recipe.grossMargin,
      sellingPrice: recipe.sellingPrice,
      totalFoodCost: recipe.totalCost,
      signal: recipe.foodCostPct < 30 ? 'green' : recipe.foodCostPct < 40 ? 'amber' : 'red',
    }));

    return res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    logger.error('Error fetching food cost by product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch food cost analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
