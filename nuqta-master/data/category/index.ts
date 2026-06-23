/**
 * Category Data Index
 * Central export for all category dummy data
 */

// Fashion
export * from './fashionCategoryData';

// Food & Dining
export * from './foodCategoryData';

// Beauty & Wellness
export * from './beautyCategoryData';

// Grocery & Essentials
export * from './groceryCategoryData';

// Healthcare
export * from './healthcareCategoryData';

// Education & Learning
export * from './educationCategoryData';

// Fitness & Sports
export * from './fitnessCategoryData';

// Home Services
export * from './homeServicesCategoryData';

// Travel
export * from './travelCategoryData';

// Entertainment
export * from './entertainmentCategoryData';

// Financial Services
export * from './financialCategoryData';

// Electronics
export * from './electronicsCategoryData';

// Helper function to get data by category slug
import { CategoryGridItem, UGCPost, AISuggestion, TrendingHashtag, ExclusiveOffer } from '@/types/categoryTypes';

import { fashionCategories, fashionUGCPosts, fashionAISuggestions, fashionTrendingHashtags, fashionAIPlaceholders, fashionExclusiveOffers } from './fashionCategoryData';
import { foodCategories, foodUGCPosts, foodAISuggestions, foodTrendingHashtags, foodAIPlaceholders, foodExclusiveOffers } from './foodCategoryData';
import { beautyCategories, beautyUGCPosts, beautyAISuggestions, beautyTrendingHashtags, beautyAIPlaceholders, beautyExclusiveOffers } from './beautyCategoryData';
import { groceryCategories, groceryUGCPosts, groceryAISuggestions, groceryTrendingHashtags, groceryAIPlaceholders, groceryExclusiveOffers } from './groceryCategoryData';
import { healthcareCategories, healthcareUGCPosts, healthcareAISuggestions, healthcareTrendingHashtags, healthcareAIPlaceholders, healthcareExclusiveOffers } from './healthcareCategoryData';
import { educationCategories, educationUGCPosts, educationAISuggestions, educationTrendingHashtags, educationAIPlaceholders, educationExclusiveOffers } from './educationCategoryData';
import { fitnessCategories, fitnessUGCPosts, fitnessAISuggestions, fitnessTrendingHashtags, fitnessAIPlaceholders, fitnessExclusiveOffers } from './fitnessCategoryData';
import { homeServicesCategories, homeServicesUGCPosts, homeServicesAISuggestions, homeServicesTrendingHashtags, homeServicesAIPlaceholders, homeServicesExclusiveOffers } from './homeServicesCategoryData';
import { travelCategories, travelUGCPosts, travelAISuggestions, travelTrendingHashtags, travelAIPlaceholders, travelExclusiveOffers } from './travelCategoryData';
import { entertainmentCategories, entertainmentUGCPosts, entertainmentAISuggestions, entertainmentTrendingHashtags, entertainmentAIPlaceholders, entertainmentExclusiveOffers } from './entertainmentCategoryData';
import { financialCategories, financialUGCPosts, financialAISuggestions, financialTrendingHashtags, financialAIPlaceholders, financialExclusiveOffers } from './financialCategoryData';
import { electronicsCategories, electronicsUGCPosts, electronicsAISuggestions, electronicsTrendingHashtags, electronicsAIPlaceholders, electronicsExclusiveOffers } from './electronicsCategoryData';

interface CategoryDataBundle {
  categories: CategoryGridItem[];
  ugcPosts: UGCPost[];
  aiSuggestions: AISuggestion[];
  trendingHashtags: TrendingHashtag[];
  aiPlaceholders: string[];
  exclusiveOffers: ExclusiveOffer[];
}

const categoryDataMap: Record<string, CategoryDataBundle> = {
  'fashion': {
    categories: fashionCategories,
    ugcPosts: fashionUGCPosts,
    aiSuggestions: fashionAISuggestions,
    trendingHashtags: fashionTrendingHashtags,
    aiPlaceholders: fashionAIPlaceholders,
    exclusiveOffers: fashionExclusiveOffers,
  },
  'food-dining': {
    categories: foodCategories,
    ugcPosts: foodUGCPosts,
    aiSuggestions: foodAISuggestions,
    trendingHashtags: foodTrendingHashtags,
    aiPlaceholders: foodAIPlaceholders,
    exclusiveOffers: foodExclusiveOffers,
  },
  'beauty': {
    categories: beautyCategories,
    ugcPosts: beautyUGCPosts,
    aiSuggestions: beautyAISuggestions,
    trendingHashtags: beautyTrendingHashtags,
    aiPlaceholders: beautyAIPlaceholders,
    exclusiveOffers: beautyExclusiveOffers,
  },
  'beauty-wellness': {
    categories: beautyCategories,
    ugcPosts: beautyUGCPosts,
    aiSuggestions: beautyAISuggestions,
    trendingHashtags: beautyTrendingHashtags,
    aiPlaceholders: beautyAIPlaceholders,
    exclusiveOffers: beautyExclusiveOffers,
  },
  'grocery': {
    categories: groceryCategories,
    ugcPosts: groceryUGCPosts,
    aiSuggestions: groceryAISuggestions,
    trendingHashtags: groceryTrendingHashtags,
    aiPlaceholders: groceryAIPlaceholders,
    exclusiveOffers: groceryExclusiveOffers,
  },
  'grocery-essentials': {
    categories: groceryCategories,
    ugcPosts: groceryUGCPosts,
    aiSuggestions: groceryAISuggestions,
    trendingHashtags: groceryTrendingHashtags,
    aiPlaceholders: groceryAIPlaceholders,
    exclusiveOffers: groceryExclusiveOffers,
  },
  'healthcare': {
    categories: healthcareCategories,
    ugcPosts: healthcareUGCPosts,
    aiSuggestions: healthcareAISuggestions,
    trendingHashtags: healthcareTrendingHashtags,
    aiPlaceholders: healthcareAIPlaceholders,
    exclusiveOffers: healthcareExclusiveOffers,
  },
  'education': {
    categories: educationCategories,
    ugcPosts: educationUGCPosts,
    aiSuggestions: educationAISuggestions,
    trendingHashtags: educationTrendingHashtags,
    aiPlaceholders: educationAIPlaceholders,
    exclusiveOffers: educationExclusiveOffers,
  },
  'fitness': {
    categories: fitnessCategories,
    ugcPosts: fitnessUGCPosts,
    aiSuggestions: fitnessAISuggestions,
    trendingHashtags: fitnessTrendingHashtags,
    aiPlaceholders: fitnessAIPlaceholders,
    exclusiveOffers: fitnessExclusiveOffers,
  },
  'home-services': {
    categories: homeServicesCategories,
    ugcPosts: homeServicesUGCPosts,
    aiSuggestions: homeServicesAISuggestions,
    trendingHashtags: homeServicesTrendingHashtags,
    aiPlaceholders: homeServicesAIPlaceholders,
    exclusiveOffers: homeServicesExclusiveOffers,
  },
  'travel': {
    categories: travelCategories,
    ugcPosts: travelUGCPosts,
    aiSuggestions: travelAISuggestions,
    trendingHashtags: travelTrendingHashtags,
    aiPlaceholders: travelAIPlaceholders,
    exclusiveOffers: travelExclusiveOffers,
  },
  'entertainment': {
    categories: entertainmentCategories,
    ugcPosts: entertainmentUGCPosts,
    aiSuggestions: entertainmentAISuggestions,
    trendingHashtags: entertainmentTrendingHashtags,
    aiPlaceholders: entertainmentAIPlaceholders,
    exclusiveOffers: entertainmentExclusiveOffers,
  },
  'financial': {
    categories: financialCategories,
    ugcPosts: financialUGCPosts,
    aiSuggestions: financialAISuggestions,
    trendingHashtags: financialTrendingHashtags,
    aiPlaceholders: financialAIPlaceholders,
    exclusiveOffers: financialExclusiveOffers,
  },
  'electronics': {
    categories: electronicsCategories,
    ugcPosts: electronicsUGCPosts,
    aiSuggestions: electronicsAISuggestions,
    trendingHashtags: electronicsTrendingHashtags,
    aiPlaceholders: electronicsAIPlaceholders,
    exclusiveOffers: electronicsExclusiveOffers,
  },
};

/**
 * Get category data by slug
 */
export function getCategoryData(slug: string): CategoryDataBundle | null {
  return categoryDataMap[slug] || null;
}

/**
 * Get all category slugs
 */
export function getAllCategorySlugs(): string[] {
  return Object.keys(categoryDataMap);
}
