/**
 * Calculate estimated savings amount from offer/deal data.
 * Used across OfferTile, search results, and deal sections.
 */
export function calculateSaveAmount(opts: {
  cashbackPercent?: number;
  averageBill?: number;
  originalPrice?: number;
  discountedPrice?: number;
  fixedDiscount?: number;
}): number {
  const { cashbackPercent, averageBill = 500, originalPrice, discountedPrice, fixedDiscount } = opts;

  if (fixedDiscount && fixedDiscount > 0) return Math.round(fixedDiscount);
  if (originalPrice && discountedPrice && originalPrice > discountedPrice) {
    return Math.round(originalPrice - discountedPrice);
  }
  if (cashbackPercent && cashbackPercent > 0) {
    return Math.round((cashbackPercent / 100) * averageBill);
  }
  return 0;
}
