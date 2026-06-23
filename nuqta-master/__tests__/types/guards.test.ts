/**
 * Tests for Type Guards
 * Tests all type guard functions with valid and invalid data
 */

import {
  isProduct,
  isProductAvailable,
  isProductLowStock,
  isProductOutOfStock,
  isProductOnSale,
  isStore,
  isStoreOpen,
  isStoreVerified,
  isDeliveryAvailable,
  isPickupAvailable,
  isCartItem,
  isCartItemAvailable,
  isCartItemLocked,
  isUser,
  isUserVerified,
  isUserAdmin,
  isUserMerchant,
  isOrder,
  canCancelOrder,
  canReturnOrder,
  isOrderPaid,
  isOrderDelivered,
  isReview,
  isVerifiedReview,
  hasReviewImages,
  hasMerchantReply,
  isRecentReview,
  isDefined,
  isNonEmptyString,
  isValidNumber,
  isPositiveNumber,
  isValidDate,
  isNonEmptyArray,
} from '@/types/unified/guards';

describe('Type Guards', () => {
  describe('Product Type Guards', () => {
    const validProduct = {
      id: '123',
      name: 'Test Product',
      storeId: 'store123',
      price: { current: 100, currency: 'INR' },
      images: [{ id: '1', url: 'image.jpg', alt: 'Product', isMain: true }],
      inventory: { stock: 10, isAvailable: true },
      productType: 'product' as const,
    };

    describe('isProduct', () => {
      it('should return true for valid product', () => {
        expect(isProduct(validProduct)).toBe(true);
      });

      it('should return false for invalid product (missing fields)', () => {
        expect(isProduct({ id: '123' })).toBe(false);
        expect(isProduct({ ...validProduct, id: undefined })).toBe(false);
        expect(isProduct({ ...validProduct, name: undefined })).toBe(false);
        expect(isProduct({ ...validProduct, storeId: undefined })).toBe(false);
      });

      it('should return false for invalid product type', () => {
        expect(isProduct({ ...validProduct, productType: 'invalid' })).toBe(false);
      });

      it('should return false for non-object', () => {
        expect(isProduct(null)).toBe(false);
        expect(isProduct('string')).toBe(false);
        expect(isProduct(123)).toBe(false);
      });
    });

    describe('isProductAvailable', () => {
      it('should return true for in_stock product', () => {
        const product = { ...validProduct, availabilityStatus: 'in_stock' as const };
        expect(isProductAvailable(product as any)).toBe(true);
      });

      it('should return true for low_stock product', () => {
        const product = { ...validProduct, availabilityStatus: 'low_stock' as const };
        expect(isProductAvailable(product as any)).toBe(true);
      });

      it('should return false for out_of_stock product', () => {
        const product = { ...validProduct, availabilityStatus: 'out_of_stock' as const };
        expect(isProductAvailable(product as any)).toBe(false);
      });

      it('should check inventory if no availability status', () => {
        const available = {
          ...validProduct,
          inventory: { stock: 10, isAvailable: true },
        };
        expect(isProductAvailable(available as any)).toBe(true);

        const unavailable = {
          ...validProduct,
          inventory: { stock: 0, isAvailable: false },
        };
        expect(isProductAvailable(unavailable as any)).toBe(false);
      });
    });

    describe('isProductLowStock', () => {
      it('should return true for low_stock status', () => {
        const product = { ...validProduct, availabilityStatus: 'low_stock' as const };
        expect(isProductLowStock(product as any)).toBe(true);
      });

      it('should return true if stock <= threshold', () => {
        const product = {
          ...validProduct,
          inventory: { stock: 3, lowStockThreshold: 5, isAvailable: true },
        };
        expect(isProductLowStock(product as any)).toBe(true);
      });

      it('should return false if stock > threshold', () => {
        const product = {
          ...validProduct,
          inventory: { stock: 10, lowStockThreshold: 5, isAvailable: true },
        };
        expect(isProductLowStock(product as any)).toBe(false);
      });
    });

    describe('isProductOutOfStock', () => {
      it('should return true for out_of_stock status', () => {
        const product = { ...validProduct, availabilityStatus: 'out_of_stock' as const };
        expect(isProductOutOfStock(product as any)).toBe(true);
      });

      it('should return true if stock is 0', () => {
        const product = { ...validProduct, inventory: { stock: 0, isAvailable: false } };
        expect(isProductOutOfStock(product as any)).toBe(true);
      });
    });

    describe('isProductOnSale', () => {
      it('should return true if isOnSale flag is true', () => {
        const product = { ...validProduct, isOnSale: true };
        expect(isProductOnSale(product as any)).toBe(true);
      });

      it('should return true if current < original price', () => {
        const product = {
          ...validProduct,
          price: { current: 80, original: 100, currency: 'INR' },
        };
        expect(isProductOnSale(product as any)).toBe(true);
      });

      it('should return false if no sale', () => {
        expect(isProductOnSale(validProduct as any)).toBe(false);
      });
    });
  });

  describe('Store Type Guards', () => {
    const validStore = {
      id: 'store123',
      name: 'Test Store',
      location: { address: '123 Main St', coordinates: { latitude: 0, longitude: 0 }, city: 'Test', state: 'TS', country: 'TC', postalCode: '12345' },
      hours: {},
      status: { isOpen: true, status: 'open' as const },
      verified: true,
      storeType: 'physical' as const,
    };

    describe('isStore', () => {
      it('should return true for valid store', () => {
        expect(isStore(validStore)).toBe(true);
      });

      it('should return false for invalid store type', () => {
        expect(isStore({ ...validStore, storeType: 'invalid' })).toBe(false);
      });
    });

    describe('isStoreOpen', () => {
      it('should return true for open store', () => {
        expect(isStoreOpen(validStore as any)).toBe(true);
      });

      it('should return false for closed store', () => {
        const closed = { ...validStore, status: { isOpen: false, status: 'closed' as const } };
        expect(isStoreOpen(closed as any)).toBe(false);
      });
    });

    describe('isStoreVerified', () => {
      it('should return true for verified store', () => {
        expect(isStoreVerified(validStore as any)).toBe(true);
      });

      it('should return false for unverified store', () => {
        expect(isStoreVerified({ ...validStore, verified: false } as any)).toBe(false);
      });
    });

    describe('isDeliveryAvailable', () => {
      it('should return true if delivery is available', () => {
        const store = { ...validStore, delivery: { isAvailable: true } };
        expect(isDeliveryAvailable(store as any)).toBe(true);
      });

      it('should return false if delivery is not available', () => {
        expect(isDeliveryAvailable(validStore as any)).toBe(false);
      });
    });

    describe('isPickupAvailable', () => {
      it('should return true if pickup is available', () => {
        const store = { ...validStore, pickup: { isAvailable: true } };
        expect(isPickupAvailable(store as any)).toBe(true);
      });

      it('should return false if pickup is not available', () => {
        expect(isPickupAvailable(validStore as any)).toBe(false);
      });
    });
  });

  describe('Cart Type Guards', () => {
    const validCartItem = {
      id: 'cart123',
      productId: 'product123',
      storeId: 'store123',
      name: 'Test Product',
      price: 100,
      quantity: 2,
      category: 'products' as const,
    };

    describe('isCartItem', () => {
      it('should return true for valid cart item', () => {
        expect(isCartItem(validCartItem)).toBe(true);
      });

      it('should return false for invalid category', () => {
        expect(isCartItem({ ...validCartItem, category: 'invalid' })).toBe(false);
      });
    });

    describe('isCartItemAvailable', () => {
      it('should return true for available item', () => {
        expect(isCartItemAvailable(validCartItem as any)).toBe(true);
      });

      it('should return false for out of stock', () => {
        const item = { ...validCartItem, availabilityStatus: 'out_of_stock' as const };
        expect(isCartItemAvailable(item as any)).toBe(false);
      });

      it('should check inventory stock', () => {
        const available = { ...validCartItem, inventory: { stock: 10 } };
        expect(isCartItemAvailable(available as any)).toBe(true);

        const unavailable = { ...validCartItem, quantity: 10, inventory: { stock: 5 } };
        expect(isCartItemAvailable(unavailable as any)).toBe(false);
      });
    });

    describe('isCartItemLocked', () => {
      it('should return false if not locked', () => {
        expect(isCartItemLocked(validCartItem as any)).toBe(false);
      });

      it('should return true if locked and not expired', () => {
        const future = new Date(Date.now() + 60000).toISOString();
        const item = { ...validCartItem, isLocked: true, lockExpiresAt: future };
        expect(isCartItemLocked(item as any)).toBe(true);
      });

      it('should return false if locked but expired', () => {
        const past = new Date(Date.now() - 60000).toISOString();
        const item = { ...validCartItem, isLocked: true, lockExpiresAt: past };
        expect(isCartItemLocked(item as any)).toBe(false);
      });
    });
  });

  describe('User Type Guards', () => {
    const validUser = {
      id: 'user123',
      email: 'test@example.com',
      profile: { name: 'Test User', avatar: '' },
      preferences: {},
      role: 'user' as const,
      isActive: true,
      emailVerified: true,
    };

    describe('isUser', () => {
      it('should return true for valid user', () => {
        expect(isUser(validUser)).toBe(true);
      });

      it('should return false for invalid role', () => {
        expect(isUser({ ...validUser, role: 'invalid' })).toBe(false);
      });
    });

    describe('isUserVerified', () => {
      it('should return true for verified user', () => {
        expect(isUserVerified(validUser as any)).toBe(true);
      });

      it('should return false for unverified user', () => {
        expect(isUserVerified({ ...validUser, emailVerified: false } as any)).toBe(false);
      });
    });

    describe('isUserAdmin', () => {
      it('should return true for admin user', () => {
        expect(isUserAdmin({ ...validUser, role: 'admin' } as any)).toBe(true);
      });

      it('should return false for non-admin user', () => {
        expect(isUserAdmin(validUser as any)).toBe(false);
      });
    });

    describe('isUserMerchant', () => {
      it('should return true for merchant user', () => {
        expect(isUserMerchant({ ...validUser, role: 'merchant' } as any)).toBe(true);
      });

      it('should return false for non-merchant user', () => {
        expect(isUserMerchant(validUser as any)).toBe(false);
      });
    });
  });

  describe('Order Type Guards', () => {
    const validOrder = {
      id: 'order123',
      orderNumber: 'ORD-123',
      userId: 'user123',
      items: [],
      pricing: { total: 1000 },
      shippingAddress: {},
      paymentMethod: {},
      status: 'pending' as const,
      paymentStatus: 'paid' as const,
    };

    describe('isOrder', () => {
      it('should return true for valid order', () => {
        expect(isOrder(validOrder)).toBe(true);
      });
    });

    describe('canCancelOrder', () => {
      it('should return true for pending order', () => {
        expect(canCancelOrder(validOrder as any)).toBe(true);
      });

      it('should return false for delivered order', () => {
        expect(canCancelOrder({ ...validOrder, status: 'delivered' } as any)).toBe(false);
      });

      it('should return false if canCancel is false', () => {
        expect(canCancelOrder({ ...validOrder, canCancel: false } as any)).toBe(false);
      });
    });

    describe('canReturnOrder', () => {
      it('should return true for delivered order', () => {
        expect(canReturnOrder({ ...validOrder, status: 'delivered' } as any)).toBe(true);
      });

      it('should return false if already returned', () => {
        expect(canReturnOrder({ ...validOrder, status: 'delivered', return: {} } as any)).toBe(false);
      });

      it('should return false if canReturn is false', () => {
        expect(canReturnOrder({ ...validOrder, status: 'delivered', canReturn: false } as any)).toBe(false);
      });
    });

    describe('isOrderPaid', () => {
      it('should return true for paid order', () => {
        expect(isOrderPaid(validOrder as any)).toBe(true);
      });

      it('should return false for pending payment', () => {
        expect(isOrderPaid({ ...validOrder, paymentStatus: 'pending' } as any)).toBe(false);
      });
    });

    describe('isOrderDelivered', () => {
      it('should return true for delivered order', () => {
        expect(isOrderDelivered({ ...validOrder, status: 'delivered' } as any)).toBe(true);
      });

      it('should return false for non-delivered order', () => {
        expect(isOrderDelivered(validOrder as any)).toBe(false);
      });
    });
  });

  describe('Review Type Guards', () => {
    const validReview = {
      id: 'review123',
      user: { id: 'user123', name: 'Test User' },
      rating: 4.5,
      comment: 'Great product!',
      type: 'product' as const,
      verified: true,
      createdAt: new Date().toISOString(),
    };

    describe('isReview', () => {
      it('should return true for valid review', () => {
        expect(isReview(validReview)).toBe(true);
      });

      it('should return false for invalid rating', () => {
        expect(isReview({ ...validReview, rating: 6 })).toBe(false);
        expect(isReview({ ...validReview, rating: 0 })).toBe(false);
      });
    });

    describe('isVerifiedReview', () => {
      it('should return true for verified review', () => {
        expect(isVerifiedReview(validReview as any)).toBe(true);
      });

      it('should return false for unverified review', () => {
        expect(isVerifiedReview({ ...validReview, verified: false } as any)).toBe(false);
      });
    });

    describe('hasReviewImages', () => {
      it('should return true if review has images', () => {
        const review = { ...validReview, images: ['image1.jpg'] };
        expect(hasReviewImages(review as any)).toBe(true);
      });

      it('should return false if review has no images', () => {
        expect(hasReviewImages(validReview as any)).toBe(false);
      });
    });

    describe('hasMerchantReply', () => {
      it('should return true if review has merchant reply', () => {
        const review = { ...validReview, merchantReply: 'Thank you!' };
        expect(hasMerchantReply(review as any)).toBe(true);
      });

      it('should return false if no merchant reply', () => {
        expect(hasMerchantReply(validReview as any)).toBe(false);
      });
    });

    describe('isRecentReview', () => {
      it('should return true for review within 30 days', () => {
        const review = { ...validReview, createdAt: new Date().toISOString() };
        expect(isRecentReview(review as any)).toBe(true);
      });

      it('should return false for old review', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 31);
        const review = { ...validReview, createdAt: oldDate.toISOString() };
        expect(isRecentReview(review as any)).toBe(false);
      });
    });
  });

  describe('Generic Type Guards', () => {
    describe('isDefined', () => {
      it('should return true for defined values', () => {
        expect(isDefined('string')).toBe(true);
        expect(isDefined(0)).toBe(true);
        expect(isDefined(false)).toBe(true);
        expect(isDefined([])).toBe(true);
      });

      it('should return false for null or undefined', () => {
        expect(isDefined(null)).toBe(false);
        expect(isDefined(undefined)).toBe(false);
      });
    });

    describe('isNonEmptyString', () => {
      it('should return true for non-empty strings', () => {
        expect(isNonEmptyString('test')).toBe(true);
        expect(isNonEmptyString('  text  ')).toBe(true);
      });

      it('should return false for empty strings', () => {
        expect(isNonEmptyString('')).toBe(false);
        expect(isNonEmptyString('   ')).toBe(false);
      });

      it('should return false for non-strings', () => {
        expect(isNonEmptyString(123)).toBe(false);
        expect(isNonEmptyString(null)).toBe(false);
      });
    });

    describe('isValidNumber', () => {
      it('should return true for valid numbers', () => {
        expect(isValidNumber(0)).toBe(true);
        expect(isValidNumber(123.45)).toBe(true);
        expect(isValidNumber(-100)).toBe(true);
      });

      it('should return false for invalid numbers', () => {
        expect(isValidNumber(NaN)).toBe(false);
        expect(isValidNumber(Infinity)).toBe(false);
        expect(isValidNumber(-Infinity)).toBe(false);
        expect(isValidNumber('123')).toBe(false);
      });
    });

    describe('isPositiveNumber', () => {
      it('should return true for positive numbers', () => {
        expect(isPositiveNumber(1)).toBe(true);
        expect(isPositiveNumber(123.45)).toBe(true);
      });

      it('should return false for zero and negative', () => {
        expect(isPositiveNumber(0)).toBe(false);
        expect(isPositiveNumber(-1)).toBe(false);
      });
    });

    describe('isValidDate', () => {
      it('should return true for valid dates', () => {
        expect(isValidDate(new Date())).toBe(true);
        expect(isValidDate(new Date('2023-01-01'))).toBe(true);
      });

      it('should return false for invalid dates', () => {
        expect(isValidDate(new Date('invalid'))).toBe(false);
        expect(isValidDate('2023-01-01')).toBe(false);
      });
    });

    describe('isNonEmptyArray', () => {
      it('should return true for non-empty arrays', () => {
        expect(isNonEmptyArray([1])).toBe(true);
        expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      });

      it('should return false for empty arrays', () => {
        expect(isNonEmptyArray([])).toBe(false);
      });

      it('should return false for non-arrays', () => {
        expect(isNonEmptyArray('string')).toBe(false);
        expect(isNonEmptyArray(null)).toBe(false);
      });
    });
  });
});
