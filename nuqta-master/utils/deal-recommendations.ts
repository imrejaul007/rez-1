import { Deal, DealCategory } from '@/types/deals';
import { calculateDealDiscount } from './deal-validation';

export interface UserProfile {
  isFirstTime: boolean;
  isLoyaltyMember: boolean;
  averageBillAmount: number;
  preferredCategories: DealCategory[];
  previousPurchases: string[];
  shoppingHistory: {
    category: string;
    amount: number;
    date: Date;
  }[];
}

export interface DealRecommendation {
  deal: Deal;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  potentialSavings: number;
  confidence: number; // 0-1 score
  tags: string[];
}

export interface RecommendationContext {
  currentBillAmount?: number;
  selectedDeals: string[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: 'weekday' | 'weekend';
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}

/**
 * Generates personalized deal recommendations based on user profile and context
 */
export const generateDealRecommendations = (
  availableDeals: Deal[],
  userProfile: UserProfile,
  context: RecommendationContext = { selectedDeals: [] }
): DealRecommendation[] => {
  const recommendations: DealRecommendation[] = [];

  // Filter out already selected deals
  const unselectedDeals = availableDeals.filter(
    deal => !context.selectedDeals.includes(deal.id)
  );
  
  for (const deal of unselectedDeals) {
    const recommendation = generateSingleDealRecommendation(deal, userProfile, context);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  // Sort by priority and confidence
  return recommendations.sort((a, b) => {
    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const aPriority = priorityWeight[a.priority];
    const bPriority = priorityWeight[b.priority];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.confidence - a.confidence;
  });
};

/**
 * Generates recommendation for a single deal
 */
const generateSingleDealRecommendation = (
  deal: Deal,
  userProfile: UserProfile,
  context: RecommendationContext
): DealRecommendation | null => {
  let confidence = 0.5; // Base confidence
  let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  const tags: string[] = [];
  let reason = '';

  // Check if deal is applicable to user
  if (deal.category === 'first-time' && !userProfile.isFirstTime) {
    return null; // Not applicable
  }

  if (deal.category === 'loyalty' && !userProfile.isLoyaltyMember) {
    return null; // Not applicable
  }

  // Calculate potential savings
  const billAmount = context.currentBillAmount || userProfile.averageBillAmount;
  const savingsResult = calculateDealDiscount(deal, billAmount);
  
  if (!savingsResult.isValid) {
    return null; // Deal not valid for current context
  }

  // Base recommendation logic
  confidence += 0.2; // Base for valid deals

  // Category preference scoring
  if (userProfile.preferredCategories.includes(deal.category)) {
    confidence += 0.3;
    tags.push('Preferred Category');
    reason = `Great ${getCategoryDisplayName(deal.category)} offer based on your shopping preferences`;
  }

  // First-time user bonuses
  if (deal.category === 'first-time' && userProfile.isFirstTime) {
    confidence += 0.4;
    priority = 'HIGH';
    tags.push('First-Time Special');
    reason = 'Exclusive first-time customer discount - don\'t miss out!';
  }

  // Loyalty member benefits
  if (deal.category === 'loyalty' && userProfile.isLoyaltyMember) {
    confidence += 0.3;
    tags.push('VIP Member');
    reason = 'Exclusive loyalty member benefit with enhanced savings';
  }

  // High-value deals
  if (deal.discountValue >= 25) {
    confidence += 0.2;
    tags.push('High Value');
    if (!reason) reason = `Exceptional ${deal.discountValue}% discount opportunity`;
  }

  // Expiring soon deals
  const daysUntilExpiry = getDaysUntilExpiry(deal.validUntil);
  if (daysUntilExpiry <= 3) {
    confidence += 0.25;
    priority = 'HIGH';
    tags.push('Expiring Soon');
    reason = `Limited time offer - expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}!`;
  } else if (daysUntilExpiry <= 7) {
    confidence += 0.1;
    tags.push('Limited Time');
  }

  // Bill amount optimization
  if (billAmount >= deal.minimumBill * 1.5) {
    confidence += 0.15;
    tags.push('Perfect Match');
    if (!reason) reason = 'Perfect fit for your current shopping amount';
  }

  // Seasonal relevance
  if (context.season && deal.category === 'seasonal') {
    confidence += 0.2;
    tags.push('Seasonal');
    if (!reason) reason = 'Timely seasonal offer for maximum savings';
  }

  // Weekend/weekday context
  if (context.dayOfWeek === 'weekend' && deal.category === 'cashback') {
    confidence += 0.1;
    tags.push('Weekend Special');
  }

  // Purchase history analysis
  const categoryHistory = userProfile.shoppingHistory.filter(
    purchase => deal.applicableProducts?.includes(purchase.category)
  );
  
  if (categoryHistory.length > 0) {
    confidence += 0.2;
    tags.push('Based on History');
    if (!reason) reason = 'Recommended based on your shopping history';
  }

  // Usage limit urgency
  if (deal.usageLimit && deal.usageCount) {
    const remainingUses = deal.usageLimit - deal.usageCount;
    if (remainingUses <= 2) {
      confidence += 0.15;
      tags.push('Limited Uses');
      if (!reason) reason = `Only ${remainingUses} use${remainingUses !== 1 ? 's' : ''} remaining`;
    }
  }

  // Maximum discount potential
  if (deal.maxDiscount && savingsResult.discountAmount >= deal.maxDiscount * 0.8) {
    confidence += 0.1;
    tags.push('Max Savings');
  }

  // Determine final priority based on confidence and other factors
  if (confidence >= 0.8) {
    priority = 'HIGH';
  } else if (confidence >= 0.6) {
    priority = 'MEDIUM';
  } else {
    priority = 'LOW';
  }

  // Default reason if none set
  if (!reason) {
    reason = `Save ${deal.discountValue}% on your purchase with this ${getCategoryDisplayName(deal.category)} deal`;
  }

  return {
    deal,
    reason,
    priority,
    potentialSavings: savingsResult.discountAmount,
    confidence: Math.min(confidence, 1), // Cap at 1.0
    tags,
  };
};

/**
 * Gets trending deals based on usage patterns
 */
export const getTrendingDeals = (deals: Deal[]): Deal[] => {
  // Sort by usage count (popularity) and recent activity
  return deals
    .filter(deal => deal.isActive)
    .sort((a, b) => {
      const aPopularity = (a.usageCount || 0) / (a.usageLimit || 1);
      const bPopularity = (b.usageCount || 0) / (b.usageLimit || 1);
      return bPopularity - aPopularity;
    })
    .slice(0, 5);
};

/**
 * Gets personalized deal mix for optimal savings
 */
export const getOptimalDealMix = (
  availableDeals: Deal[],
  billAmount: number,
  userProfile: UserProfile
): {
  primaryDeal: Deal | null;
  complementaryDeals: Deal[];
  totalPotentialSavings: number;
} => {
  const recommendations = generateDealRecommendations(
    availableDeals,
    userProfile,
    { selectedDeals: [], currentBillAmount: billAmount }
  );
  
  if (recommendations.length === 0) {
    return {
      primaryDeal: null,
      complementaryDeals: [],
      totalPotentialSavings: 0,
    };
  }

  const primaryDeal = recommendations[0].deal;
  const complementaryDeals = recommendations
    .slice(1, 3)
    .filter(rec => rec.priority !== 'LOW')
    .map(rec => rec.deal);

  const totalSavings = [primaryDeal, ...complementaryDeals]
    .reduce((total, deal) => {
      const result = calculateDealDiscount(deal, billAmount);
      return total + (result.isValid ? result.discountAmount : 0);
    }, 0);

  return {
    primaryDeal,
    complementaryDeals,
    totalPotentialSavings: Math.round(totalSavings),
  };
};

/**
 * Suggests deals based on shopping cart content
 */
export const getCartBasedRecommendations = (
  cartItems: Array<{ category: string; price: number }>,
  availableDeals: Deal[]
): DealRecommendation[] => {
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const cartCategories = [...new Set(cartItems.map(item => item.category))];

  const mockUserProfile: UserProfile = {
    isFirstTime: false,
    isLoyaltyMember: false,
    averageBillAmount: cartTotal,
    preferredCategories: cartCategories as DealCategory[],
    previousPurchases: [],
    shoppingHistory: cartItems.map(item => ({
      category: item.category,
      amount: item.price,
      date: new Date(),
    })),
  };

  return generateDealRecommendations(
    availableDeals,
    mockUserProfile,
    { selectedDeals: [], currentBillAmount: cartTotal }
  ).slice(0, 3); // Top 3 recommendations
};

/**
 * Gets smart notifications for deal opportunities
 */
export const getSmartDealNotifications = (
  deals: Deal[],
  userProfile: UserProfile
): Array<{
  type: 'EXPIRING' | 'NEW_MATCH' | 'PRICE_DROP' | 'USAGE_REMINDER';
  deal: Deal;
  message: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}> => {
  const notifications: Array<{
    type: 'EXPIRING' | 'NEW_MATCH' | 'PRICE_DROP' | 'USAGE_REMINDER';
    deal: Deal;
    message: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  }> = [];

  deals.forEach(deal => {
    const daysLeft = getDaysUntilExpiry(deal.validUntil);
    
    // Expiring deals
    if (daysLeft <= 1) {
      notifications.push({
        type: 'EXPIRING',
        deal,
        message: `${deal.title} expires today! Don't miss out on ${deal.discountValue}% savings.`,
        urgency: 'HIGH',
      });
    } else if (daysLeft <= 3) {
      notifications.push({
        type: 'EXPIRING',
        deal,
        message: `${deal.title} expires in ${daysLeft} days. Save ${deal.discountValue}% now!`,
        urgency: 'MEDIUM',
      });
    }

    // Usage limit reminders
    if (deal.usageLimit && deal.usageCount) {
      const remaining = deal.usageLimit - deal.usageCount;
      if (remaining === 1) {
        notifications.push({
          type: 'USAGE_REMINDER',
          deal,
          message: `Last chance! Only 1 use remaining for ${deal.title}.`,
          urgency: 'HIGH',
        });
      }
    }

    // Category match notifications
    if (userProfile.preferredCategories.includes(deal.category)) {
      notifications.push({
        type: 'NEW_MATCH',
        deal,
        message: `New ${getCategoryDisplayName(deal.category)} deal matches your interests!`,
        urgency: 'LOW',
      });
    }
  });

  return notifications.sort((a, b) => {
    const urgencyWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
  });
};

// Helper functions
const getDaysUntilExpiry = (expiryDate: Date): number => {
  const now = new Date();
  const timeDiff = expiryDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

const getCategoryDisplayName = (category: DealCategory): string => {
  const names: Record<DealCategory, string> = {
    'instant-discount': 'instant discount',
    'cashback': 'cashback',
    'buy-one-get-one': 'BOGO',
    'seasonal': 'seasonal',
    'first-time': 'first-time user',
    'loyalty': 'loyalty',
    'clearance': 'clearance',
  };
  return names[category] || category;
};