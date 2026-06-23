import { Deal, DealValidationError, AppliedDeal } from '@/types/deals';
import { colors } from '@/constants/theme';

export interface DealConflict {
  type: 'CATEGORY_CONFLICT' | 'USAGE_LIMIT' | 'MINIMUM_BILL' | 'STACKING_RESTRICTION' | 'MUTUAL_EXCLUSION';
  conflictingDeals: string[];
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  suggestion?: string;
}

export interface DealCompatibilityResult {
  isCompatible: boolean;
  conflicts: DealConflict[];
  warnings: string[];
  maxPossibleSavings: number;
  recommendedCombination: string[];
}

/**
 * Detects conflicts between multiple deals
 */
export const detectDealConflicts = (
  selectedDeals: Deal[],
  billAmount: number = 0
): DealCompatibilityResult => {
  const conflicts: DealConflict[] = [];
  const warnings: string[] = [];
  let maxPossibleSavings = 0;
  let recommendedCombination: string[] = [];

  // Check for category conflicts
  const categoryConflicts = checkCategoryConflicts(selectedDeals);
  conflicts.push(...categoryConflicts);

  // Check for mutual exclusions
  const mutualExclusions = checkMutualExclusions(selectedDeals);
  conflicts.push(...mutualExclusions);

  // Check stacking restrictions
  const stackingConflicts = checkStackingRestrictions(selectedDeals);
  conflicts.push(...stackingConflicts);

  // Check usage limits
  const usageLimitConflicts = checkUsageLimits(selectedDeals);
  conflicts.push(...usageLimitConflicts);

  // Check minimum bill requirements
  if (billAmount > 0) {
    const billConflicts = checkMinimumBillConflicts(selectedDeals, billAmount);
    conflicts.push(...billConflicts);
  }

  // Calculate optimal combination
  const optimalResult = calculateOptimalDealCombination(selectedDeals, billAmount);
  maxPossibleSavings = optimalResult.maxSavings;
  recommendedCombination = optimalResult.recommendedDeals;

  // Add warnings for suboptimal selections
  if (selectedDeals.length > recommendedCombination.length) {
    warnings.push('Some deals cannot be combined. Consider the recommended combination for maximum savings.');
  }

  const isCompatible = conflicts.filter(c => c.severity === 'ERROR').length === 0;

  return {
    isCompatible,
    conflicts,
    warnings,
    maxPossibleSavings,
    recommendedCombination,
  };
};

/**
 * Checks for category-based conflicts
 */
const checkCategoryConflicts = (deals: Deal[]): DealConflict[] => {
  const conflicts: DealConflict[] = [];
  
  // Check for multiple instant discount deals
  const instantDeals = deals.filter(deal => deal.category === 'instant-discount');
  if (instantDeals.length > 1) {
    conflicts.push({
      type: 'CATEGORY_CONFLICT',
      conflictingDeals: instantDeals.map(d => d.id),
      message: 'Only one instant discount can be applied per transaction',
      severity: 'ERROR',
      suggestion: `Choose the deal with highest discount: ${instantDeals.reduce((best, current) => 
        current.discountValue > best.discountValue ? current : best
      ).title}`,
    });
  }

  // Check for BOGO conflicts
  const bogoDeals = deals.filter(deal => deal.category === 'buy-one-get-one');
  if (bogoDeals.length > 1) {
    conflicts.push({
      type: 'CATEGORY_CONFLICT',
      conflictingDeals: bogoDeals.map(d => d.id),
      message: 'Multiple BOGO offers cannot be combined',
      severity: 'ERROR',
      suggestion: 'Select the BOGO deal that provides the best value for your purchase',
    });
  }

  return conflicts;
};

/**
 * Checks for mutual exclusion conflicts
 */
const checkMutualExclusions = (deals: Deal[]): DealConflict[] => {
  const conflicts: DealConflict[] = [];

  // First-time user deals are exclusive with loyalty deals
  const firstTimeDeals = deals.filter(deal => deal.category === 'first-time');
  const loyaltyDeals = deals.filter(deal => deal.category === 'loyalty');

  if (firstTimeDeals.length > 0 && loyaltyDeals.length > 0) {
    conflicts.push({
      type: 'MUTUAL_EXCLUSION',
      conflictingDeals: [...firstTimeDeals.map(d => d.id), ...loyaltyDeals.map(d => d.id)],
      message: 'First-time user deals cannot be combined with loyalty program deals',
      severity: 'ERROR',
      suggestion: 'Choose either first-time user benefits or loyalty program benefits',
    });
  }

  // Clearance deals might conflict with other discount types
  const clearanceDeals = deals.filter(deal => deal.category === 'clearance');
  const otherDiscountDeals = deals.filter(deal => 
    deal.category === 'instant-discount' || deal.category === 'seasonal'
  );
  
  if (clearanceDeals.length > 0 && otherDiscountDeals.length > 0) {
    conflicts.push({
      type: 'MUTUAL_EXCLUSION',
      conflictingDeals: [...clearanceDeals.map(d => d.id), ...otherDiscountDeals.map(d => d.id)],
      message: 'Clearance deals cannot be combined with other discount offers',
      severity: 'WARNING',
      suggestion: 'Compare the savings from each deal type and choose the better option',
    });
  }

  return conflicts;
};

/**
 * Checks for stacking restrictions
 */
const checkStackingRestrictions = (deals: Deal[]): DealConflict[] => {
  const conflicts: DealConflict[] = [];

  // Most stores don't allow more than 2-3 deals to be stacked
  const MAX_STACKABLE_DEALS = 2;
  
  if (deals.length > MAX_STACKABLE_DEALS) {
    conflicts.push({
      type: 'STACKING_RESTRICTION',
      conflictingDeals: deals.map(d => d.id),
      message: `Maximum ${MAX_STACKABLE_DEALS} deals can be applied per transaction`,
      severity: 'ERROR',
      suggestion: `Select the ${MAX_STACKABLE_DEALS} deals that provide the highest combined savings`,
    });
  }

  return conflicts;
};

/**
 * Checks for usage limit conflicts
 */
const checkUsageLimits = (deals: Deal[]): DealConflict[] => {
  const conflicts: DealConflict[] = [];

  deals.forEach(deal => {
    if (deal.usageLimit && deal.usageCount && deal.usageCount >= deal.usageLimit) {
      conflicts.push({
        type: 'USAGE_LIMIT',
        conflictingDeals: [deal.id],
        message: `${deal.title} has reached its usage limit`,
        severity: 'ERROR',
        suggestion: 'Remove this deal and select an alternative offer',
      });
    }

    // Warning for deals close to usage limit
    if (deal.usageLimit && deal.usageCount && 
        (deal.usageLimit - deal.usageCount) <= 1) {
      conflicts.push({
        type: 'USAGE_LIMIT',
        conflictingDeals: [deal.id],
        message: `${deal.title} has only ${deal.usageLimit - deal.usageCount} use remaining`,
        severity: 'WARNING',
        suggestion: 'Consider saving this deal for a larger purchase',
      });
    }
  });

  return conflicts;
};

/**
 * Checks minimum bill conflicts
 */
const checkMinimumBillConflicts = (deals: Deal[], billAmount: number): DealConflict[] => {
  const conflicts: DealConflict[] = [];

  const unmetDeals = deals.filter(deal => billAmount < deal.minimumBill);
  
  if (unmetDeals.length > 0) {
    const highestMinimum = Math.max(...unmetDeals.map(d => d.minimumBill));
    const additionalNeeded = highestMinimum - billAmount;

    conflicts.push({
      type: 'MINIMUM_BILL',
      conflictingDeals: unmetDeals.map(d => d.id),
      message: `Add ₹${additionalNeeded.toLocaleString()} more to qualify for selected deals`,
      severity: 'INFO',
      suggestion: `Shop for ₹${additionalNeeded.toLocaleString()} more items to unlock all selected deals`,
    });
  }

  return conflicts;
};

/**
 * Calculates the optimal deal combination for maximum savings
 */
const calculateOptimalDealCombination = (
  deals: Deal[],
  billAmount: number = 5000
): { maxSavings: number; recommendedDeals: string[] } => {
  // Simple greedy algorithm to find best combination
  // In a real app, this could use dynamic programming for optimal results
  
  const validDeals = deals.filter(deal => billAmount >= deal.minimumBill);
  
  // Sort by potential savings (discount value)
  const sortedDeals = validDeals.sort((a, b) => {
    const aSavings = Math.min(
      (billAmount * a.discountValue) / 100,
      a.maxDiscount || Infinity
    );
    const bSavings = Math.min(
      (billAmount * b.discountValue) / 100,
      b.maxDiscount || Infinity
    );
    return bSavings - aSavings;
  });

  // Apply conflict rules to build compatible combination
  const recommendedDeals: string[] = [];
  let totalSavings = 0;
  const MAX_DEALS = 2;

  for (const deal of sortedDeals) {
    if (recommendedDeals.length >= MAX_DEALS) break;

    // Check if this deal conflicts with already selected deals
    const currentSelection = deals.filter(d => recommendedDeals.includes(d.id));
    const conflicts = detectDealConflicts([...currentSelection, deal], billAmount);
    
    const hasErrorConflicts = conflicts.conflicts.some(c => c.severity === 'ERROR');
    
    if (!hasErrorConflicts) {
      recommendedDeals.push(deal.id);
      const dealSavings = Math.min(
        (billAmount * deal.discountValue) / 100,
        deal.maxDiscount || Infinity
      );
      totalSavings += dealSavings;
    }
  }

  return {
    maxSavings: Math.round(totalSavings),
    recommendedDeals,
  };
};

/**
 * Gets user-friendly conflict message
 */
export const getConflictSeverityColor = (severity: DealConflict['severity']): string => {
  switch (severity) {
    case 'ERROR':
      return colors.error;
    case 'WARNING':
      return '#F59E0B';
    case 'INFO':
      return '#3B82F6';
    default:
      return '#6B7280';
  }
};

/**
 * Gets conflict severity icon
 */
export const getConflictSeverityIcon = (severity: DealConflict['severity']): string => {
  switch (severity) {
    case 'ERROR':
      return 'alert-circle';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'information-circle';
    default:
      return 'help-circle';
  }
};

/**
 * Suggests alternative deals when conflicts occur
 */
export const suggestAlternativeDeals = (
  conflictingDeals: Deal[],
  allAvailableDeals: Deal[],
  billAmount: number = 0
): Deal[] => {
  // Find deals that don't conflict and provide good value
  const nonConflictingDeals = allAvailableDeals.filter(deal => 
    !conflictingDeals.some(cd => cd.id === deal.id) &&
    (billAmount === 0 || billAmount >= deal.minimumBill)
  );
  
  // Sort by potential value and return top 3
  return nonConflictingDeals
    .sort((a, b) => b.discountValue - a.discountValue)
    .slice(0, 3);
};