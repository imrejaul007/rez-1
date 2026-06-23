import { logger } from '../config/logger';
import { Store } from '../models/Store';
import { StoreAnalytics } from '../models/StoreAnalytics';
import { Favorite } from '../models/Favorite';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import mongoose from 'mongoose';

export interface RecommendationOptions {
  userId?: string;
  location?: {
    coordinates: [number, number];
    radius?: number;
  };
  limit?: number;
  excludeStores?: string[];
  category?: string;
  preferences?: {
    minRating?: number;
    maxDeliveryTime?: number;
    priceRange?: {
      min: number;
      max: number;
    };
    features?: string[];
  };
}

export interface StoreRecommendation {
  store: any;
  score: number;
  reasons: string[];
  confidence: number;
}

export interface ProductRecommendation {
  product: any;
  score: number;
  reasons: string[];
  confidence: number;
  similarity?: number;
}

export interface BundleRecommendation {
  products: any[];
  combinedPrice: number;
  savings: number;
  frequency: number;
}

class RecommendationService {
  /**
   * Get personalized store recommendations for a user
   */
  async getPersonalizedRecommendations(options: RecommendationOptions): Promise<StoreRecommendation[]> {
    const {
      userId,
      location,
      limit = 10,
      excludeStores = [],
      category,
      preferences = {}
    } = options;

    try {
      let recommendations: StoreRecommendation[] = [];

      if (userId) {
        // Get user-based recommendations
        const userRecommendations = await this.getUserBasedRecommendations(userId, {
          location,
          limit: Math.ceil(limit * 0.6), // 60% user-based
          excludeStores,
          category,
          preferences
        });
        recommendations.push(...userRecommendations);
      }

      // Get collaborative filtering recommendations
      const collaborativeRecommendations = await this.getCollaborativeRecommendations({
        userId,
        location,
        limit: Math.ceil(limit * 0.3), // 30% collaborative
        excludeStores,
        category,
        preferences
      });
      recommendations.push(...collaborativeRecommendations);

      // Get trending/popular recommendations
      const trendingRecommendations = await this.getTrendingRecommendations({
        location,
        limit: Math.ceil(limit * 0.1), // 10% trending
        excludeStores,
        category,
        preferences
      });
      recommendations.push(...trendingRecommendations);

      // Remove duplicates and sort by score
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
      const sortedRecommendations = uniqueRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return sortedRecommendations;

    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get user-based recommendations based on user's history
   */
  private async getUserBasedRecommendations(
    userId: string,
    options: RecommendationOptions
  ): Promise<StoreRecommendation[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    try {
      // Get user's favorite stores
      const userFavorites = await Favorite.find({ user: userId })
        .populate('store')
        .lean();

      // Get user's review history
      const userReviews = await Review.find({ user: userId })
        .populate('store')
        .lean();

      // Get user's analytics history
      const userAnalytics = await StoreAnalytics.find({ user: userId })
        .populate('store')
        .lean();

      // Extract categories and features from user's history
      const userPreferences = this.extractUserPreferences(userFavorites, userReviews, userAnalytics);

      // Find similar stores
      const similarStores = await this.findSimilarStores(userPreferences, {
        location,
        limit: (limit || 10) * 2, // Get more to filter later
        excludeStores: excludeStores || [],
        category,
        preferences
      });

      // Score and rank recommendations
      const recommendations = similarStores.map(store => ({
        store,
        score: this.calculateUserBasedScore(store, userPreferences),
        reasons: this.generateUserBasedReasons(store, userPreferences),
        confidence: this.calculateConfidence(store, userPreferences)
      }));

      return recommendations;

    } catch (error) {
      logger.error('Error getting user-based recommendations:', error);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    options: RecommendationOptions
  ): Promise<StoreRecommendation[]> {
    const { userId, location, limit, excludeStores, category, preferences } = options;

    try {
      // Find users with similar preferences
      const similarUsers = await this.findSimilarUsers(userId);

      // Get stores liked by similar users
      const collaborativeStores = await this.getStoresFromSimilarUsers(similarUsers, {
        location,
        limit: (limit || 10) * 2,
        excludeStores: excludeStores || [],
        category,
        preferences
      });

      // Score and rank recommendations
      const recommendations = collaborativeStores.map(store => ({
        store,
        score: this.calculateCollaborativeScore(store, similarUsers),
        reasons: this.generateCollaborativeReasons(store, similarUsers),
        confidence: this.calculateCollaborativeConfidence(store, similarUsers)
      }));

      return recommendations;

    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending/popular recommendations
   */
  private async getTrendingRecommendations(
    options: RecommendationOptions
  ): Promise<StoreRecommendation[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    try {
      // Get popular stores from analytics
      const popularStores = await StoreAnalytics.getPopularStores({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: (limit || 10) * 2
      });

      // Filter and score stores
      const recommendations = popularStores
        .filter(store => !(excludeStores || []).includes(store._id.toString()))
        .map(store => ({
          store,
          score: this.calculateTrendingScore(store),
          reasons: this.generateTrendingReasons(store),
          confidence: this.calculateTrendingConfidence(store)
        }));

      return recommendations;

    } catch (error) {
      logger.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  /**
   * Extract user preferences from their history
   */
  private extractUserPreferences(favorites: any[], reviews: any[], analytics: any[]) {
    const preferences = {
      categories: new Map<string, number>(),
      features: new Map<string, number>(),
      priceRange: { min: Infinity, max: 0 },
      ratingPreference: 0,
      deliveryTimePreference: 0
    };

    // Analyze favorites
    favorites.forEach(fav => {
      if (fav.store) {
        // Category preferences
        if (fav.store.deliveryCategories) {
          Object.entries(fav.store.deliveryCategories).forEach(([key, value]) => {
            if (value) {
              preferences.categories.set(key, (preferences.categories.get(key) || 0) + 1);
            }
          });
        }
      }
    });

    // Analyze reviews
    reviews.forEach(review => {
      if (review.store) {
        preferences.ratingPreference += review.rating;
      }
    });

    if (reviews.length > 0) {
      preferences.ratingPreference /= reviews.length;
    }

    return preferences;
  }

  /**
   * Find stores similar to user preferences
   */
  private async findSimilarStores(
    userPreferences: any,
    options: RecommendationOptions
  ): Promise<any[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    const query: any = {
      isActive: true,
      _id: { $nin: (excludeStores || []).map(id => new mongoose.Types.ObjectId(id)) }
    };

    // Add category filter
    if (category) {
      query[`deliveryCategories.${category}`] = true;
    }

    // Add preferences filters
    if (preferences?.minRating) {
      query['ratings.average'] = { $gte: preferences.minRating };
    }

    if (preferences?.maxDeliveryTime) {
      query['operationalInfo.deliveryTime'] = { $lte: preferences.maxDeliveryTime };
    }

    // Add location filter
    if (location) {
      query['location.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: location.coordinates },
          $maxDistance: (location.radius || 10) * 1000
        }
      };
    }

    const stores = await Store.find(query)
      .limit(limit || 10)
      .lean();

    return stores;
  }

  /**
   * Find users with similar preferences
   */
  private async findSimilarUsers(userId?: string): Promise<any[]> {
    if (!userId) return [];

    try {
      // Get user's favorite categories
      const userFavorites = await Favorite.find({ user: userId })
        .populate('store')
        .lean();

      const userCategories = new Set();
      userFavorites.forEach(fav => {
        if (fav.store && typeof fav.store === 'object' && 'deliveryCategories' in fav.store) {
          const store = fav.store as any;
          if (store.deliveryCategories) {
            Object.entries(store.deliveryCategories).forEach(([key, value]) => {
              if (value) userCategories.add(key);
            });
          }
        }
      });

      // Find users who favorited stores in similar categories
      const similarUsers = await Favorite.aggregate([
        {
          $match: {
            user: { $ne: new mongoose.Types.ObjectId(userId) }
          }
        },
        {
          $lookup: {
            from: 'stores',
            localField: 'store',
            foreignField: '_id',
            as: 'storeInfo'
          }
        },
        { $unwind: '$storeInfo' },
        {
          $match: {
            'storeInfo.deliveryCategories': {
              $elemMatch: {
                $in: Array.from(userCategories)
              }
            }
          }
        },
        {
          $group: {
            _id: '$user',
            commonStores: { $sum: 1 }
          }
        },
        { $sort: { commonStores: -1 } },
        { $limit: 10 }
      ]);

      return similarUsers;

    } catch (error) {
      logger.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Get stores from similar users
   */
  private async getStoresFromSimilarUsers(
    similarUsers: any[],
    options: RecommendationOptions
  ): Promise<any[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    const userIds = similarUsers.map(user => user._id);

    const stores = await Favorite.find({
      user: { $in: userIds },
      store: { $nin: (excludeStores || []).map(id => new mongoose.Types.ObjectId(id)) }
    })
      .populate('store')
      .lean();

    return stores.map(fav => fav.store).filter(Boolean);
  }

  /**
   * Calculate user-based recommendation score
   */
  private calculateUserBasedScore(store: any, userPreferences: any): number {
    let score = 0;

    // Category match score
    if (store.deliveryCategories) {
      Object.entries(store.deliveryCategories).forEach(([key, value]) => {
        if (value && userPreferences.categories.has(key)) {
          score += userPreferences.categories.get(key) * 10;
        }
      });
    }

    // Rating match score
    if (store.ratings && userPreferences.ratingPreference > 0) {
      const ratingDiff = Math.abs(store.ratings.average - userPreferences.ratingPreference);
      score += Math.max(0, 20 - ratingDiff * 5);
    }

    // Base popularity score
    if (store.ratings) {
      score += store.ratings.average * 5 + store.ratings.count * 0.1;
    }

    return score;
  }

  /**
   * Calculate collaborative filtering score
   */
  private calculateCollaborativeScore(store: any, similarUsers: any[]): number {
    let score = 0;

    // Count how many similar users favorited this store
    const userCount = similarUsers.length;
    score += userCount * 5;

    // Add store's own popularity
    if (store.ratings) {
      score += store.ratings.average * 3 + store.ratings.count * 0.05;
    }

    return score;
  }

  /**
   * Calculate trending score
   */
  private calculateTrendingScore(store: any): number {
    let score = 0;

    // Recent popularity
    score += store.totalEvents * 0.1;

    // Rating quality
    if (store.ratings) {
      score += store.ratings.average * 5;
    }

    return score;
  }

  /**
   * Generate recommendation reasons
   */
  private generateUserBasedReasons(store: any, userPreferences: any): string[] {
    const reasons = [];

    if (store.ratings && store.ratings.average >= 4.5) {
      reasons.push('Highly rated by customers');
    }

    if (store.deliveryCategories) {
      Object.entries(store.deliveryCategories).forEach(([key, value]) => {
        if (value && userPreferences.categories.has(key)) {
          reasons.push(`Matches your ${key} preference`);
        }
      });
    }

    if (store.ratings && store.ratings.count > 100) {
      reasons.push('Popular with many customers');
    }

    return reasons;
  }

  private generateCollaborativeReasons(store: any, similarUsers: any[]): string[] {
    const reasons = [];

    if (similarUsers.length > 0) {
      reasons.push(`Liked by ${similarUsers.length} users with similar taste`);
    }

    if (store.ratings && store.ratings.average >= 4.0) {
      reasons.push('Well-rated by the community');
    }

    return reasons;
  }

  private generateTrendingReasons(store: any): string[] {
    const reasons = [];

    reasons.push('Trending this week');
    
    if (store.ratings && store.ratings.average >= 4.0) {
      reasons.push('Highly rated');
    }

    return reasons;
  }

  /**
   * Calculate confidence scores
   */
  private calculateConfidence(store: any, userPreferences: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (store.ratings && store.ratings.count > 50) {
      confidence += 0.2;
    }

    if (userPreferences.categories.size > 0) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateCollaborativeConfidence(store: any, similarUsers: any[]): number {
    let confidence = 0.3; // Base confidence

    confidence += Math.min(similarUsers.length * 0.1, 0.4);

    if (store.ratings && store.ratings.count > 20) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateTrendingConfidence(store: any): number {
    let confidence = 0.6; // Base confidence for trending

    if (store.ratings && store.ratings.count > 10) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Remove duplicate recommendations
   */
  private deduplicateRecommendations(recommendations: StoreRecommendation[]): StoreRecommendation[] {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.store._id.toString())) {
        return false;
      }
      seen.add(rec.store._id.toString());
      return true;
    });
  }

  // ============================================
  // PRODUCT RECOMMENDATION METHODS
  // ============================================

  /**
   * Get similar products based on category, price range, brand
   */
  async getSimilarProducts(productId: string, limit: number = 6): Promise<ProductRecommendation[]> {
    try {
      // Get the source product
      const sourceProduct = await Product.findById(productId)
        .populate('category store')
        .lean();

      if (!sourceProduct) {
        return [];
      }

      // Build similarity query
      const similarityQuery: any = {
        _id: { $ne: new mongoose.Types.ObjectId(productId) },
        isActive: true,
        'inventory.isAvailable': true,
        category: (sourceProduct as any).category
      };

      // Price range similarity (±30%)
      const priceMin = (sourceProduct as any).pricing.selling * 0.7;
      const priceMax = (sourceProduct as any).pricing.selling * 1.3;
      similarityQuery['pricing.selling'] = { $gte: priceMin, $lte: priceMax };

      // Same store products get bonus
      const sameStoreProducts = await Product.find({
        ...similarityQuery,
        store: (sourceProduct as any).store
      })
        .populate('category store')
        .limit(Math.ceil(limit / 2))
        .lean();

      // Different store products for variety
      const otherStoreProducts = await Product.find({
        ...similarityQuery,
        store: { $ne: (sourceProduct as any).store }
      })
        .populate('category store')
        .limit(limit)
        .lean();

      // Combine and score
      const allProducts = [...sameStoreProducts, ...otherStoreProducts];
      const recommendations = allProducts.map(product => {
        const similarity = this.calculateProductSimilarity(sourceProduct, product);
        return {
          product,
          score: similarity * 100,
          reasons: this.generateSimilarProductReasons(sourceProduct, product),
          confidence: this.calculateSimilarityConfidence(sourceProduct, product),
          similarity
        };
      });

      // Sort by score and return top results
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting similar products:', error);
      return [];
    }
  }

  /**
   * Get frequently bought together products based on order history
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    limit: number = 4
  ): Promise<BundleRecommendation[]> {
    try {
      // Find orders that include this product
      const ordersWithProduct = await Order.find({
        'items.product': new mongoose.Types.ObjectId(productId),
        status: { $in: ['completed', 'delivered'] }
      })
        .populate('items.product')
        .lean();

      if (ordersWithProduct.length === 0) {
        return [];
      }

      // Count co-occurrences of other products
      const coOccurrences = new Map<string, { count: number; product: any }>();

      ordersWithProduct.forEach(order => {
        order.items.forEach((item: any) => {
          const otherProductId = item.product._id.toString();
          if (otherProductId !== productId) {
            if (coOccurrences.has(otherProductId)) {
              const existing = coOccurrences.get(otherProductId)!;
              existing.count++;
            } else {
              coOccurrences.set(otherProductId, {
                count: 1,
                product: item.product
              });
            }
          }
        });
      });

      // Sort by frequency and create bundles
      const sortedProducts = Array.from(coOccurrences.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit);

      // Get the source product
      const sourceProduct = await Product.findById(productId).lean();
      if (!sourceProduct) return [];

      // Create bundle recommendations
      const bundles: BundleRecommendation[] = sortedProducts.map(([_, data]) => {
        const combinedPrice = (sourceProduct as any).pricing.selling + (data.product as any).pricing.selling;
        const originalPrice = ((sourceProduct as any).pricing.original || (sourceProduct as any).pricing.selling) +
                            ((data.product as any).pricing.original || (data.product as any).pricing.selling);
        const savings = originalPrice - combinedPrice;

        return {
          products: [sourceProduct, data.product],
          combinedPrice,
          savings,
          frequency: data.count
        };
      });

      return bundles;

    } catch (error) {
      logger.error('Error getting frequently bought together:', error);
      return [];
    }
  }

  /**
   * Get personalized product recommendations based on user history
   */
  async getPersonalizedProductRecommendations(
    userId: string,
    options: { limit?: number; excludeProducts?: string[] } = {}
  ): Promise<ProductRecommendation[]> {
    const { limit = 10, excludeProducts = [] } = options;

    try {
      // Get user's purchase history
      const userOrders = await Order.find({
        user: userId,
        status: { $in: ['completed', 'delivered'] }
      })
        .populate('items.product')
        .lean();

      // Get user's cart items
      const userCart = await Cart.findOne({ user: userId })
        .populate('items.product')
        .lean();

      // Extract user preferences
      const userPreferences = this.extractProductPreferences(userOrders, userCart);

      // Find products matching preferences
      const query: any = {
        isActive: true,
        'inventory.isAvailable': true,
        _id: { $nin: excludeProducts.map(id => new mongoose.Types.ObjectId(id)) }
      };

      // Add category filter if user has preferences
      if (userPreferences.categories.size > 0) {
        query.category = { $in: Array.from(userPreferences.categories.keys()) };
      }

      // Add brand filter if user has preferences
      if (userPreferences.brands.size > 0) {
        query.brand = { $in: Array.from(userPreferences.brands.keys()) };
      }

      const recommendedProducts = await Product.find(query)
        .populate('category store')
        .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
        .limit(limit * 2)
        .lean();

      // Score and rank
      const recommendations = recommendedProducts.map(product => ({
        product,
        score: this.calculatePersonalizedProductScore(product, userPreferences),
        reasons: this.generatePersonalizedProductReasons(product, userPreferences),
        confidence: this.calculatePersonalizedProductConfidence(product, userPreferences)
      }));

      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting personalized product recommendations:', error);
      return [];
    }
  }

  /**
   * Get bundle deals (predefined product combinations with special pricing)
   */
  async getBundleDeals(productId: string, limit: number = 3): Promise<BundleRecommendation[]> {
    try {
      // Get the source product
      const sourceProduct = await Product.findById(productId)
        .populate('category store')
        .lean();

      if (!sourceProduct) return [];

      // Find complementary products from the same store
      const complementaryProducts = await Product.find({
        _id: { $ne: new mongoose.Types.ObjectId(productId) },
        store: (sourceProduct as any).store,
        isActive: true,
        'inventory.isAvailable': true,
        category: (sourceProduct as any).category
      })
        .populate('category')
        .limit(limit * 2)
        .lean();

      // Create bundle deals with 10-15% discount
      const bundles: BundleRecommendation[] = complementaryProducts
        .slice(0, limit)
        .map(product => {
          // Handle both pricing and price field structures
          const sourcePricing = (sourceProduct as any).pricing || (sourceProduct as any).price || {};
          const productPricing = (product as any).pricing || (product as any).price || {};

          // Get prices from either structure
          const sourcePrice = sourcePricing.original || sourcePricing.selling ||
                              sourcePricing.current || 0;
          const productPrice = productPricing.original || productPricing.selling ||
                               productPricing.current || 0;

          const originalCombined = sourcePrice + productPrice;
          const discountPercentage = 10 + Math.random() * 5; // 10-15%
          const combinedPrice = originalCombined * (1 - discountPercentage / 100);
          const savings = originalCombined - combinedPrice;

          return {
            products: [sourceProduct, product],
            combinedPrice: Math.round(combinedPrice),
            savings: Math.round(savings),
            frequency: 0 // Not based on purchase history
          };
        });

      return bundles;

    } catch (error) {
      logger.error('Error getting bundle deals:', error);
      return [];
    }
  }

  /**
   * Track product view for analytics
   */
  async trackProductView(productId: string, userId?: string): Promise<void> {
    try {
      await Product.findByIdAndUpdate(productId, {
        $inc: { 'analytics.views': 1 }
      });
    } catch (error) {
      logger.error('Error tracking product view:', error);
    }
  }

  // ============================================
  // HELPER METHODS FOR PRODUCT RECOMMENDATIONS
  // ============================================

  /**
   * Calculate similarity between two products
   */
  private calculateProductSimilarity(source: any, target: any): number {
    let similarity = 0;

    // Category match (40%)
    if (source.category._id.toString() === target.category._id.toString()) {
      similarity += 0.4;
    }

    // Brand match (20%)
    if (source.brand && target.brand && source.brand === target.brand) {
      similarity += 0.2;
    }

    // Price similarity (20%)
    const priceDiff = Math.abs(source.pricing.selling - target.pricing.selling);
    const avgPrice = (source.pricing.selling + target.pricing.selling) / 2;
    const priceSimil = Math.max(0, 1 - priceDiff / avgPrice);
    similarity += priceSimil * 0.2;

    // Rating similarity (10%)
    if (source.ratings && target.ratings) {
      const ratingDiff = Math.abs(source.ratings.average - target.ratings.average);
      const ratingSimil = Math.max(0, 1 - ratingDiff / 5);
      similarity += ratingSimil * 0.1;
    }

    // Tag overlap (10%)
    if (source.tags && target.tags) {
      const sourceTags = new Set(source.tags);
      const targetTags = new Set(target.tags);
      const intersection = new Set([...sourceTags].filter(x => targetTags.has(x)));
      const union = new Set([...sourceTags, ...targetTags]);
      if (union.size > 0) {
        similarity += (intersection.size / union.size) * 0.1;
      }
    }

    return similarity;
  }

  /**
   * Extract product preferences from user history
   */
  private extractProductPreferences(orders: any[], cart: any) {
    const preferences = {
      categories: new Map<string, number>(),
      brands: new Map<string, number>(),
      priceRange: { min: Infinity, max: 0, avg: 0 },
      totalSpent: 0,
      productCount: 0
    };

    // Analyze order history
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (item.product) {
          const product = item.product;

          // Track categories
          if (product.category) {
            const categoryId = product.category._id?.toString() || product.category.toString();
            preferences.categories.set(
              categoryId,
              (preferences.categories.get(categoryId) || 0) + 1
            );
          }

          // Track brands
          if (product.brand) {
            preferences.brands.set(
              product.brand,
              (preferences.brands.get(product.brand) || 0) + 1
            );
          }

          // Track price range
          const price = item.price || product.pricing?.selling || 0;
          if (price > 0) {
            preferences.priceRange.min = Math.min(preferences.priceRange.min, price);
            preferences.priceRange.max = Math.max(preferences.priceRange.max, price);
            preferences.totalSpent += price * item.quantity;
            preferences.productCount += item.quantity;
          }
        }
      });
    });

    // Analyze cart
    if (cart?.items) {
      cart.items.forEach((item: any) => {
        if (item.product) {
          const product = item.product;

          if (product.category) {
            const categoryId = product.category._id?.toString() || product.category.toString();
            preferences.categories.set(
              categoryId,
              (preferences.categories.get(categoryId) || 0) + 0.5 // Half weight for cart items
            );
          }

          if (product.brand) {
            preferences.brands.set(
              product.brand,
              (preferences.brands.get(product.brand) || 0) + 0.5
            );
          }
        }
      });
    }

    // Calculate average price
    if (preferences.productCount > 0) {
      preferences.priceRange.avg = preferences.totalSpent / preferences.productCount;
    }

    return preferences;
  }

  /**
   * Generate reasons for similar product recommendations
   */
  private generateSimilarProductReasons(source: any, target: any): string[] {
    const reasons: string[] = [];

    if (source.category._id.toString() === target.category._id.toString()) {
      reasons.push('Same category');
    }

    if (source.brand && target.brand && source.brand === target.brand) {
      reasons.push('Same brand');
    }

    if (source.store._id.toString() === target.store._id.toString()) {
      reasons.push('From the same store');
    }

    const priceDiff = Math.abs(source.pricing.selling - target.pricing.selling);
    if (priceDiff < source.pricing.selling * 0.2) {
      reasons.push('Similar price range');
    }

    if (target.ratings?.average >= 4.0) {
      reasons.push('Highly rated');
    }

    return reasons;
  }

  /**
   * Generate reasons for personalized recommendations
   */
  private generatePersonalizedProductReasons(product: any, preferences: any): string[] {
    const reasons: string[] = [];

    const categoryId = product.category?._id?.toString() || product.category?.toString();
    if (categoryId && preferences.categories.has(categoryId)) {
      reasons.push('Based on your purchase history');
    }

    if (product.brand && preferences.brands.has(product.brand)) {
      reasons.push(`You like ${product.brand}`);
    }

    if (product.ratings?.average >= 4.5) {
      reasons.push('Highly rated product');
    }

    if (product.pricing?.discount && product.pricing.discount > 20) {
      reasons.push(`${product.pricing.discount}% off`);
    }

    if (product.analytics?.purchases > 100) {
      reasons.push('Popular product');
    }

    return reasons;
  }

  /**
   * Calculate confidence scores for product recommendations
   */
  private calculateSimilarityConfidence(source: any, target: any): number {
    let confidence = 0.5;

    if (target.ratings?.count > 20) confidence += 0.2;
    if (source.category._id.toString() === target.category._id.toString()) confidence += 0.15;
    if (source.brand && target.brand && source.brand === target.brand) confidence += 0.15;

    return Math.min(confidence, 1.0);
  }

  private calculatePersonalizedProductConfidence(product: any, preferences: any): number {
    let confidence = 0.4;

    if (preferences.categories.size > 0) confidence += 0.2;
    if (preferences.brands.size > 0) confidence += 0.2;
    if (product.ratings?.count > 10) confidence += 0.1;
    if (preferences.productCount > 5) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate personalized product score
   */
  private calculatePersonalizedProductScore(product: any, preferences: any): number {
    let score = 0;

    // Category preference match
    const categoryId = product.category?._id?.toString() || product.category?.toString();
    if (categoryId && preferences.categories.has(categoryId)) {
      score += preferences.categories.get(categoryId)! * 20;
    }

    // Brand preference match
    if (product.brand && preferences.brands.has(product.brand)) {
      score += preferences.brands.get(product.brand)! * 15;
    }

    // Rating quality
    if (product.ratings) {
      score += product.ratings.average * 5 + product.ratings.count * 0.1;
    }

    // Price match with user's typical range
    if (preferences.priceRange.avg > 0) {
      const priceDiff = Math.abs(product.pricing.selling - preferences.priceRange.avg);
      const priceScore = Math.max(0, 20 - (priceDiff / preferences.priceRange.avg) * 10);
      score += priceScore;
    }

    // Popularity
    if (product.analytics) {
      score += Math.min(product.analytics.purchases * 0.05, 10);
    }

    return score;
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
