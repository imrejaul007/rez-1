// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { errorReporter } from '@/utils/errorReporter';
import {
  CheckoutPageState,
  CheckoutItem,
  PromoCode,
  PaymentMethod,
  BillSummary,
  CoinSystem,
  UseCheckoutReturn,
  CheckoutDeliveryAddress,
  FulfillmentType,
  FulfillmentOption,
  FulfillmentState,
  FulfillmentDetails,
} from '@/types/checkout.types';
import { CheckoutData } from '@/data/checkoutData';
import cartService from '@/services/cartApi';
import ordersService from '@/services/ordersApi';
import walletApi, { BackendBrandedCoin } from '@/services/walletApi';
import couponService from '@/services/couponApi';
import addressApi from '@/services/addressApi';
import storesApi from '@/services/storesApi';
import { createRazorpayPayment } from '@/services/razorpayApi';
import { mapBackendCartToFrontend, mapFrontendCheckoutToBackendOrder } from '@/utils/dataMappers';
import { showToast } from '@/components/common/ToastManager';
import { useCartActions, useCartState, useGetCurrencySymbol, useWalletData, useRawWalletData, useRefreshWallet, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import {
  TAX_RATE,
  PLATFORM_FEE,
  REZ_COIN_MAX_USAGE_PERCENTAGE,
  PROMO_COIN_MAX_USAGE_PERCENTAGE,
  STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE,
  COIN_CONVERSION_RATE,
} from '@/config/checkout.config';
import analyticsService from '@/services/analyticsService';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import discountsApi from '@/services/discountsApi';
import { queryKeys } from '@/lib/queryKeys';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Helper function to group checkout items by store
interface StoreGroup {
  storeId: string;
  storeName: string;
  items: CheckoutItem[];
  subtotal: number;
}

const groupItemsByStore = (items: CheckoutItem[]): StoreGroup[] => {
  const storeMap = new Map<string, StoreGroup>();

  items.forEach(item => {
    const storeId = item.storeId || 'unknown';
    const storeName = item.storeName || 'Store';

    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        storeId,
        storeName,
        items: [],
        subtotal: 0,
      });
    }

    const group = storeMap.get(storeId)!;
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  });

  return Array.from(storeMap.values());
};

// Helper to distribute coins proportionally across stores
const distributeCoinsProportionally = (
  totalCoins: { rezCoins: number; promoCoins: number; storePromoCoins: number },
  storeGroups: StoreGroup[],
  totalSubtotal: number
): Map<string, { rezCoins: number; promoCoins: number; storePromoCoins: number }> => {
  const distribution = new Map();

  storeGroups.forEach(group => {
    const proportion = totalSubtotal > 0 ? group.subtotal / totalSubtotal : 0;
    distribution.set(group.storeId, {
      rezCoins: Math.floor(totalCoins.rezCoins * proportion),
      promoCoins: Math.floor(totalCoins.promoCoins * proportion),
      // Store promo coins only apply to the specific store
      storePromoCoins: 0, // Will be handled separately per store
    });
  });

  return distribution;
};

export const useCheckout = (retryOrderId?: string): UseCheckoutReturn => {
  const cartActions = useCartActions();
  const cartState = useCartState();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const walletData = useWalletData();
  const walletRawData = useRawWalletData();
  const refreshSharedWallet = useRefreshWallet();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const queryClient = useQueryClient();
  // Refs to access latest wallet data inside async callbacks (avoids stale closure)
  const walletDataRef = useRef(walletData);
  const walletRawDataRef = useRef(walletRawData);
  walletDataRef.current = walletData;
  walletRawDataRef.current = walletRawData;

  const [state, setState] = useState<CheckoutPageState>(CheckoutData.initialState);

  // Initialize checkout data with mounted guard
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    if (authLoading || !isAuthenticated) return;
    initializeCheckout().then(() => { hasInitializedRef.current = true; });
    return () => { isMountedRef.current = false; };
  }, [authLoading, isAuthenticated]);

  // Refresh wallet data when user returns to checkout (e.g., after failed payment or back from address screen)
  useFocusEffect(
    useCallback(() => {
      // Skip on initial mount — initializeCheckout already handles it
      if (!hasInitializedRef.current) return;
      // Refresh wallet in background so coin balances are fresh
      refreshSharedWallet().catch(() => {});
    }, [refreshSharedWallet])
  );

  // Apply card offer from cart context if one was pre-selected
  useEffect(() => {
    if (!state.loading && cartState.appliedCardOffer && !state.appliedCardOffer) {
      // Apply the card offer from cart
      const offer = cartState.appliedCardOffer;
      setState(prev => {
        const orderTotal = prev.billSummary?.totalPayable || 0;
        let discountAmount = 0;

        if (offer.type === 'percentage') {
          discountAmount = Math.round((orderTotal * offer.value) / 100);
          if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
            discountAmount = offer.maxDiscountAmount;
          }
        } else {
          discountAmount = offer.value || 0;
        }

        const newBillSummary = {
          ...prev.billSummary,
          cardOfferDiscount: discountAmount,
          totalPayable: Math.max(0, prev.billSummary.totalPayable - discountAmount),
        };

        devLog.log('💳 [Checkout] Applied card offer from cart:', { offer, discountAmount });

        return {
          ...prev,
          appliedCardOffer: offer,
          billSummary: newBillSummary,
        };
      });
    }
  }, [state.loading, cartState.appliedCardOffer, state.appliedCardOffer]);

  const initializeCheckout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {

      // If retryOrderId is provided, load from the failed order instead of cart
      if (retryOrderId) {
        try {
          const orderResponse = await ordersService.getOrderById(retryOrderId);
          if (orderResponse.success && orderResponse.data) {
            const order = orderResponse.data;

            // Map order items to checkout items
            const checkoutItems: CheckoutItem[] = (order.items || []).map((item: any) => ({
              id: item.id || item._id || item.productId,
              productId: item.productId || item.product?.id || item.product?._id,
              name: item.product?.name || item.name || 'Product',
              image: item.product?.images?.[0]?.url || item.product?.images?.[0] || '',
              price: item.unitPrice || item.totalPrice / (item.quantity || 1),
              originalPrice: item.unitPrice || item.totalPrice / (item.quantity || 1),
              quantity: item.quantity || 1,
              discount: 0,
              category: '',
              storeId: typeof order.store === 'object' ? (order.store?._id || order.store?.id || '') : (order.store || ''),
              storeName: typeof order.store === 'object' ? (order.store?.name || 'Store') : 'Store',
            }));

            // Set delivery address from order
            const orderAddr = order.delivery?.address;
            let selectedAddress: CheckoutDeliveryAddress | undefined;
            if (orderAddr) {
              selectedAddress = {
                id: 'order-address',
                name: orderAddr.name || orderAddr.addressType || 'Address',
                phone: orderAddr.phone || '',
                addressLine1: orderAddr.addressLine1,
                addressLine2: orderAddr.addressLine2,
                city: orderAddr.city,
                state: orderAddr.state,
                pincode: orderAddr.pincode || (orderAddr as any).postalCode,
                country: orderAddr.country || 'India',
                type: orderAddr.addressType ? (orderAddr.addressType.toUpperCase() as 'HOME' | 'OFFICE' | 'OTHER') : undefined,
                isDefault: false,
              };
            }

            // Calculate bill summary from order totals
            const totals = order.totals || order.summary;
            const itemTotal = totals?.subtotal || checkoutItems.reduce((t, i) => t + i.price * i.quantity, 0);
            const taxes = totals?.tax || Math.round(itemTotal * TAX_RATE);
            const deliveryFee = totals?.delivery || (totals as any)?.shipping || 0;

            const billSummary: BillSummary = {
              itemTotal,
              getAndItemTotal: 0,
              deliveryFee,
              platformFee: 0,
              taxes,
              promoDiscount: totals?.discount || 0,
              lockFeeDiscount: totals?.lockFeeDiscount || 0,
              coinDiscount: 0,
              cardOfferDiscount: 0,
              roundOff: 0,
              totalBeforeCoinDiscount: Math.max(0, itemTotal + deliveryFee + taxes - (totals?.discount || 0)),
              totalPayable: totals?.total || Math.max(0, itemTotal + deliveryFee + taxes - (totals?.discount || 0)),
              cashbackEarned: totals?.cashback || 0,
              savings: totals?.discount || 0,
            };

            const storeId = checkoutItems[0]?.storeId || '';
            const mockData = await CheckoutData.api.initializeCheckout();

            if (!isMountedRef.current) return;
            setState(prev => ({
              ...prev,
              items: checkoutItems,
              store: { id: storeId, name: checkoutItems[0]?.storeName || 'Store', distance: '', deliveryFee, minimumOrder: 0, estimatedDelivery: '30-45 min' },
              billSummary,
              selectedAddress,
              availablePaymentMethods: mockData.paymentMethods,
              recentPaymentMethods: mockData.paymentMethods.filter((m: any) => m.isRecent),
              loading: false,
            }));
            return;
          }
        } catch (orderError) {
          devLog.warn('⚠️ [Checkout] Failed to load retry order, falling back to cart:', orderError);
        }
      }

      // Try to load from cart API first
      try {
        const cartResponse = await cartService.getCart();

        if (cartResponse.success && cartResponse.data) {

          const mappedCart = mapBackendCartToFrontend(cartResponse.data);

          // Convert cart items to checkout items format
          const checkoutItems: CheckoutItem[] = mappedCart.items.map((item: any) => ({
            id: item.id,
            productId: item.productId, // Keep product ID for order creation
            name: item.name,
            image: item.image,
            price: item.price,
            originalPrice: item.originalPrice,
            quantity: item.quantity,
            discount: item.discount || 0, // Lock fee already paid (only for items with lockedQuantity > 0)
            lockedQuantity: item.lockedQuantity || 0, // How many items have lock fee applied
            category: item.category || '',
            storeId: item.store?.id || '',
            storeName: item.store?.name || '',
          }));

          // Get bill summary from cart totals - Map to correct BillSummary structure
          // Calculate itemTotal from actual cart items (full price before lock fee)
          const itemTotalBeforeLockFee = checkoutItems.reduce((total, item) => total + (item.price * item.quantity), 0);
          // Calculate total lock fee already paid across all items
          // IMPORTANT: Only count discount as lock fee if item has lockedQuantity > 0
          // Regular sale discounts (originalPrice > price) are NOT lock fees
          const lockFeeDiscount = checkoutItems.reduce((total, item) => {
            const lockedQty = (item as any).lockedQuantity || 0;
            // Only count as lock fee if item was actually locked
            return total + (lockedQty > 0 ? (item.discount || 0) : 0);
          }, 0);
          // Item total shown in bill = full price (lock fee shown as separate deduction)
          const itemTotal = itemTotalBeforeLockFee;
          const getAndItemTotal = 0; // Removed - was duplicating taxes
          const deliveryFee = mappedCart.totals.delivery || mappedCart.totals.shipping || 0;
          // Note: platformFee is NOT charged to customers - it's deducted from merchant payouts
          // Setting to 0 in customer-facing calculations to match backend
          const platformFee = 0;
          // Always calculate taxes locally (5% of item total after lock fee) - don't rely on backend
          const taxes = Math.round((itemTotal - lockFeeDiscount) * TAX_RATE);
          const promoDiscount = mappedCart.totals.discount || 0;
          const coinDiscount = 0; // Will be calculated when coins are toggled

          // Debug: Log the values
          devLog.log('💰 [Checkout] Bill calculation:', {
            itemTotal,
            lockFeeDiscount,
            deliveryFee,
            platformFee,
            taxes,
            promoDiscount,
            backendTax: mappedCart.totals.tax,
            backendTotal: mappedCart.totals.total,
          });

          // Calculate total before coin discount (for slider max calculation)
          const totalBeforeCoinDiscount = Math.max(0, itemTotal + getAndItemTotal + deliveryFee + platformFee + taxes - lockFeeDiscount - promoDiscount);

          // Always calculate total payable from our values to ensure consistency
          let totalPayable = totalBeforeCoinDiscount - coinDiscount;

          // Calculate round off to nearest rupee
          const roundOff = Math.round(totalPayable) - totalPayable;
          totalPayable = Math.max(0, Math.round(totalPayable));

          // Calculate savings from actual cart items (originalPrice - price) * quantity
          const calculatedSavings = checkoutItems.reduce((total, item) => {
            const originalPrice = item.originalPrice || item.price;
            const savings = (originalPrice - item.price) * item.quantity;
            return total + Math.max(0, savings);
          }, 0);

          const billSummary: BillSummary = {
            itemTotal,
            getAndItemTotal,
            deliveryFee,
            platformFee,
            taxes,
            promoDiscount,
            lockFeeDiscount,
            coinDiscount,
            cardOfferDiscount: 0, // Will be calculated when card offer is applied
            roundOff,
            totalBeforeCoinDiscount,
            totalPayable,
            cashbackEarned: Math.round((mappedCart.totals.cashback || 0)),
            savings: (calculatedSavings || promoDiscount) + lockFeeDiscount,
          };

          // Get promo code from cart
          const appliedPromoCode: PromoCode | undefined = mappedCart.coupon ? {
            id: mappedCart.coupon.code, // Using code as id since we don't have the actual id
            code: mappedCart.coupon.code,
            title: mappedCart.coupon.code,
            description: `${mappedCart.coupon.discountValue}% off`,
            discountType: mappedCart.coupon.discountType || 'PERCENTAGE',
            discountValue: mappedCart.coupon.discountValue,
            maxDiscount: mappedCart.coupon.appliedAmount,
            minOrderValue: 0,
            validUntil: '',
            isActive: true,
            termsAndConditions: [],
          } : undefined;

          // NEW: Fetch real wallet data
          // Note: Backend uses 'rez' coins, frontend displays as 'nuqta' coins
          let realCoinSystem: CoinSystem = {
            nuqtaCoin: {
              available: 0,
              used: 0,
              conversionRate: COIN_CONVERSION_RATE,
              maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
            },
            promoCoin: {
              available: 0,
              used: 0,
              conversionRate: COIN_CONVERSION_RATE,
              maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
            },
            storePromoCoin: {
              available: 0,
              used: 0,
              conversionRate: COIN_CONVERSION_RATE,
              maxUsagePercentage: STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE // Store promo coins limited to 30% of order value
            }
          };

          // Build real store data from cart items
          const firstItem = checkoutItems[0];
          let realStore: any = {
            id: firstItem?.storeId || '',
            name: firstItem?.storeName || 'Store',
            distance: '', // Will be fetched from store API
            deliveryFee: deliveryFee,
            minimumOrder: 0,
            estimatedDelivery: '30-45 min',
            categorySlug: '', // Root MainCategory slug for category-specific coins
          };

          let fulfillmentState: FulfillmentState = {
            selectedType: 'delivery',
            availableTypes: [
              { type: 'delivery', label: 'Delivery', icon: 'bicycle-outline', description: 'Deliver to your address', enabled: true, estimatedTime: '30-45 min' },
            ],
          };

          // Fire all independent API calls in parallel for faster checkout initialization.
          // Uses queryClient.fetchQuery for addresses, coupons, and store so results
          // are cached and deduplicated across re-renders / re-mounts.
          const [
            walletRefreshResult,
            couponsResult,
            storeResult,
            mockDataResult,
            addressResult,
          ] = await Promise.allSettled([
            // 1. Refresh wallet context
            refreshSharedWallet(),
            // 2. Fetch available coupons (cached via react-query)
            queryClient.fetchQuery({
              queryKey: queryKeys.checkout.coupons(),
              queryFn: () => couponService.getAvailableCoupons(),
            }),
            // 3. Fetch store details (cached via react-query, only if storeId exists)
            firstItem?.storeId
              ? queryClient.fetchQuery({
                  queryKey: queryKeys.checkout.store(firstItem.storeId),
                  queryFn: () => storesApi.getStoreById(firstItem.storeId),
                  staleTime: 2 * 60_000,
                })
              : Promise.resolve(null),
            // 4. Fetch mock payment methods
            CheckoutData.api.initializeCheckout(),
            // 5. Fetch user addresses (cached via react-query, 5min staleTime)
            queryClient.fetchQuery({
              queryKey: queryKeys.checkout.addresses(),
              queryFn: () => addressApi.getUserAddresses(),
              staleTime: 5 * 60_000,
            }),
          ]);

          // Process wallet refresh result
          let walletCategoryBalances: Record<string, any> | null = null;
          if (walletRefreshResult.status === 'rejected') {
            devLog.error('💳 [Checkout] Failed to refresh wallet, using cached balance:', walletRefreshResult.reason);
          }

          // Read wallet data from shared WalletContext (via refs for fresh values after refresh)
          try {
            const storeId = checkoutItems[0]?.storeId;
            const currentWalletData = walletDataRef.current;
            const currentWalletRawData = walletRawDataRef.current;
            walletCategoryBalances = (currentWalletRawData as any)?.categoryBalances || null;

            if (currentWalletData) {
              const rezCoin = currentWalletData.coins.find((c) => c.type === 'rez');
              const promoCoin = currentWalletData.coins.find((c) => c.type === 'promo');

              // Find branded coins for this specific store (store-specific coins)
              const brandedCoins = currentWalletData.brandedCoins || [];
              const storeBrandedCoin = storeId
                ? brandedCoins.find((bc: BackendBrandedCoin) => bc.merchantId === storeId)
                : null;

              // Global ReZ coin balance (may be overridden later with category-specific balance)
              const nuqtaAvailable = rezCoin?.amount || 0;

              realCoinSystem = {
                ...realCoinSystem,
                nuqtaCoin: {
                  available: nuqtaAvailable,
                  used: 0,
                  conversionRate: COIN_CONVERSION_RATE,
                  maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
                },
                promoCoin: {
                  available: promoCoin?.amount || 0,
                  used: 0,
                  conversionRate: COIN_CONVERSION_RATE,
                  maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
                },
                storePromoCoin: {
                  available: storeBrandedCoin?.amount || 0,
                  used: 0,
                  conversionRate: COIN_CONVERSION_RATE,
                  maxUsagePercentage: STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE,
                  storeId: storeId,
                  storeName: storeBrandedCoin?.merchantName,
                  storeColor: storeBrandedCoin?.merchantColor,
                }
              };

              devLog.log('💰 [Checkout] Wallet coins loaded from context:', {
                nuqtaCoins: realCoinSystem.nuqtaCoin.available,
                promoCoins: realCoinSystem.promoCoin.available,
                brandedCoinsAvailable: realCoinSystem.storePromoCoin?.available || 0,
                storeName: storeBrandedCoin?.merchantName,
                currentStoreId: storeId,
                allBrandedCoins: brandedCoins.map((bc: BackendBrandedCoin) => ({
                  merchantId: bc.merchantId,
                  merchantName: bc.merchantName,
                  amount: bc.amount
                })),
                matchFound: !!storeBrandedCoin
              });
            }
          } catch (walletError) {
            devLog.error('💳 [Checkout] Failed to read wallet context, using 0 balance:', walletError);
          }

          // Process coupons result
          let realAvailableCoupons: PromoCode[] = [];
          if (couponsResult.status === 'fulfilled' && couponsResult.value) {
            const couponsResponse = couponsResult.value;
            if (couponsResponse.success && couponsResponse.data) {
              realAvailableCoupons = couponsResponse.data.coupons.map((coupon: any) => ({
                id: coupon._id,
                code: coupon.couponCode,
                title: coupon.title || coupon.couponCode,
                description: coupon.description || `Get discount on your order`,
                discountValue: coupon.discountValue,
                discountType: coupon.discountType,
                minOrderValue: coupon.minOrderValue,
                maxDiscount: coupon.maxDiscountCap || 0,
                isActive: coupon.status === 'active',
                validUntil: coupon.validTo,
                termsAndConditions: coupon.termsAndConditions || [],
              }));
            }
          } else if (couponsResult.status === 'rejected') {
            devLog.error('💳 [Checkout] Failed to load coupons:', couponsResult.reason);
          }

          // Process store details result
          if (storeResult.status === 'fulfilled' && storeResult.value) {
            const storeResponse = storeResult.value;
            if (storeResponse.success && storeResponse.data) {
              const storeData = storeResponse.data;
              realStore = {
                ...realStore,
                name: storeData.name || realStore.name,
                minimumOrder: (storeData as any).minimumOrder || (storeData as any).settings?.minimumOrder || 0,
                estimatedDelivery: (storeData as any).estimatedDelivery || (storeData as any).deliveryTime || '30-45 min',
                distance: (storeData as any).distance || '',
                categorySlug: (storeData as any).mainCategorySlug || '',
              };

              // Build fulfillment options from serviceCapabilities
              const caps = (storeData as any).serviceCapabilities;
              if (caps) {
                const types: FulfillmentOption[] = [];
                if (caps.homeDelivery?.enabled) {
                  types.push({ type: 'delivery', label: 'Delivery', icon: 'bicycle-outline', description: 'Deliver to your address', enabled: true, estimatedTime: caps.homeDelivery.estimatedTime || '30-45 min' });
                }
                if (caps.storePickup?.enabled) {
                  types.push({ type: 'pickup', label: 'Pickup', icon: 'bag-handle-outline', description: 'Pick up at store', enabled: true, estimatedTime: caps.storePickup.estimatedTime || '15-20 min' });
                }
                if (caps.driveThru?.enabled) {
                  types.push({ type: 'drive_thru', label: 'Drive-Thru', icon: 'car-outline', description: 'Order from your car', enabled: true, estimatedTime: caps.driveThru.estimatedTime || '5-10 min' });
                }
                if (caps.dineIn?.enabled) {
                  types.push({ type: 'dine_in', label: 'Dine-In', icon: 'restaurant-outline', description: 'Eat at the restaurant', enabled: true });
                }
                if (types.length > 0) {
                  fulfillmentState = {
                    selectedType: types[0].type,
                    availableTypes: types,
                  };
                }
              }
            }
          } else if (storeResult.status === 'rejected') {
            devLog.warn('Failed to fetch store details, using defaults:', storeResult.reason);
          }

          // Override nuqta coin balance with category-specific amount if available
          if (realStore?.categorySlug && walletCategoryBalances) {
            const catBal = walletCategoryBalances[realStore.categorySlug];
            if (catBal && catBal.available > 0) {
              realCoinSystem.nuqtaCoin.available = catBal.available;
              devLog.log('💰 [Checkout] Category coin balance applied:', realStore.categorySlug, catBal.available);
            }
          }

          // Process mock data result (payment methods)
          const mockData = mockDataResult.status === 'fulfilled' ? mockDataResult.value : await CheckoutData.api.initializeCheckout();

          // Process address result
          let userAddresses: CheckoutDeliveryAddress[] = [];
          let defaultAddress: CheckoutDeliveryAddress | undefined;
          if (addressResult.status === 'fulfilled' && addressResult.value) {
            const addressResponse = addressResult.value;
            devLog.log('📍 [Checkout] Address response:', addressResponse);

            if (addressResponse.success && addressResponse.data) {
              userAddresses = addressResponse.data.map((addr: any) => ({
                id: addr.id || addr._id,
                name: addr.title || addr.type || 'Address',
                phone: addr.phone || '', // Will need to be filled by user or fetched from profile
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                city: addr.city,
                state: addr.state,
                pincode: addr.postalCode || addr.pincode,
                country: addr.country || 'India',
                type: addr.type,
                isDefault: addr.isDefault,
                instructions: addr.instructions,
              }));
              // Priority: last-used from recent order > isDefault > first
              // Note: This call depends on userAddresses so it stays sequential
              let lastUsedAddress: CheckoutDeliveryAddress | undefined;
              try {
                const recentOrder = await ordersService.getOrders({ page: 1, limit: 1, status: 'delivered' });
                const lastAddr = recentOrder.data?.orders?.[0]?.delivery?.address;
                if (lastAddr) {
                  lastUsedAddress = userAddresses.find(addr =>
                    addr.addressLine1 === lastAddr.addressLine1 &&
                    addr.pincode === (lastAddr.pincode || (lastAddr as any).postalCode)
                  );
                }
              } catch (err) {
                errorReporter.captureError(
                  err instanceof Error ? err : new Error('Failed to fetch recent order for address'),
                  { context: 'useCheckout.loadAddresses' },
                  'info'
                );
              } // Non-critical — fallback to default
              defaultAddress = lastUsedAddress || userAddresses.find(addr => addr.isDefault) || userAddresses[0];
              devLog.log('📍 [Checkout] Addresses loaded:', {
                total: userAddresses.length,
                defaultAddress: defaultAddress?.addressLine1 || 'none',
                lastUsedMatch: !!lastUsedAddress,
              });
            }
          } else if (addressResult.status === 'rejected') {
            devLog.error('📍 [Checkout] Failed to load addresses:', addressResult.reason);
          }

          // Adjust delivery fee for non-delivery fulfillment
          let adjustedBillSummary = billSummary;
          if (fulfillmentState.selectedType !== 'delivery') {
            const noDeliveryTotal = Math.max(0, billSummary.totalPayable - billSummary.deliveryFee);
            adjustedBillSummary = {
              ...billSummary,
              deliveryFee: 0,
              totalBeforeCoinDiscount: billSummary.totalBeforeCoinDiscount - billSummary.deliveryFee,
              totalPayable: noDeliveryTotal,
            };
          }

          if (!isMountedRef.current) return;
          setState(prev => ({
            ...prev,
            items: checkoutItems,
            store: realStore,
            fulfillment: fulfillmentState,
            billSummary: adjustedBillSummary,
            selectedAddress: defaultAddress,
            availableAddresses: userAddresses,
            appliedPromoCode,
            availablePromoCodes: realAvailableCoupons,
            coinSystem: realCoinSystem,
            availablePaymentMethods: mockData.paymentMethods,
            recentPaymentMethods: mockData.paymentMethods.filter(m => m.isRecent),
            showAddressSection: fulfillmentState.selectedType === 'delivery',
            loading: false,
          }));

          // Track begin_checkout event
          try { analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, { item_count: checkoutItems.length, cart_value: adjustedBillSummary.itemTotal, store_id: realStore.id }); } catch {} // Silent: non-critical analytics

          return;
        }
      } catch (apiError) {
        devLog.warn('⚠️ [Checkout] Failed to load checkout data from API, using fallback:', apiError);
      }

      // Fallback to mock data + real wallet
      // Note: Backend uses 'rez' coins, frontend displays as 'nuqta' coins
      let realCoinSystem: CoinSystem = {
        nuqtaCoin: {
          available: 0,
          used: 0,
          conversionRate: COIN_CONVERSION_RATE,
          maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
        },
        promoCoin: {
          available: 0,
          used: 0,
          conversionRate: COIN_CONVERSION_RATE,
          maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
        },
        storePromoCoin: {
          available: 0,
          used: 0,
          conversionRate: COIN_CONVERSION_RATE,
          maxUsagePercentage: STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE
        }
      };

      // Read wallet data from shared WalletContext (already refreshed above)
      try {
        devLog.log('💳 [Checkout] Reading wallet balance from context (fallback)...');
        const currentWalletData = walletDataRef.current;
        const currentWalletRawData = walletRawDataRef.current;

        if (currentWalletData) {
          const rezCoin = currentWalletData.coins.find((c) => c.type === 'rez');
          const promoCoin = currentWalletData.coins.find((c) => c.type === 'promo');

          // Check for category-specific balance (fallback path)
          const fallbackCategoryBalances = (currentWalletRawData as any)?.categoryBalances;
          const fallbackCatSlug = (state as any)?.store?.categorySlug;
          const fallbackCatBal = fallbackCatSlug && fallbackCategoryBalances ? fallbackCategoryBalances[fallbackCatSlug] : null;
          const fallbackNuqtaAvailable = fallbackCatBal?.available ?? (rezCoin?.amount || 0);

          realCoinSystem = {
            ...realCoinSystem,
            nuqtaCoin: {
              available: fallbackNuqtaAvailable,
              used: 0,
              conversionRate: COIN_CONVERSION_RATE,
              maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
            },
            promoCoin: {
              available: promoCoin?.amount || 0,
              used: 0,
              conversionRate: COIN_CONVERSION_RATE,
              maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
            }
          };

          devLog.log('💳 [Checkout] Loaded wallet coins from context:', {
            nuqta: realCoinSystem.nuqtaCoin.available,
            promo: realCoinSystem.promoCoin.available,
            categoryBalance: fallbackCatBal
          });
        }
      } catch (walletError) {
        devLog.error('💳 [Checkout] Failed to read wallet context (fallback), using 0 balance:', walletError);
      }
      
      // Fetch store promo coins for this store (fallback)
      try {
        // For fallback, we might not have checkoutStore, but we can try from state or mock data
        devLog.log('💎 [Checkout] Skipping store promo coins in fallback mode');
        // Note: In fallback mode, store ID might not be available yet
      } catch (storeCoinsError) {
        devLog.error('💎 [Checkout] Failed to load store promo coins (fallback):', storeCoinsError);
      }

      // Fire independent fallback API calls in parallel (coupons cached via react-query)
      const [fallbackCouponsResult, fallbackMockResult] = await Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: queryKeys.checkout.coupons(),
          queryFn: () => couponService.getAvailableCoupons(),
        }),
        CheckoutData.api.initializeCheckout(),
      ]);

      let realAvailableCoupons: PromoCode[] = [];
      if (fallbackCouponsResult.status === 'fulfilled' && fallbackCouponsResult.value) {
        const couponsResponse = fallbackCouponsResult.value;
        if (couponsResponse.success && couponsResponse.data) {
          realAvailableCoupons = couponsResponse.data.coupons.map((coupon: any) => ({
            id: coupon._id,
            code: coupon.couponCode,
            title: coupon.title || coupon.couponCode,
            description: coupon.description || `Get discount on your order`,
            discountValue: coupon.discountValue,
            discountType: coupon.discountType,
            minOrderValue: coupon.minOrderValue,
            maxDiscount: coupon.maxDiscountCap || 0,
            isActive: coupon.status === 'active',
            validUntil: coupon.validTo,
            termsAndConditions: coupon.termsAndConditions || [],
          }));
          devLog.log('💳 [Checkout] Loaded coupons (fallback)');
        }
      } else if (fallbackCouponsResult.status === 'rejected') {
        devLog.error('💳 [Checkout] Failed to load coupons (fallback):', fallbackCouponsResult.reason);
      }

      const data = fallbackMockResult.status === 'fulfilled' ? fallbackMockResult.value : await CheckoutData.api.initializeCheckout();
      if (!isMountedRef.current) return;
      setState(prev => ({
        ...prev,
        items: data.items,
        store: data.store,
        billSummary: data.billSummary,
        availablePromoCodes: realAvailableCoupons,
        coinSystem: realCoinSystem,
        availablePaymentMethods: data.paymentMethods,
        recentPaymentMethods: data.paymentMethods.filter(m => m.isRecent),
        loading: false,
      }));
    } catch (_error) {
      if (!isMountedRef.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to initialize checkout',
      }));
    }
  }, []);

  const updateBillSummary = useCallback(() => {
    const coinUsage = {
      rez: state.coinSystem.nuqtaCoin.used,
      promo: state.coinSystem.promoCoin.used,
    };
    
    const newBillSummary = CheckoutData.helpers.calculateBillSummary(
      state.items,
      state.store,
      state.appliedPromoCode,
      coinUsage
    );
    
    setState(prev => ({ ...prev, billSummary: newBillSummary }));
  }, [state.items, state.store, state.appliedPromoCode, state.coinSystem]);

  const applyPromoCode = useCallback(async (code: PromoCode): Promise<{ success: boolean; message: string; discount?: number }> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Prepare cart data for validation - only include non-empty fields
      const cartData = {
        items: state.items.map(item => {
          const cartItem: any = {
            product: item.productId || item.id,
            quantity: item.quantity,
            price: item.price,
          };
          // Only include category and store if they have values
          if (item.category && item.category.trim() !== '') {
            cartItem.category = item.category;
          }
          if (item.storeId && item.storeId.trim() !== '') {
            cartItem.store = item.storeId;
          }
          return cartItem;
        }),
        subtotal: state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
      };

      devLog.log('🎟️ [Checkout] Validating coupon:', code.code, 'with cart data:', cartData);

      const response = await couponService.validateCoupon(code.code, cartData);

      devLog.log('🎟️ [Checkout] Coupon validation response:', response);

      if (response.success && response.data) {
        // Calculate new bill summary with coupon discount
        const coinUsage = {
          rez: state.coinSystem.nuqtaCoin.used,
          promo: state.coinSystem.promoCoin.used,
        };

        const newBillSummary = CheckoutData.helpers.calculateBillSummary(
          state.items,
          state.store,
          code,
          coinUsage
        );

        // Override promo discount with actual backend value and recalculate totalPayable
        newBillSummary.promoDiscount = response.data.discount;
        newBillSummary.savings = (newBillSummary.savings || 0) + response.data.discount;

        // Recalculate totalPayable with promo discount and lock fee
        const subtotal = newBillSummary.itemTotal + newBillSummary.getAndItemTotal;
        const totalBeforeDiscount = subtotal + newBillSummary.platformFee + newBillSummary.deliveryFee + newBillSummary.taxes;
        const totalAfterDiscount = totalBeforeDiscount - (newBillSummary.lockFeeDiscount || 0) - response.data.discount - coinUsage.rez - coinUsage.promo;
        newBillSummary.totalPayable = Math.max(0, Math.round(totalAfterDiscount));

        devLog.log('🎟️ [Checkout] New bill summary after coupon:', newBillSummary);
        devLog.log('🎟️ [Checkout] Setting state with appliedPromoCode:', code);
        devLog.log('🎟️ [Checkout] Setting state with billSummary:', newBillSummary);

        setState(prev => {
          devLog.log('🎟️ [Checkout] Previous state:', { appliedPromoCode: prev.appliedPromoCode, billSummary: prev.billSummary });
          const newState = {
            ...prev,
            appliedPromoCode: code,
            billSummary: newBillSummary,
            loading: false,
            showPromoCodeSection: false,
            error: null,
          };
          devLog.log('🎟️ [Checkout] New state:', { appliedPromoCode: newState.appliedPromoCode, billSummary: newState.billSummary });
          return newState;
        });

        return { success: true, message: `${code.code} applied! You save ${currencySymbol}${response.data.discount}`, discount: response.data.discount };
      } else {
        devLog.error('💳 [Checkout] Coupon invalid:', response.message);
        const errorMsg = response.message || 'Invalid coupon code';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, message: errorMsg };
      }
    } catch (error) {
      devLog.error('💳 [Checkout] Coupon validation error:', error);
      const errorMsg = 'Failed to validate coupon';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, message: errorMsg };
    }
  }, [state.items, state.store, state.coinSystem]);

  const removePromoCode = useCallback(() => {
    setState(prev => {
      const coinUsage = {
        rez: prev.coinSystem.nuqtaCoin.used,
        promo: prev.coinSystem.promoCoin.used,
      };
      
      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        undefined,
        coinUsage
      );
      
      return {
        ...prev,
        appliedPromoCode: undefined,
        billSummary: newBillSummary,
        error: null, // Clear any existing errors
      };
    });
  }, []);

  const toggleNuqtaCoin = useCallback((enabled: boolean) => {
    setState(prev => {
      // Check if user has any coins
      if (enabled && prev.coinSystem.nuqtaCoin.available === 0) {

        // Don't toggle if no coins
        return prev;
      }

      // Calculate subtotal before coin discounts with safety checks
      const itemTotal = prev.items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
      }, 0);

      const getAndItemTotal = 0; // Fixed - was duplicating taxes
      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE) || 0;
      const deliveryFee = Number(prev.store.deliveryFee) || 0;
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? Number(prev.appliedPromoCode.discountValue) || 0
          : Math.min(Math.round((itemTotal * (Number(prev.appliedPromoCode.discountValue) || 0)) / 100), Number(prev.appliedPromoCode.maxDiscount) || Infinity)
      ) : 0;

      const subtotalBeforeCoins = Math.max(0, itemTotal + getAndItemTotal + deliveryFee + taxes - promoDiscount);

      // Nuqta coins have 1:1 conversion (1 coin = 1 rupee) and can be used up to available amount
      const coinsToUse = enabled ? Math.min(Number(prev.coinSystem.nuqtaCoin.available) || 0, subtotalBeforeCoins) : 0;

      const newCoinSystem = {
        ...prev.coinSystem,
        nuqtaCoin: {
          ...prev.coinSystem.nuqtaCoin,
          used: coinsToUse,
        },
      };

      const coinUsage = {
        rez: coinsToUse,
        promo: prev.coinSystem.promoCoin.used,
      };
      
      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );
      
      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const togglePromoCoin = useCallback((enabled: boolean) => {
    setState(prev => {
      // Check if user has any promo coins
      if (enabled && prev.coinSystem.promoCoin.available === 0) {

        // Don't toggle if no coins
        return prev;
      }

      // Calculate subtotal before coin discounts
      const itemTotal = prev.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      const getAndItemTotal = 0; // Fixed - was duplicating taxes
      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE);
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? prev.appliedPromoCode.discountValue
          : Math.min(Math.round((itemTotal * prev.appliedPromoCode.discountValue) / 100), prev.appliedPromoCode.maxDiscount || Infinity)
      ) : 0;

      const subtotalAfterNuqtaCoins = itemTotal + getAndItemTotal + prev.store.deliveryFee + taxes - promoDiscount - prev.coinSystem.nuqtaCoin.used;

      // Promo coins have 1:1 conversion and can be used up to configured max percentage of remaining amount or available coins
      const maxPromoUsage = Math.floor(subtotalAfterNuqtaCoins * prev.coinSystem.promoCoin.maxUsagePercentage / 100);
      const coinsToUse = enabled ? Math.min(prev.coinSystem.promoCoin.available, maxPromoUsage, subtotalAfterNuqtaCoins) : 0;

      const newCoinSystem = {
        ...prev.coinSystem,
        promoCoin: {
          ...prev.coinSystem.promoCoin,
          used: coinsToUse,
        },
      };
      
      const coinUsage = {
        rez: prev.coinSystem.nuqtaCoin.used,
        promo: coinsToUse,
      };

      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );

      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const toggleStorePromoCoin = useCallback((enabled: boolean) => {
    setState(prev => {
      // Check if user has any store promo coins
      if (enabled && prev.coinSystem.storePromoCoin.available === 0) {

        return prev;
      }

      // Calculate subtotal before coin discounts
      const itemTotal = prev.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      const getAndItemTotal = 0; // Fixed - was duplicating taxes
      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE);
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? prev.appliedPromoCode.discountValue
          : Math.min(Math.round((itemTotal * prev.appliedPromoCode.discountValue) / 100), prev.appliedPromoCode.maxDiscount || Infinity)
      ) : 0;

      // Calculate remaining after other coins (Nuqta and regular promo)
      const subtotalAfterOtherCoins = itemTotal + getAndItemTotal + prev.store.deliveryFee + taxes - promoDiscount - prev.coinSystem.nuqtaCoin.used - prev.coinSystem.promoCoin.used;

      // Store promo coins can be used up to configured max percentage of remaining amount or available coins
      const maxStorePromoUsage = Math.floor(subtotalAfterOtherCoins * prev.coinSystem.storePromoCoin.maxUsagePercentage / 100);
      const coinsToUse = enabled ? Math.min(prev.coinSystem.storePromoCoin.available, maxStorePromoUsage, subtotalAfterOtherCoins) : 0;

      const newCoinSystem = {
        ...prev.coinSystem,
        storePromoCoin: {
          ...prev.coinSystem.storePromoCoin,
          used: coinsToUse,
        },
      };
      
      const coinUsage = {
        rez: prev.coinSystem.nuqtaCoin.used,
        promo: prev.coinSystem.promoCoin.used,
        storePromo: coinsToUse,
      };

      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );

      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const handleCustomCoinAmount = useCallback((coinType: 'rez' | 'promo' | 'storePromo', amount: number) => {
    devLog.log('🎚️ [handleCustomCoinAmount] Called with:', { coinType, amount });
    setState(prev => {

      const coinSystem = prev.coinSystem;
      const isNuqta = coinType === 'rez';  // 'rez' in handlers maps to nuqtaCoin internally
      const isStorePromo = coinType === 'storePromo';
      const coin = isNuqta ? coinSystem.nuqtaCoin : (isStorePromo ? coinSystem.storePromoCoin : coinSystem.promoCoin);

      devLog.log('🎚️ [handleCustomCoinAmount] Coin state:', { available: coin.available, currentUsed: coin.used });

      // Validate amount
      if (amount <= 0 || amount > coin.available) {
        devLog.log('💳 [Checkout] Invalid coin amount - returning early. amount:', amount, 'available:', coin.available);
        return prev;
      }
      
      // Calculate maximum allowed for order with safety checks
      const itemTotal = prev.items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
      }, 0);

      const getAndItemTotal = 0; // Fixed - was duplicating taxes
      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE) || 0;
      const deliveryFee = Number(prev.store.deliveryFee) || 0;
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? Number(prev.appliedPromoCode.discountValue) || 0
          : Math.min(Math.round((itemTotal * (Number(prev.appliedPromoCode.discountValue) || 0)) / 100), Number(prev.appliedPromoCode.maxDiscount) || Infinity)
      ) : 0;

      let maxAllowed = Math.max(0, itemTotal + getAndItemTotal + deliveryFee + taxes - promoDiscount);

      if (!isNuqta) {
        // For promo/store promo coins, subtract nuqta coins already used
        maxAllowed -= coinSystem.nuqtaCoin.used;

        if (isStorePromo) {
          // Store promo coins: also subtract regular promo coins and apply 30% limit
          maxAllowed -= coinSystem.promoCoin.used;
        }

        // Apply percentage limit
        maxAllowed = Math.floor(maxAllowed * coin.maxUsagePercentage / 100);
      }
      
      // Ensure amount doesn't exceed order total
      const finalAmount = Math.min(amount, maxAllowed, coin.available);

      devLog.log('🎚️ [handleCustomCoinAmount] Final calculation:', {
        requestedAmount: amount,
        maxAllowed,
        available: coin.available,
        finalAmount
      });

      const newCoinSystem = {
        ...coinSystem,
        [isNuqta ? 'nuqtaCoin' : (isStorePromo ? 'storePromoCoin' : 'promoCoin')]: {
          ...coin,
          used: finalAmount,
        },
      };

      devLog.log('🎚️ [handleCustomCoinAmount] ✅ STATE UPDATED - newCoinSystem.nuqtaCoin.used:', newCoinSystem.nuqtaCoin.used);

      const coinUsage = {
        rez: isNuqta ? finalAmount : coinSystem.nuqtaCoin.used,
        promo: (isNuqta || isStorePromo) ? coinSystem.promoCoin.used : finalAmount,
        storePromo: isStorePromo ? finalAmount : (coinSystem.storePromoCoin?.used || 0),
      };
      
      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );
      
      // Ensure promo discount is preserved and totalPayable is recalculated correctly
      if (prev.appliedPromoCode && newBillSummary.promoDiscount > 0) {

      }
      
      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const selectPaymentMethod = useCallback((method: PaymentMethod) => {
    setState(prev => ({ ...prev, selectedPaymentMethod: method }));
  }, []);

  const proceedToPayment = useCallback(async () => {
    setState(prev => ({ ...prev, currentStep: 'payment_methods' }));
    router.push('/payment-methods');
  }, []);

  const navigateToOtherPaymentMethods = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: 'payment_methods' }));
    router.push('/payment-methods');
  }, []);

  // Apply card offer to the checkout
  const applyCardOffer = useCallback((offer: {
    _id: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscountAmount?: number;
    minOrderValue: number;
    cardType?: 'credit' | 'debit' | 'all';
    bankNames?: string[];
    cardBins?: string[];
  }) => {
    setState(prev => {
      // Calculate the discount amount
      const orderTotal = prev.billSummary?.totalPayable || 0;
      let discountAmount = 0;

      if (offer.type === 'percentage') {
        discountAmount = Math.round((orderTotal * offer.value) / 100);
        // Apply max discount cap if present
        if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
          discountAmount = offer.maxDiscountAmount;
        }
      } else {
        discountAmount = offer.value;
      }

      // Map the offer to CardOffer type
      const cardOffer = {
        _id: offer._id,
        name: offer.name,
        type: offer.type,
        value: offer.value,
        maxDiscountAmount: offer.maxDiscountAmount,
        minOrderValue: offer.minOrderValue,
        cardType: offer.cardType,
        bankNames: offer.bankNames,
        cardBins: offer.cardBins,
      };

      // Update bill summary with card offer discount
      const newBillSummary = {
        ...prev.billSummary,
        cardOfferDiscount: discountAmount,
        totalPayable: Math.max(0, prev.billSummary.totalPayable - discountAmount + prev.billSummary.cardOfferDiscount),
      };

      devLog.log('💳 [Checkout] Card offer applied:', { offer: cardOffer, discountAmount, newTotal: newBillSummary.totalPayable });

      return {
        ...prev,
        appliedCardOffer: cardOffer,
        billSummary: newBillSummary,
      };
    });
  }, []);

  // Remove card offer from checkout
  const removeCardOffer = useCallback(() => {
    setState(prev => {
      if (!prev.appliedCardOffer) return prev;

      // Add back the discount that was removed
      const newBillSummary = {
        ...prev.billSummary,
        totalPayable: prev.billSummary.totalPayable + prev.billSummary.cardOfferDiscount,
        cardOfferDiscount: 0,
      };

      devLog.log('💳 [Checkout] Card offer removed, new total:', newBillSummary.totalPayable);

      return {
        ...prev,
        appliedCardOffer: undefined,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const processPayment = useCallback(async () => {
    if (!state.selectedPaymentMethod) {
      setState(prev => ({ ...prev, error: 'Please select a payment method' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {

      // Validate delivery address (required for delivery only)
      if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
        setState(prev => ({ ...prev, loading: false, error: 'Please select a delivery address' }));
        return;
      }

      // Map frontend checkout data to backend order format
      const orderData = mapFrontendCheckoutToBackendOrder({
        deliveryAddress: state.selectedAddress ? {
          name: state.selectedAddress.name,
          phone: state.selectedAddress.phone,
          addressLine1: state.selectedAddress.addressLine1,
          addressLine2: state.selectedAddress.addressLine2,
          city: state.selectedAddress.city,
          state: state.selectedAddress.state,
          pincode: state.selectedAddress.pincode,
          country: state.selectedAddress.country || 'India',
        } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
        paymentMethod: state.selectedPaymentMethod.id as any,
        specialInstructions: state.selectedAddress?.instructions || '',
        couponCode: state.appliedPromoCode?.code,
        fulfillmentType: state.fulfillment.selectedType,
        fulfillmentDetails: {
          tableNumber: state.fulfillment.tableNumber,
          vehicleInfo: state.fulfillment.vehicleInfo,
          pickupInstructions: state.fulfillment.pickupInstructions,
        },
      });

      // Add coinsUsed to order data - map nuqtaCoin back to rezCoins for backend
      const coinsUsed = {
        rezCoins: state.coinSystem.nuqtaCoin.used || 0,  // Frontend nuqtaCoin → Backend rezCoins
        promoCoins: state.coinSystem.promoCoin.used || 0,
        storePromoCoins: state.coinSystem.storePromoCoin.used || 0,
        totalCoinsValue: (state.coinSystem.nuqtaCoin.used || 0) +
          (state.coinSystem.promoCoin.used || 0) +
          (state.coinSystem.storePromoCoin.used || 0)
      };
      (orderData as any).coinsUsed = coinsUsed;

      devLog.log('💰 [Checkout] Sending coinsUsed to backend:', JSON.stringify(coinsUsed));
      devLog.log('💰 [Checkout] Store promo coin state:', JSON.stringify(state.coinSystem.storePromoCoin));

      // Create order via API
      const response = await ordersService.createOrder(orderData);

      if (response.success && response.data) {
        // Debug: Log the order data to trace ID extraction
        devLog.log('✅ [Checkout] Order created successfully:', {
          'response.data.id': response.data.id,
          'response.data._id': response.data._id,
          'orderNumber': response.data.orderNumber,
          'extractedId': response.data.id || response.data._id
        });

        // Clear cart after successful order (both API and context state)
        try {
          await cartService.clearCart();
          await cartActions.clearCart();
        } catch (clearError) {
          devLog.error('💳 [Checkout] Failed to clear cart:', clearError);
        }

        const orderId = response.data.id || response.data._id;
        devLog.log('🔗 [Checkout] Navigating to payment-success with orderId:', orderId);

        // Non-blocking analytics
        try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId, cartValue: state.billSummary.itemTotal, paymentMethod: state.selectedPaymentMethod?.id || '' }); } catch {} // Silent: non-critical analytics

        setState(prev => ({ ...prev, currentStep: 'success', loading: false }));
        router.replace(`/payment-success?orderId=${orderId}`);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Order creation failed',
          currentStep: 'payment_methods',
        }));
      }
    } catch (error) {
      devLog.error('💳 [Checkout] Order creation failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
        currentStep: 'payment_methods',
      }));
    }
  }, [state.selectedPaymentMethod, state.billSummary, state.items, state.store, state.appliedPromoCode, cartActions]);

  /**
   * Handle wallet payment
   * Process payment using wallet coins and create order
   * @param coinValuesOverride - Optional override for coin values to avoid stale closure issues
   * @param redemptionCode - Optional deal redemption code to apply discount
   * @param offerRedemptionCode - Optional cashback voucher code (RED-xxx) to apply
   */
  const handleWalletPayment = useCallback(async (coinValuesOverride?: {
    rezCoins: number;
    promoCoins: number;
    storePromoCoins: number;
    redemptionCode?: string;
    offerRedemptionCode?: string;
  }) => {

    const totalPayable = state.billSummary.totalPayable;

    // Calculate total available balance
    const totalAvailableBalance = state.coinSystem.nuqtaCoin.available + state.coinSystem.promoCoin.available;

    // Calculate coins that will be used (use toggled amounts, or calculate if not toggled)
    const nuqtaCoinsUsed = state.coinSystem.nuqtaCoin.used > 0
      ? state.coinSystem.nuqtaCoin.used
      : Math.min(state.coinSystem.nuqtaCoin.available, totalPayable);

    const remainingAfterNuqta = Math.max(0, totalPayable - nuqtaCoinsUsed);
    const promoCoinsUsed = state.coinSystem.promoCoin.used > 0
      ? state.coinSystem.promoCoin.used
      : Math.min(state.coinSystem.promoCoin.available, remainingAfterNuqta);

    const totalCoinsToUse = nuqtaCoinsUsed + promoCoinsUsed;

    // Validate sufficient balance (check total available, not just used)
    if (totalPayable > 0 && totalAvailableBalance < totalPayable) {
      const shortfall = totalPayable - totalAvailableBalance;
      devLog.error('💳 [Checkout] Insufficient balance:', { shortfall, totalPayable, totalAvailableBalance });
      setState(prev => ({
        ...prev,
        error: `Insufficient balance. You need ${shortfall} more RC to complete this purchase.`
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {
      // Step 1: Process wallet payment

      const paymentData = {
        amount: totalPayable,
        orderId: undefined, // Will be set after order creation
        storeId: state.store.id,
        storeName: state.store.name,
        description: `Purchase of ${state.items.length} item(s) from ${state.store.name}`,
        items: state.items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const walletResponse = await walletApi.processPayment(paymentData);

      if (!walletResponse.success || !walletResponse.data) {
        devLog.error('💳 [Checkout] Wallet payment failed:', walletResponse.error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: walletResponse.error || 'Wallet payment failed',
          currentStep: 'checkout'
        }));
        return;
      }

      // Step 2: Create order with wallet payment method
      // Validate delivery address (required for delivery only)
      if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
        setState(prev => ({ ...prev, loading: false, error: 'Please select a delivery address', currentStep: 'checkout' }));
        return;
      }

      const orderData = mapFrontendCheckoutToBackendOrder({
        deliveryAddress: state.selectedAddress ? {
          name: state.selectedAddress.name,
          phone: state.selectedAddress.phone,
          addressLine1: state.selectedAddress.addressLine1,
          addressLine2: state.selectedAddress.addressLine2,
          city: state.selectedAddress.city,
          state: state.selectedAddress.state,
          pincode: state.selectedAddress.pincode,
          country: state.selectedAddress.country || 'India',
        } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
        paymentMethod: 'wallet',
        specialInstructions: state.selectedAddress?.instructions || '',
        couponCode: state.appliedPromoCode?.code,
        fulfillmentType: state.fulfillment.selectedType,
        fulfillmentDetails: {
          tableNumber: state.fulfillment.tableNumber,
          vehicleInfo: state.fulfillment.vehicleInfo,
          pickupInstructions: state.fulfillment.pickupInstructions,
        },
      });

      // Add redemption code if provided (for deal redemptions)
      if (coinValuesOverride?.redemptionCode) {
        (orderData as any).redemptionCode = coinValuesOverride.redemptionCode;
        devLog.log('👛 [Wallet] Redemption code added to order:', coinValuesOverride.redemptionCode);
      }

      // Add offer redemption code if provided (for cashback vouchers RED-xxx)
      if (coinValuesOverride?.offerRedemptionCode) {
        (orderData as any).offerRedemptionCode = coinValuesOverride.offerRedemptionCode;
        devLog.log('👛 [Wallet] Offer redemption code added to order:', coinValuesOverride.offerRedemptionCode);
      }

      // Add lock fee discount if applicable
      if (state.billSummary?.lockFeeDiscount && state.billSummary.lockFeeDiscount > 0) {
        (orderData as any).lockFeeDiscount = state.billSummary.lockFeeDiscount;
        devLog.log('👛 [Wallet] Lock fee discount added to order:', state.billSummary.lockFeeDiscount);
      }

      // Add coinsUsed to order data - map nuqtaCoin back to rezCoins for backend
      // Use override values if provided (passed from checkout.tsx to avoid stale closure)
      // Ensure all values are numbers (not strings)
      const rezCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.rezCoins) || 0
        : Number(state.coinSystem.nuqtaCoin.used) || 0;
      const promoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.promoCoins) || 0
        : Number(state.coinSystem.promoCoin.used) || 0;
      const storePromoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.storePromoCoins) || 0
        : Number(state.coinSystem.storePromoCoin.used) || 0;

      const coinsUsedData = {
        rezCoins: rezCoinsValue,
        promoCoins: promoCoinsValue,
        storePromoCoins: storePromoCoinsValue,
        totalCoinsValue: rezCoinsValue + promoCoinsValue + storePromoCoinsValue,
      };
      devLog.log('👛 [Wallet] coinsUsed being sent to backend:', JSON.stringify(coinsUsedData));
      (orderData as any).coinsUsed = coinsUsedData;

      const orderResponse = await ordersService.createOrder(orderData);

      if (!orderResponse.success || !orderResponse.data) {
        devLog.error('💳 [Checkout] Order creation failed after payment:', orderResponse.error);

        // CRITICAL: Payment succeeded but order failed - attempt refund
        try {
          devLog.log('💳 [Checkout] Attempting to refund wallet payment...');
          const refundResponse = await walletApi.refundPayment({
            transactionId: walletResponse.data.transaction.transactionId,
            amount: totalPayable,
            reason: 'order_creation_failed',
          });

          if (refundResponse.success) {
            devLog.log('✅ [Checkout] Wallet payment refunded successfully');
            setState(prev => ({
              ...prev,
              loading: false,
              error: 'Order creation failed. Your payment has been refunded.',
              currentStep: 'checkout'
            }));
          } else {
            devLog.error('❌ [Checkout] Refund failed:', refundResponse.error);
            setState(prev => ({
              ...prev,
              loading: false,
              error: 'Order creation failed and refund could not be processed. Please contact support with transaction ID: ' + walletResponse.data!.transaction.transactionId,
              currentStep: 'checkout'
            }));
          }
        } catch (refundError) {
          devLog.error('❌ [Checkout] Refund error:', refundError);
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Order creation failed and refund could not be processed. Please contact support with transaction ID: ' + walletResponse.data!.transaction.transactionId,
            currentStep: 'checkout'
          }));
        }
        return;
      }

      // Step 3: Clear cart (both API and context state)
      try {
        await cartService.clearCart();
        await cartActions.clearCart();
      } catch (clearError) {
        devLog.error('💳 [Checkout] Failed to clear cart:', clearError);
        // Non-critical error, continue
      }

      // Step 4: Navigate to success page
      setState(prev => ({ ...prev, currentStep: 'success', loading: false }));

      const orderId = orderResponse.data.id || orderResponse.data._id;
      const transactionId = walletResponse.data.transaction.transactionId;

      // Non-blocking analytics
      try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId, cartValue: state.billSummary.itemTotal, paymentMethod: 'wallet' }); } catch {} // Silent: non-critical analytics

      router.replace(`/payment-success?orderId=${orderId}&transactionId=${transactionId}&paymentMethod=wallet`);

    } catch (error) {
      devLog.error('💳 [Checkout] Wallet payment error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Wallet payment failed',
        currentStep: 'checkout'
      }));
    }
  }, [state.coinSystem, state.billSummary, state.items, state.store, state.appliedPromoCode, cartActions]);

  /**
   * Handle Cash on Delivery (COD) payment
   * Supports multi-store orders by automatically creating separate orders per store
   * @param coinValuesOverride - Optional override for coin values to avoid stale closure issues
   * @param redemptionCode - Optional deal redemption code to apply discount
   * @param offerRedemptionCode - Optional cashback voucher code (RED-xxx) to apply
   */
  const handleCODPayment = useCallback(async (coinValuesOverride?: {
    rezCoins: number;
    promoCoins: number;
    storePromoCoins: number;
    redemptionCode?: string;
    offerRedemptionCode?: string;
  }) => {
    devLog.log('💵 [COD] handleCODPayment started');
    devLog.log('💵 [COD] coinValuesOverride:', coinValuesOverride);
    devLog.log('💵 [COD] Current state:', {
      selectedAddress: state.selectedAddress,
      items: state.items?.length,
      billSummary: state.billSummary
    });

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {
      // Step 1: Validate delivery address (required for delivery only)
      if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
        devLog.error('💵 [COD] No delivery address selected!');
        setState(prev => ({ ...prev, loading: false, error: 'Please select a delivery address', currentStep: 'checkout' }));
        return;
      }
      devLog.log('💵 [COD] Address validated:', state.selectedAddress?.addressLine1 || 'N/A (non-delivery)');

      // Step 2: Group items by store for multi-store support
      const storeGroups = groupItemsByStore(state.items);
      const isMultiStore = storeGroups.length > 1;
      devLog.log('💵 [COD] Store groups:', storeGroups.length, isMultiStore ? '(MULTI-STORE ORDER)' : '(single store)');

      // Calculate total coins to distribute
      const rezCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.rezCoins) || 0
        : Number(state.coinSystem.nuqtaCoin.used) || 0;
      const promoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.promoCoins) || 0
        : Number(state.coinSystem.promoCoin.used) || 0;
      const storePromoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.storePromoCoins) || 0
        : Number(state.coinSystem.storePromoCoin.used) || 0;

      const totalCoins = { rezCoins: rezCoinsValue, promoCoins: promoCoinsValue, storePromoCoins: storePromoCoinsValue };
      const totalSubtotal = storeGroups.reduce((sum, g) => sum + g.subtotal, 0);

      // Distribute coins proportionally across stores
      const coinsDistribution = distributeCoinsProportionally(totalCoins, storeGroups, totalSubtotal);

      // Create orders for each store
      const createdOrderIds: string[] = [];
      const failedStores: string[] = [];

      for (const storeGroup of storeGroups) {
        devLog.log(`💵 [COD] Creating order for store: ${storeGroup.storeName} (${storeGroup.storeId})`);

        // Get coins for this store
        const storeCoins = coinsDistribution.get(storeGroup.storeId) || { rezCoins: 0, promoCoins: 0, storePromoCoins: 0 };

        // Store promo coins only apply to matching store
        if (storeGroup.storeId === state.coinSystem.storePromoCoin?.storeId) {
          storeCoins.storePromoCoins = storePromoCoinsValue;
        }

        const coinsUsed = {
          rezCoins: storeCoins.rezCoins,
          promoCoins: storeCoins.promoCoins,
          storePromoCoins: storeCoins.storePromoCoins,
          totalCoinsValue: storeCoins.rezCoins + storeCoins.promoCoins + storeCoins.storePromoCoins,
        };

        // Build order data for this store's items with storeId included
        const storeOrderData = mapFrontendCheckoutToBackendOrder({
          deliveryAddress: state.selectedAddress ? {
            name: state.selectedAddress.name,
            phone: state.selectedAddress.phone,
            addressLine1: state.selectedAddress.addressLine1,
            addressLine2: state.selectedAddress.addressLine2,
            city: state.selectedAddress.city,
            state: state.selectedAddress.state,
            pincode: state.selectedAddress.pincode,
            country: state.selectedAddress.country || 'India',
          } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
          paymentMethod: 'cod',
          specialInstructions: state.selectedAddress?.instructions || '',
          couponCode: isMultiStore ? undefined : state.appliedPromoCode?.code,
          storeId: storeGroup.storeId,
          fulfillmentType: state.fulfillment.selectedType,
          fulfillmentDetails: {
            tableNumber: state.fulfillment.tableNumber,
            vehicleInfo: state.fulfillment.vehicleInfo,
            pickupInstructions: state.fulfillment.pickupInstructions,
          },
          items: storeGroup.items.map(item => ({
            product: item.productId || item.id, // Use productId for backend, fallback to id
            quantity: item.quantity,
            price: item.price,
            name: item.name,
          })),
          coinsUsed,
        });

        // DEBUG: Log all values before condition checks
        devLog.log('🔍 [COD DEBUG] Values before adding to order:', {
          'coinValuesOverride': coinValuesOverride,
          'coinValuesOverride?.redemptionCode': coinValuesOverride?.redemptionCode,
          'state.billSummary': state.billSummary,
          'state.billSummary?.lockFeeDiscount': state.billSummary?.lockFeeDiscount,
          'storeGroupIndex': storeGroups.indexOf(storeGroup),
          'isFirstStore': storeGroups.indexOf(storeGroup) === 0,
        });

        // Add redemption code if provided (for deal redemptions) - only for first/single store order
        if (coinValuesOverride?.redemptionCode && storeGroups.indexOf(storeGroup) === 0) {
          (storeOrderData as any).redemptionCode = coinValuesOverride.redemptionCode;
          devLog.log(`💵 [COD] Redemption code added to order for ${storeGroup.storeName}:`, coinValuesOverride.redemptionCode);
        } else {
          devLog.log(`⚠️ [COD] Redemption code NOT added. Reason: redemptionCode=${coinValuesOverride?.redemptionCode}, isFirstStore=${storeGroups.indexOf(storeGroup) === 0}`);
        }

        // Add offer redemption code if provided (for cashback vouchers RED-xxx) - only for first/single store order
        if (coinValuesOverride?.offerRedemptionCode && storeGroups.indexOf(storeGroup) === 0) {
          (storeOrderData as any).offerRedemptionCode = coinValuesOverride.offerRedemptionCode;
          devLog.log(`💵 [COD] Offer redemption code added to order for ${storeGroup.storeName}:`, coinValuesOverride.offerRedemptionCode);
        }

        // Add lock fee discount if applicable - only for first/single store order
        if (state.billSummary?.lockFeeDiscount && state.billSummary.lockFeeDiscount > 0 && storeGroups.indexOf(storeGroup) === 0) {
          (storeOrderData as any).lockFeeDiscount = state.billSummary.lockFeeDiscount;
          devLog.log(`💵 [COD] Lock fee discount added to order for ${storeGroup.storeName}:`, state.billSummary.lockFeeDiscount);
        } else {
          devLog.log(`⚠️ [COD] Lock fee discount NOT added. Reason: lockFeeDiscount=${state.billSummary?.lockFeeDiscount}, isFirstStore=${storeGroups.indexOf(storeGroup) === 0}`);
        }

        devLog.log(`💵 [COD] Store ${storeGroup.storeName} order data:`, {
          storeId: (storeOrderData as any).storeId,
          itemCount: storeGroup.items.length,
          subtotal: storeGroup.subtotal,
          coinsUsed,
          redemptionCode: (storeOrderData as any).redemptionCode,
          lockFeeDiscount: (storeOrderData as any).lockFeeDiscount,
          fullData: JSON.stringify(storeOrderData),
        });

        try {
          const orderResponse = await ordersService.createOrder(storeOrderData);

          if (orderResponse.success && orderResponse.data) {
            // Debug: Log full order response to trace ID extraction
            devLog.log(`✅ [COD] Order response for ${storeGroup.storeName}:`, {
              'data.id': orderResponse.data.id,
              'data._id': orderResponse.data._id,
              'orderNumber': orderResponse.data.orderNumber
            });
            const orderId = orderResponse.data.id || orderResponse.data._id;
            if (!orderId) {
              devLog.error(`❌ [COD] Order created but no ID found for ${storeGroup.storeName}!`, orderResponse.data);
            }
            createdOrderIds.push(orderId);
            devLog.log(`✅ [COD] Order created for ${storeGroup.storeName}: ${orderId}`);
          } else {
            devLog.error(`❌ [COD] Failed to create order for ${storeGroup.storeName}:`, orderResponse.error);
            failedStores.push(storeGroup.storeName);
          }
        } catch (err) {
          devLog.error(`❌ [COD] Error creating order for ${storeGroup.storeName}:`, err);
          failedStores.push(storeGroup.storeName);
        }
      }

      // Check if any orders were created
      if (createdOrderIds.length === 0) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to create any orders. Please try again.',
          currentStep: 'checkout'
        }));
        return;
      }

      // Partial success handling
      if (failedStores.length > 0 && createdOrderIds.length > 0) {
        showToast({
          message: `Orders created for some stores. Failed: ${failedStores.join(', ')}`,
          type: 'warning',
          duration: 5000,
        });
      }

      // Clear cart (both API and context state)
      try {
        await cartService.clearCart();
        await cartActions.clearCart();
      } catch (clearError) {
        devLog.error('💵 [Checkout] Failed to clear cart:', clearError);
      }

      // Navigate to success page
      devLog.log('💵 [COD] Orders created successfully:', createdOrderIds);
      setState(prev => ({ ...prev, currentStep: 'success', loading: false }));

      const transactionId = `COD_${Date.now()}`;
      const orderIdsParam = createdOrderIds.join(',');

      // Non-blocking analytics
      try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId: createdOrderIds[0] || '', cartValue: state.billSummary.itemTotal, paymentMethod: 'cod' }); } catch {} // Silent: non-critical analytics

      router.replace(`/payment-success?orderId=${orderIdsParam}&transactionId=${transactionId}&paymentMethod=cod&multiStore=${isMultiStore}`);

    } catch (error) {
      devLog.error('💵 [Checkout] COD payment error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'COD order creation failed',
        currentStep: 'checkout'
      }));
    }
  }, [state.items, state.store, state.appliedPromoCode, state.coinSystem, state.billSummary, router, cartActions, state.selectedAddress]);

  /**
   * Handle Razorpay payment (UPI, Card, NetBanking, Wallets)
   * Opens Razorpay checkout modal and processes payment
   * @param userInfo - Optional user info for Razorpay
   * @param coinValuesOverride - Optional override for coin values to avoid stale closure issues
   * @param redemptionCode - Optional deal redemption code to apply discount
   * @param offerRedemptionCode - Optional cashback voucher code (RED-xxx) to apply
   */
  const handleRazorpayPayment = useCallback(async (
    userInfo?: { name?: string; email?: string; phone?: string },
    coinValuesOverride?: { rezCoins: number; promoCoins: number; storePromoCoins: number; redemptionCode?: string; offerRedemptionCode?: string }
  ) => {

    // Validate delivery address before initiating payment (required for delivery only)
    if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
      showToast({ message: 'Please select a delivery address', type: 'error' });
      setState(prev => ({ ...prev, showAddressSection: true }));
      return;
    }

    const totalPayable = state.billSummary.totalPayable;

    if (totalPayable <= 0) {
      showToast({ message: 'Invalid order amount', type: 'error' });
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {
      // Calculate coins used - map nuqtaCoin back to rezCoins for backend
      // Use override values if provided (passed from checkout.tsx to avoid stale closure)
      // Ensure all values are numbers (not strings)
      const rezCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.rezCoins) || 0
        : Number(state.coinSystem.nuqtaCoin.used) || 0;
      const promoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.promoCoins) || 0
        : Number(state.coinSystem.promoCoin.used) || 0;
      const storePromoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.storePromoCoins) || 0
        : Number(state.coinSystem.storePromoCoin.used) || 0;

      const coinsUsed = {
        rezCoins: rezCoinsValue,
        promoCoins: promoCoinsValue,
        storePromoCoins: storePromoCoinsValue,
        totalCoinsValue: rezCoinsValue + promoCoinsValue + storePromoCoinsValue,
      };
      devLog.log('💳 [Razorpay] coinsUsed being sent:', JSON.stringify(coinsUsed));

      // Auto-apply card offer if available (will be validated when card is entered in Razorpay)
      // The offer will be applied via the CardOffersSection component or when card is validated
      const appliedCardOffer = (state as any).appliedCardOffer;

      // Create Razorpay payment
      await createRazorpayPayment({
        amount: totalPayable,
        notes: {
          storeId: state.store.id,
          storeName: state.store.name,
          itemCount: state.items.length,
          couponCode: state.appliedPromoCode?.code || '',
          coinsUsed: JSON.stringify(coinsUsed),
          cardOfferId: appliedCardOffer?._id || '',
        },
        userInfo,
        onSuccess: async (paymentResponse) => {

          try {
            // Auto-apply card offer if card payment was used
            let appliedCardOffer = null;
            if (paymentResponse.paymentMethod === 'card' || paymentResponse.paymentMethod?.includes('card')) {
              try {
                const storeId = state.store.id;
                const orderValue = state.billSummary.totalPayable;

                // Get best card offer for this store
                const cardOffersResponse = await discountsApi.getCardOffers({
                  storeId,
                  orderValue,
                  page: 1,
                  limit: 1,
                });

                if (cardOffersResponse.success && cardOffersResponse.data?.discounts?.[0]) {
                  const bestOffer = cardOffersResponse.data.discounts[0];

                  // Validate eligibility
                  if (orderValue >= bestOffer.minOrderValue) {
                    // Apply the offer
                    const applyResponse = await discountsApi.applyCardOffer({
                      discountId: bestOffer._id,
                    });
                    
                    if (applyResponse.success) {
                      appliedCardOffer = bestOffer;
                      devLog.log('✅ [Checkout] Card offer auto-applied:', bestOffer.name);
                    }
                  }
                }
              } catch (err) {
                devLog.error('⚠️ [Checkout] Error auto-applying card offer:', err);
                // Non-critical error, continue with order
              }
            }

            // Create order after successful payment
            const orderData = mapFrontendCheckoutToBackendOrder({
              deliveryAddress: state.selectedAddress ? {
                name: state.selectedAddress.name,
                phone: state.selectedAddress.phone,
                addressLine1: state.selectedAddress.addressLine1,
                addressLine2: state.selectedAddress.addressLine2,
                city: state.selectedAddress.city,
                state: state.selectedAddress.state,
                pincode: state.selectedAddress.pincode,
                country: state.selectedAddress.country || 'India',
              } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
              paymentMethod: 'razorpay',
              specialInstructions: state.selectedAddress?.instructions || '',
              couponCode: state.appliedPromoCode?.code,
              fulfillmentType: state.fulfillment.selectedType,
              fulfillmentDetails: {
                tableNumber: state.fulfillment.tableNumber,
                vehicleInfo: state.fulfillment.vehicleInfo,
                pickupInstructions: state.fulfillment.pickupInstructions,
              },
            });

            // Attach payment and coins info
            (orderData as any).razorpayPaymentId = paymentResponse.paymentId;
            (orderData as any).razorpayOrderId = paymentResponse.orderId;
            (orderData as any).transactionId = paymentResponse.transactionId;
            (orderData as any).coinsUsed = coinsUsed;

            // Add redemption code if provided (for deal redemptions)
            if (coinValuesOverride?.redemptionCode) {
              (orderData as any).redemptionCode = coinValuesOverride.redemptionCode;
              devLog.log('💳 [Razorpay] Redemption code added to order:', coinValuesOverride.redemptionCode);
            }

            // Add offer redemption code if provided (for cashback vouchers RED-xxx)
            if (coinValuesOverride?.offerRedemptionCode) {
              (orderData as any).offerRedemptionCode = coinValuesOverride.offerRedemptionCode;
              devLog.log('💳 [Razorpay] Offer redemption code added to order:', coinValuesOverride.offerRedemptionCode);
            }

            // Add lock fee discount if applicable
            if (state.billSummary?.lockFeeDiscount && state.billSummary.lockFeeDiscount > 0) {
              (orderData as any).lockFeeDiscount = state.billSummary.lockFeeDiscount;
              devLog.log('💳 [Razorpay] Lock fee discount added to order:', state.billSummary.lockFeeDiscount);
            }

            // Attach card offer if applied
            if (appliedCardOffer) {
              (orderData as any).cardOfferId = appliedCardOffer._id;
              const orderTotal = state.billSummary?.totalPayable || 0;
              const discountAmount = appliedCardOffer.type === 'percentage'
                ? Math.round((orderTotal * appliedCardOffer.value) / 100)
                : appliedCardOffer.value;
              (orderData as any).cardOfferDiscount = Math.min(
                discountAmount,
                appliedCardOffer.maxDiscountAmount || discountAmount
              );
            }

            const orderResponse = await ordersService.createOrder(orderData);

            if (!orderResponse.success || !orderResponse.data) {
              devLog.error('❌ [Checkout] Order creation failed after payment:', orderResponse.error);
              showToast({
                message: 'Payment successful but order creation failed. Please contact support.',
                type: 'error',
              });
              setState(prev => ({
                ...prev,
                loading: false,
                error: 'Order creation failed. Please contact support.',
                currentStep: 'checkout',
              }));
              return;
            }

            // Clear cart (both API and context state)
            try {
              await cartService.clearCart();
              await cartActions.clearCart();
            } catch (clearError) {
              devLog.error('⚠️ [Checkout] Failed to clear cart:', clearError);
              // Non-critical error
            }

            // Navigate to success page
            setState(prev => ({ ...prev, currentStep: 'success', loading: false }));

            const orderId = orderResponse.data.id || orderResponse.data._id;
            showToast({ message: 'Payment successful! Order placed', type: 'success' });

            // Non-blocking analytics
            try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId, cartValue: state.billSummary.itemTotal, paymentMethod: 'razorpay' }); } catch {} // Silent: non-critical analytics

            router.replace(
              `/payment-success?orderId=${orderId}&transactionId=${paymentResponse.transactionId}&paymentMethod=razorpay`
            );
          } catch (error) {
            devLog.error('❌ [Checkout] Post-payment error:', error);
            showToast({
              message: error instanceof Error ? error.message : 'Order creation failed',
              type: 'error',
            });
            setState(prev => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error.message : 'Order creation failed',
              currentStep: 'checkout',
            }));
          }
        },
        onError: (error) => {
          devLog.error('❌ [Checkout] Razorpay payment error:', error);
          showToast({
            message: error.message || 'Payment failed',
            type: 'error',
          });
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message || 'Payment failed',
            currentStep: 'checkout',
          }));
        },
      });
    } catch (error) {
      devLog.error('❌ [Checkout] Razorpay initialization error:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to initialize payment',
        type: 'error',
      });
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize payment',
        currentStep: 'checkout',
      }));
    }
  }, [state.billSummary, state.items, state.store, state.appliedPromoCode, state.coinSystem, router, cartActions]);

  // Handler functions for components
  const handlePromoCodeApply = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    // First try to find in available promo codes
    const existingPromo = state.availablePromoCodes.find(p => p.code === code && p.isActive);

    const itemTotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);

    if (existingPromo) {
      // Check minimum order value
      if (itemTotal < existingPromo.minOrderValue) {
        const errorMsg = `Minimum order value ${currencySymbol}${existingPromo.minOrderValue} required for ${code}`;
        setState(prev => ({ ...prev, error: errorMsg }));
        return { success: false, message: errorMsg };
      }

      // Apply the promo code and return its result
      const result = await applyPromoCode(existingPromo);
      return result;
    } else {
      // Code not in available list - try to validate with backend anyway
      // Create a temporary promo code object
      const tempPromoCode: PromoCode = {
        id: code,
        code: code,
        title: code,
        description: 'Promo code',
        discountType: 'PERCENTAGE', // Will be updated from backend response
        discountValue: 0, // Will be updated from backend response
        maxDiscount: 0,
        minOrderValue: 0,
        validUntil: '',
        isActive: true,
        termsAndConditions: [],
      };

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Prepare cart data for validation - only include non-empty fields
        const cartData = {
          items: state.items.map(item => {
            const cartItem: any = {
              product: item.productId || item.id,
              quantity: item.quantity,
              price: item.price,
            };
            // Only include category and store if they have values
            if (item.category && item.category.trim() !== '') {
              cartItem.category = item.category;
            }
            if (item.storeId && item.storeId.trim() !== '') {
              cartItem.store = item.storeId;
            }
            return cartItem;
          }),
          subtotal: itemTotal,
        };

        const response = await couponService.validateCoupon(code, cartData);

        if (response.success && response.data) {
          // Update promo code with backend values
          tempPromoCode.discountType = response.data.coupon.type;
          tempPromoCode.discountValue = response.data.coupon.value;

          // Calculate new bill summary with coupon discount
          const coinUsage = {
            rez: state.coinSystem.nuqtaCoin.used,
            promo: state.coinSystem.promoCoin.used,
          };

          const newBillSummary = CheckoutData.helpers.calculateBillSummary(
            state.items,
            state.store,
            tempPromoCode,
            coinUsage
          );

          // Override promo discount with actual backend value
          newBillSummary.promoDiscount = response.data.discount;
          newBillSummary.savings = (newBillSummary.savings || 0) + response.data.discount;

          // Recalculate totalPayable with promo discount and lock fee
          const subtotal = newBillSummary.itemTotal + newBillSummary.getAndItemTotal;
          const totalBeforeDiscount = subtotal + newBillSummary.platformFee + newBillSummary.deliveryFee + newBillSummary.taxes;
          const totalAfterDiscount = totalBeforeDiscount - (newBillSummary.lockFeeDiscount || 0) - response.data.discount - coinUsage.rez - coinUsage.promo;
          newBillSummary.totalPayable = Math.max(0, Math.round(totalAfterDiscount));

          setState(prev => ({
            ...prev,
            appliedPromoCode: tempPromoCode,
            billSummary: newBillSummary,
            loading: false,
            showPromoCodeSection: false,
            error: null,
          }));

          return { success: true, message: `${code} applied successfully!` };
        } else {
          const errorMsg = response.message || 'Invalid promo code';
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMsg,
          }));
          return { success: false, message: errorMsg };
        }
      } catch (error) {
        const errorMsg = 'Failed to validate promo code';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, message: errorMsg };
      }
    }
  }, [state.availablePromoCodes, state.items, state.store, state.coinSystem, applyPromoCode]);

  const handleCoinToggle = useCallback((coinType: 'rez' | 'promo' | 'storePromo', enabled: boolean) => {
    if (coinType === 'rez') {
      toggleNuqtaCoin(enabled);  // 'rez' in handlers maps to nuqtaCoin internally
    } else if (coinType === 'promo') {
      togglePromoCoin(enabled);
    } else if (coinType === 'storePromo') {
      toggleStorePromoCoin(enabled);
    }
  }, [toggleNuqtaCoin, togglePromoCoin, toggleStorePromoCoin]);

  const handlePaymentMethodSelect = useCallback((method: PaymentMethod) => {
    selectPaymentMethod(method);
  }, [selectPaymentMethod]);

  // Set fulfillment type and recalculate fees
  const setFulfillmentType = useCallback((type: FulfillmentType) => {
    setState(prev => {
      const isDelivery = type === 'delivery';
      const oldDeliveryFee = prev.billSummary.deliveryFee;
      const baseDeliveryFee = prev.store.deliveryFee || 0;
      const newDeliveryFee = isDelivery ? baseDeliveryFee : 0;
      const feeDiff = newDeliveryFee - oldDeliveryFee;

      const newBill: BillSummary = {
        ...prev.billSummary,
        deliveryFee: newDeliveryFee,
        totalBeforeCoinDiscount: Math.max(0, prev.billSummary.totalBeforeCoinDiscount + feeDiff),
        totalPayable: Math.max(0, prev.billSummary.totalPayable + feeDiff),
      };

      // Non-blocking analytics
      try {
        analyticsService.trackFulfillmentTypeSelected({
          fulfillmentType: type,
          storeId: prev.store.id,
          cartValue: prev.billSummary.itemTotal,
          previousType: prev.fulfillment.selectedType,
        });
      } catch {} // Silent: non-critical analytics

      return {
        ...prev,
        fulfillment: { ...prev.fulfillment, selectedType: type },
        billSummary: newBill,
        showAddressSection: isDelivery,
      };
    });
  }, []);

  // Set fulfillment details (table number, vehicle info, etc.)
  const setFulfillmentDetails = useCallback((details: Partial<FulfillmentDetails>) => {
    setState(prev => ({
      ...prev,
      fulfillment: {
        ...prev.fulfillment,
        ...details,
      },
    }));
  }, []);

  // Select delivery address
  const selectAddress = useCallback((address: CheckoutDeliveryAddress) => {
    setState(prev => ({
      ...prev,
      selectedAddress: address,
      showAddressSection: false,
    }));
  }, []);

  const handleAddressSelect = useCallback((address: CheckoutDeliveryAddress) => {
    selectAddress(address);
  }, [selectAddress]);

  const handleProceedToPayment = useCallback(() => {
    // Validate address before proceeding (only required for delivery)
    if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
      showToast({
        message: 'Please select a delivery address',
        type: 'error',
      });
      setState(prev => ({ ...prev, showAddressSection: true }));
      return;
    }
    proceedToPayment();
  }, [proceedToPayment, state.selectedAddress, state.fulfillment.selectedType]);

  const handleBackNavigation = useCallback(() => {
    if (state.currentStep === 'payment_methods') {
      setState(prev => ({ ...prev, currentStep: 'checkout' }));
      router.back();
    } else {
      router.back();
    }
  }, [state.currentStep]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    state,
    actions: {
      applyPromoCode,
      removePromoCode,
      toggleNuqtaCoin,
      togglePromoCoin,
      selectPaymentMethod,
      selectAddress,
      updateBillSummary,
      proceedToPayment,
      processPayment,
      setFulfillmentType,
      setFulfillmentDetails,
    },
    handlers: {
      handlePromoCodeApply,
      handleCoinToggle,
      handleCustomCoinAmount,
      handlePaymentMethodSelect,
      handleAddressSelect,
      handleProceedToPayment,
      handleBackNavigation,
      handleWalletPayment,
      handleCODPayment,
      handleRazorpayPayment,
      removePromoCode,
      navigateToOtherPaymentMethods,
      applyCardOffer,
      removeCardOffer,
    },
  };
};