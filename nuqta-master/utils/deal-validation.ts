import { Deal, DealValidationError, DealCalculationResult, AppliedDeal } from '@/types/deals';

/**
 * Validates if a deal can be applied based on various criteria
 */
export const validateDeal = (
  deal: Deal,
  billAmount: number,
  appliedDeals: AppliedDeal[] = [],
  userType?: 'first-time' | 'loyalty' | 'regular'
): DealValidationError[] => {
  const errors: DealValidationError[] = [];

  // Check if deal is active
  if (!deal.isActive) {
    errors.push({
      dealId: deal.id,
      errorType: 'EXPIRED',
      message: 'This deal is no longer active'
    });
  }

  // Check expiry date
  if (new Date() > deal.validUntil) {
    errors.push({
      dealId: deal.id,
      errorType: 'EXPIRED',
      message: 'This deal has expired'
    });
  }

  // Check minimum bill amount
  if (billAmount < deal.minimumBill) {
    errors.push({
      dealId: deal.id,
      errorType: 'MINIMUM_BILL',
      message: `Minimum bill amount of ₹${deal.minimumBill.toLocaleString()} required`
    });
  }

  // Check usage limit
  if (deal.usageLimit && deal.usageCount && deal.usageCount >= deal.usageLimit) {
    errors.push({
      dealId: deal.id,
      errorType: 'USAGE_LIMIT',
      message: 'Usage limit for this deal has been reached'
    });
  }

  // Check if deal is already applied
  const isAlreadyApplied = appliedDeals.some(applied => applied.dealId === deal.id);
  if (isAlreadyApplied) {
    errors.push({
      dealId: deal.id,
      errorType: 'USAGE_LIMIT',
      message: 'This deal is already applied'
    });
  }

  // Check user type restrictions
  if (deal.category === 'first-time' && userType !== 'first-time') {
    errors.push({
      dealId: deal.id,
      errorType: 'PRODUCT_RESTRICTION',
      message: 'This deal is valid for first-time customers only'
    });
  }

  if (deal.category === 'loyalty' && userType !== 'loyalty') {
    errors.push({
      dealId: deal.id,
      errorType: 'PRODUCT_RESTRICTION',
      message: 'This deal is valid for loyalty members only'
    });
  }

  return errors;
};

/**
 * Calculates the discount amount for a given deal
 */
export const calculateDealDiscount = (
  deal: Deal,
  billAmount: number,
  appliedDeals: AppliedDeal[] = []
): DealCalculationResult => {
  const validationErrors = validateDeal(deal, billAmount, appliedDeals);
  
  if (validationErrors.length > 0) {
    return {
      isValid: false,
      discountAmount: 0,
      finalAmount: billAmount,
      errors: validationErrors,
      warnings: []
    };
  }

  let discountAmount = 0;
  const warnings: string[] = [];

  switch (deal.discountType) {
    case 'percentage':
      discountAmount = (billAmount * deal.discountValue) / 100;
      
      // Apply max discount cap if specified
      if (deal.maxDiscount && discountAmount > deal.maxDiscount) {
        discountAmount = deal.maxDiscount;
        warnings.push(`Discount capped at ₹${deal.maxDiscount.toLocaleString()}`);
      }
      break;

    case 'fixed':
      if (deal.category === 'buy-one-get-one') {
        // Special BOGO logic - assume 33% discount on average
        discountAmount = (billAmount * 33) / 100;
        warnings.push('BOGO discount calculated as average savings');
      } else {
        discountAmount = deal.discountValue;
      }
      break;
  }

  // Ensure discount doesn't exceed bill amount
  if (discountAmount > billAmount) {
    discountAmount = billAmount;
    warnings.push('Discount adjusted to not exceed bill amount');
  }

  const finalAmount = Math.max(0, billAmount - discountAmount);

  return {
    isValid: true,
    discountAmount: Math.round(discountAmount),
    finalAmount: Math.round(finalAmount),
    errors: [],
    warnings
  };
};

/**
 * Calculates total discount when multiple deals are applied
 */
export const calculateTotalDiscount = (
  deals: Deal[],
  billAmount: number,
  allowStacking: boolean = false
): DealCalculationResult => {
  if (deals.length === 0) {
    return {
      isValid: true,
      discountAmount: 0,
      finalAmount: billAmount,
      errors: [],
      warnings: []
    };
  }

  if (!allowStacking && deals.length > 1) {
    return {
      isValid: false,
      discountAmount: 0,
      finalAmount: billAmount,
      errors: [{
        dealId: 'multiple',
        errorType: 'STORE_RESTRICTION',
        message: 'Only one deal can be applied at a time'
      }],
      warnings: []
    };
  }

  let totalDiscount = 0;
  let currentBillAmount = billAmount;
  const allErrors: DealValidationError[] = [];
  const allWarnings: string[] = [];

  for (const deal of deals) {
    const result = calculateDealDiscount(deal, currentBillAmount);
    
    if (result.isValid) {
      totalDiscount += result.discountAmount;
      currentBillAmount = result.finalAmount;
      allWarnings.push(...result.warnings);
    } else {
      allErrors.push(...result.errors);
    }
  }

  return {
    isValid: allErrors.length === 0,
    discountAmount: Math.round(totalDiscount),
    finalAmount: Math.round(Math.max(0, billAmount - totalDiscount)),
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * Formats discount amount for display
 */
export const formatDiscountAmount = (amount: number): string => {
  return `₹${amount.toLocaleString()}`;
};

/**
 * Gets user-friendly error message
 */
export const getErrorMessage = (error: DealValidationError): string => {
  return error.message;
};

/**
 * Checks if a deal is eligible for a user
 */
export const isDealEligible = (
  deal: Deal,
  billAmount: number,
  userType?: 'first-time' | 'loyalty' | 'regular'
): boolean => {
  const errors = validateDeal(deal, billAmount, [], userType);
  return errors.length === 0;
};

/**
 * Gets the best deal from available deals for a given bill amount
 */
export const getBestDeal = (
  deals: Deal[],
  billAmount: number,
  userType?: 'first-time' | 'loyalty' | 'regular'
): Deal | null => {
  const eligibleDeals = deals.filter(deal => 
    isDealEligible(deal, billAmount, userType)
  );
  if (eligibleDeals.length === 0) return null;

  // Find deal with maximum discount amount
  let bestDeal = eligibleDeals[0];
  let maxDiscount = calculateDealDiscount(bestDeal, billAmount).discountAmount;

  for (const deal of eligibleDeals.slice(1)) {
    const discount = calculateDealDiscount(deal, billAmount).discountAmount;
    if (discount > maxDiscount) {
      maxDiscount = discount;
      bestDeal = deal;
    }
  }

  return bestDeal;
};