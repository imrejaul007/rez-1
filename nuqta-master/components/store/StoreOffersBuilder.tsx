// @ts-nocheck
// StoreOffersBuilder.tsx - Builds offers array from store data and renders StoreOffersPreview
import React, { useMemo } from 'react';
import { StoreOffersPreview } from '@/app/MainStoreSection';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface StoreOffer {
  id: string;
  type: 'cashback' | 'flat' | 'percentage';
  value: number;
  title: string;
  description?: string;
  code?: string;
  minOrderAmount?: number;
  validTill?: string;
  coinsToEarn?: number;
}

interface StoreOffersBuilderProps {
  storeData: {
    cashback?: number | { percentage?: number };
    offers?: {
      cashback?: number;
      maxCashback?: number;
      minOrderAmount?: number;
      firstOrderDiscount?: number;
      discounts?: any[];
    };
    deliveryCategories?: {
      budgetFriendly?: boolean;
    };
    paymentSettings?: {
      acceptUPI?: boolean;
    };
    [key: string]: unknown;
  };
  storeId: string;
  storeName: string;
  onViewAll: () => void;
  onApplyOffer: (offer: StoreOffer) => void;
}

function StoreOffersBuilder({
  storeData,
  storeId,
  storeName,
  onViewAll,
  onApplyOffer,
}: StoreOffersBuilderProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const offers = useMemo(() => {
    const result: StoreOffer[] = [];
    const cashbackPercent = typeof storeData.cashback === 'number'
      ? storeData.cashback
      : storeData.offers?.cashback || 0;

    // Add cashback offer if available
    if (cashbackPercent > 0) {
      result.push({
        id: 'cashback-offer',
        type: 'cashback',
        value: cashbackPercent,
        title: `Get ${cashbackPercent}% Cashback on all orders`,
        description: storeData.offers?.maxCashback
          ? `Max cashback ${currencySymbol}${storeData.offers.maxCashback}`
          : undefined,
        minOrderAmount: storeData.offers?.minOrderAmount,
        validTill: undefined,
        coinsToEarn: Math.round((storeData.offers?.maxCashback || 100) * 0.05),
      });
    }

    // Add first order offer
    if (storeData.offers?.firstOrderDiscount) {
      const discount = storeData.offers.firstOrderDiscount;
      result.push({
        id: 'first-order',
        type: 'flat',
        value: discount,
        title: `Flat ${currencySymbol}${discount} off on first order`,
        code: 'FIRST' + discount,
        validTill: undefined,
        coinsToEarn: Math.round(discount * 0.05),
      });
    }

    // Add BOGO offer if store has it
    if (storeData.deliveryCategories?.budgetFriendly) {
      result.push({
        id: 'bogo-offer',
        type: 'percentage',
        value: 20,
        title: 'Buy 1 Get 1 Free on select items',
        minOrderAmount: 300,
        validTill: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        coinsToEarn: 25,
      });
    }

    // Add UPI cashback offer
    if (storeData.paymentSettings?.acceptUPI !== false) {
      result.push({
        id: 'upi-cashback',
        type: 'cashback',
        value: 15,
        title: 'Extra 15% Cashback with UPI',
        description: `Max cashback ${currencySymbol}150`,
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        coinsToEarn: Math.round(150 * 0.05),
      });
    }

    return result;
  }, [storeData, currencySymbol]);

  if (offers.length === 0) return null;

  return (
    <StoreOffersPreview
      offers={offers}
      onViewAll={onViewAll}
      onApplyOffer={onApplyOffer}
    />
  );
}

export default React.memo(StoreOffersBuilder);
