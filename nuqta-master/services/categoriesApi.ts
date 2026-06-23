import apiClient, { ApiResponse } from './apiClient';

// Category interfaces (matching backend)
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  bannerImage?: string;
  type: 'going_out' | 'home_delivery' | 'earn' | 'play' | 'general';
  parentCategory?: string;
  childCategories?: Category[];
  isActive: boolean;
  sortOrder: number;
  metadata: {
    color?: string;
    tags?: string[];
    description?: string;
    featured?: boolean;
  };
  productCount: number;
  storeCount: number;
  isBestDiscount?: boolean;
  isBestSeller?: boolean;
  maxCashback?: number;
  vibes?: CategoryVibe[];
  occasions?: CategoryOccasion[];
  trendingHashtags?: CategoryHashtag[];
  createdAt: string;
  updatedAt: string;
}

// Category page data interfaces
export interface CategoryVibe {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface CategoryOccasion {
  id: string;
  name: string;
  icon: string;
  color: string;
  tag?: string | null;
  discount: number;
}

export interface CategoryHashtag {
  id: string;
  tag: string;
  count: number;
  color: string;
  trending: boolean;
}

// Dynamic page configuration interfaces
export interface PageConfigTheme {
  primaryColor: string;
  gradientColors: [string, string, string];
  accentColor: string;
  backgroundColor: string;
}

export interface PageConfigBanner {
  title: string;
  subtitle: string;
  discount: string;
  tag: string;
  image?: string;
}

export interface PageConfigTab {
  id: string;
  label: string;
  icon: string;
  serviceFilter?: string;
  sectionOverride?: string;
}

export interface PageConfigQuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color?: string;
}

export interface PageConfigSection {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  icon?: string;
  sortOrder: number;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PageConfigServiceType {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  gradient: [string, string];
  serviceFilter: string;
}

export interface PageConfigDietaryOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  tags: string[];
}

export interface PageConfigCuratedCollection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: [string, string];
  tags: string;
}

export interface PageConfigSortOption {
  id: string;
  label: string;
  icon?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface PageConfigFilterOptions {
  priceMax?: number;
  priceLabel?: string;
  ratingThreshold?: number;
  showPriceFilter?: boolean;
  showRatingFilter?: boolean;
  showOpenNow?: boolean;
}

export interface PageConfigStoreDisplay {
  storesPerPage?: number;
  tagExclusions?: string[];
  defaultCoinsMultiplier?: number;
  defaultReviewBonus?: number;
  defaultVisitMilestone?: number;
}

export interface PageConfigTrustBadge {
  icon: string;
  label: string;
  color: string;
}

export interface PageConfigLoyaltyConfig {
  emptyMessage?: string;
  displayLimit?: number;
}

export interface PageConfigExperienceBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface CategoryPageConfig {
  categorySlug: string;
  categoryName: string;
  theme: PageConfigTheme;
  banner: PageConfigBanner;
  tabs: PageConfigTab[];
  quickActions: PageConfigQuickAction[];
  sections: PageConfigSection[];
  serviceTypes: PageConfigServiceType[];
  dietaryOptions?: PageConfigDietaryOption[];
  curatedCollections?: PageConfigCuratedCollection[];
  searchPlaceholders?: Record<string, string[]>;
  valuePropItems?: Array<{ icon: string; text: string; color: string }>;
  sortOptions?: PageConfigSortOption[];
  filterOptions?: PageConfigFilterOptions;
  storeDisplayConfig?: PageConfigStoreDisplay;
  trustBadges?: PageConfigTrustBadge[];
  loyaltyConfig?: PageConfigLoyaltyConfig;
  experienceBenefits?: PageConfigExperienceBenefit[];
}

export interface CategoryFilters {
  type?: string;
  featured?: boolean;
  parent?: string;
  search?: string;
  isActive?: boolean;
}

export interface CategoryQuery extends CategoryFilters {
  page?: number;
  limit?: number;
  sort?: string;
  populate?: string[];
}

class CategoriesService {
  private baseUrl = '/categories';

  // Get all categories with optional filters
  async getCategories(params: CategoryQuery = {}): Promise<ApiResponse<Category[]>> {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query.append(key, value.join(','));
        } else {
          query.append(key, String(value));
        }
      }
    });

    return apiClient.get(`${this.baseUrl}?${query.toString()}`);
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  // Get category by slug
  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    return apiClient.get(`${this.baseUrl}/${slug}`);
  }

  // Get category tree structure
  async getCategoryTree(type?: string): Promise<ApiResponse<Category[]>> {
    const query = type ? `?type=${type}` : '';
    return apiClient.get(`${this.baseUrl}/tree${query}`);
  }

  // Get featured categories - uses dedicated /featured endpoint
  async getFeaturedCategories(type?: string, limit: number = 20): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (type) params.append('type', type);

    return apiClient.get(`${this.baseUrl}/featured?${params.toString()}`);
  }

  // Get root categories (no parent)
  // Note: Backend validates query params - only parent, type, featured are allowed
  async getRootCategories(type?: string): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    params.append('parent', 'null');
    if (type) params.append('type', type);

    return apiClient.get(`${this.baseUrl}?${params.toString()}`);
  }

  // Search categories
  async searchCategories(query: string, type?: string): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    params.append('search', query);
    params.append('isActive', 'true');
    if (type) params.append('type', type);

    return apiClient.get(`${this.baseUrl}?${params.toString()}`);
  }

  // Get categories with product counts
  async getCategoriesWithCounts(type?: string): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    params.append('includeCounts', 'true');
    params.append('isActive', 'true');
    if (type) params.append('type', type);

    return apiClient.get(`${this.baseUrl}?${params.toString()}`);
  }

  // Get best discount categories
  async getBestDiscountCategories(limit: number = 10): Promise<ApiResponse<Category[]>> {
    return apiClient.get(`${this.baseUrl}/best-discount?limit=${limit}`);
  }

  // Get best seller categories
  async getBestSellerCategories(limit: number = 10): Promise<ApiResponse<Category[]>> {
    return apiClient.get(`${this.baseUrl}/best-seller?limit=${limit}`);
  }

  // Get category vibes
  async getCategoryVibes(slug: string): Promise<ApiResponse<{ vibes: CategoryVibe[] }>> {
    return apiClient.get(`${this.baseUrl}/${slug}/vibes`);
  }

  // Get category occasions
  async getCategoryOccasions(slug: string): Promise<ApiResponse<{ occasions: CategoryOccasion[] }>> {
    return apiClient.get(`${this.baseUrl}/${slug}/occasions`);
  }

  // Get category hashtags
  async getCategoryHashtags(slug: string, limit: number = 6): Promise<ApiResponse<{ hashtags: CategoryHashtag[] }>> {
    return apiClient.get(`${this.baseUrl}/${slug}/hashtags?limit=${limit}`);
  }

  // Get full category page data (category details + vibes + occasions + hashtags)
  async getCategoryPageData(slug: string): Promise<ApiResponse<Category>> {
    try {
      // Get category which includes childCategories populated
      const response = await apiClient.get<Category>(`${this.baseUrl}/${slug}`);

      if (response.success && response.data) {
        return response;
      }

      return {
        success: false,
        error: 'Category not found',
        message: `Category with slug '${slug}' not found`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch category data',
        message: error?.message || 'Failed to fetch category data',
      };
    }
  }

  // Get category loyalty stats
  async getCategoryLoyaltyStats(slug: string): Promise<ApiResponse<{ ordersCount: number; brandsCount: number }>> {
    return apiClient.get(`${this.baseUrl}/${slug}/loyalty-stats`);
  }

  // Get recent orders for social proof ticker
  async getRecentOrders(slug: string, limit: number = 5): Promise<ApiResponse<{ orders: { id: string; userName: string; storeName: string; timeAgo: string }[] }>> {
    return apiClient.get(`${this.baseUrl}/${slug}/recent-orders?limit=${limit}`);
  }

  // Get AI suggestions for a category
  async getCategoryAISuggestions(slug: string): Promise<ApiResponse<{ suggestions: { id: string; title: string; icon: string; link: string }[]; placeholders: string[] }>> {
    return apiClient.get(`${this.baseUrl}/${slug}/ai-suggestions`);
  }

  // Get dynamic page configuration for a category
  async getPageConfig(slug: string): Promise<ApiResponse<CategoryPageConfig>> {
    return apiClient.get(`${this.baseUrl}/${slug}/page-config`);
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const CATEGORIES_SERVICE_KEY = '__rezCategoriesService__';

function getCategoriesService(): CategoriesService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[CATEGORIES_SERVICE_KEY]) {
      (globalThis as any)[CATEGORIES_SERVICE_KEY] = new CategoriesService();
    }
    return (globalThis as any)[CATEGORIES_SERVICE_KEY];
  }
  return new CategoriesService();
}

const categoriesService = getCategoriesService();

// Named export for compatibility
export { categoriesService as categoriesApi };

export default categoriesService;