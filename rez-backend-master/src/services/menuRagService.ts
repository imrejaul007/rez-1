/**
 * Menu RAG Service
 * Builds a plain-text context string from a store's menu for use as RAG context
 * in the Claude system prompt. Results are cached in Redis for 1 hour.
 */

import { logger } from '../config/logger';
import redisService from './redisService';
import { Store } from '../models/Store';
import Menu, { IMenu } from '../models/Menu';
import type { Lean } from '../types/lean';

const RAG_CACHE_PREFIX = 'rag:store:';
const RAG_CACHE_TTL_SECONDS = 3600; // 1 hour

export class MenuRagService {
  /**
   * Build a human-readable context string for a store's menu.
   * Checks Redis cache first; falls back to MongoDB on miss.
   */
  async buildContext(storeSlug: string): Promise<string> {
    const cacheKey = `${RAG_CACHE_PREFIX}${storeSlug}`;

    // 1. Check cache
    try {
      const cached = await redisService.get<string>(cacheKey);
      if (cached) {
        logger.debug(`[MenuRagService] Cache HIT for store=${storeSlug}`);
        return cached;
      }
    } catch (err) {
      logger.warn('[MenuRagService] Redis cache read failed, proceeding without cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.debug(`[MenuRagService] Cache MISS for store=${storeSlug}, fetching from DB`);

    // 2. Fetch store document for name and type
    const store = await Store.findOne({ slug: storeSlug }).select('name storeType slug description').lean().exec();

    if (!store) {
      logger.warn(`[MenuRagService] Store not found for slug=${storeSlug}`);
      return 'Store information unavailable.';
    }

    // 3. Fetch active menu for this store
    const menu = await Menu.findOne({ storeId: store._id, isActive: true }).lean().exec();

    const storeName = store.name ?? storeSlug;
    const storeType = store.storeType ?? 'restaurant';

    // 4. Format context as plain text
    const context = formatMenuContext(storeName, storeType, menu);

    // 5. Cache result
    try {
      await redisService.set(cacheKey, context, RAG_CACHE_TTL_SECONDS);
    } catch (err) {
      logger.warn('[MenuRagService] Redis cache write failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return context;
  }

  /**
   * Invalidate the cached RAG context for a store.
   * Call this when a store updates its menu.
   */
  async invalidateCache(storeSlug: string): Promise<void> {
    const cacheKey = `${RAG_CACHE_PREFIX}${storeSlug}`;
    try {
      await redisService.del(cacheKey);
      logger.debug(`[MenuRagService] Cache invalidated for store=${storeSlug}`);
    } catch (err) {
      logger.warn('[MenuRagService] Cache invalidation failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Format a store's menu into a plain-text string for the RAG prompt.
 */
function formatMenuContext(storeName: string, storeType: string, menu: Lean<IMenu> | null): string {
  const lines: string[] = [];

  lines.push(`Store: ${storeName}`);
  lines.push(`Type: ${storeType}`);

  if (!menu || !menu.categories || menu.categories.length === 0) {
    lines.push('Menu: No menu available.');
    return lines.join('. ') + '.';
  }

  lines.push('Menu:');

  for (const category of menu.categories) {
    const categoryName = category.name ?? 'Unnamed Category';
    const categoryDesc = category.description ? ` — ${category.description}` : '';

    lines.push(`  [${categoryName}]${categoryDesc}`);

    if (!category.items || category.items.length === 0) {
      lines.push('    No items available.');
      continue;
    }

    for (const item of category.items) {
      const name = item.name ?? 'Unknown Item';
      const price = typeof item.price === 'number' ? `₹${item.price}` : 'Price unavailable';
      const desc = item.description ? ` — ${item.description}` : '';
      const spicy = item.spicyLevel ? ` 🌶️${'🔥'.repeat(item.spicyLevel)}` : '';
      const vegLabel = item.dietaryInfo?.isVegetarian ? ' (Veg)' : item.dietaryInfo?.isVegan ? ' (Vegan)' : '';

      lines.push(`    - ${name}${vegLabel}${spicy} ${price}${desc}`);
    }
  }

  return lines.join('\n');
}

// Singleton instance
let serviceInstance: MenuRagService | null = null;

export function getMenuRagService(): MenuRagService {
  if (!serviceInstance) {
    serviceInstance = new MenuRagService();
  }
  return serviceInstance;
}

export default getMenuRagService;
