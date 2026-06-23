/**
 * E2E Test: Shopping Journey
 *
 * Tests the complete shopping experience including:
 * - Browse categories
 * - Product search and discovery
 * - Product details viewing
 * - Add to cart
 * - Cart management
 * - Checkout flow
 * - Payment and order confirmation
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');
const {
  waitForElement,
  tapElement,
  typeText,
  scrollToElement,
  takeScreenshot,
  login,
} = require('./helpers/testHelpers');

describe('Shopping Journey E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        location: 'always',
      },
    });

    // Login first
    try {
      await login('+919876543210', '123456');
    } catch (error) {
      console.log('Login skipped - already logged in');
    }
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Product Discovery', () => {
    beforeEach(async () => {
      // Start from home
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should browse products by category', async () => {
      await takeScreenshot('shopping-01-home');

      // Tap on Fashion category
      await tapElement(by.id('category-fashion'));
      await waitForElement(by.id('category-page'), 3000);

      await detoxExpect(element(by.id('category-page'))).toBeVisible();
      await detoxExpect(element(by.id('category-title'))).toHaveText('Fashion');
      await takeScreenshot('shopping-02-category-fashion');

      // Verify products loaded
      await waitForElement(by.id('product-grid'), 3000);
      await detoxExpect(element(by.id('product-grid'))).toBeVisible();
    });

    it('should filter products in category', async () => {
      await tapElement(by.id('category-fashion'));
      await waitForElement(by.id('category-page'), 3000);

      // Open filters
      await tapElement(by.id('filter-button'));
      await waitForElement(by.id('filter-modal'), 2000);
      await takeScreenshot('shopping-03-filters');

      // Apply price filter
      await tapElement(by.id('filter-price-under-1000'));
      await tapElement(by.id('filter-apply-button'));

      // Wait for filtered results
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('shopping-04-filtered-results');
    });

    it('should sort products by price', async () => {
      await tapElement(by.id('category-electronics'));
      await waitForElement(by.id('category-page'), 3000);

      // Open sort options
      await tapElement(by.id('sort-button'));
      await waitForElement(by.id('sort-modal'), 2000);
      await takeScreenshot('shopping-05-sort-options');

      // Sort by price low to high
      await tapElement(by.id('sort-price-low-high'));

      // Wait for sorted results
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('shopping-06-sorted-results');
    });

    it('should search for specific product', async () => {
      // Tap search bar
      await tapElement(by.id('search-bar'));
      await waitForElement(by.id('search-screen'), 2000);

      // Search for "iPhone"
      await typeText(by.id('search-input'), 'iPhone');
      await takeScreenshot('shopping-07-search-input');

      // Submit search
      await tapElement(by.id('search-button'));
      await waitForElement(by.id('search-results'), 3000);

      await detoxExpect(element(by.id('search-results'))).toBeVisible();
      await takeScreenshot('shopping-08-search-results');
    });

    it('should view search suggestions', async () => {
      await tapElement(by.id('search-bar'));
      await waitForElement(by.id('search-screen'), 2000);

      // Type partial query
      await typeText(by.id('search-input'), 'sho');

      // Wait for suggestions
      await waitForElement(by.id('search-suggestions'), 2000);
      await detoxExpect(element(by.id('search-suggestions'))).toBeVisible();
      await takeScreenshot('shopping-09-search-suggestions');

      // Tap on suggestion
      await tapElement(by.id('suggestion-shoes'));
      await waitForElement(by.id('search-results'), 3000);
    });
  });

  describe('Product Details', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should view complete product details', async () => {
      // Tap on first featured product
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      await detoxExpect(element(by.id('product-page'))).toBeVisible();
      await takeScreenshot('shopping-10-product-details');

      // Verify all product details sections
      await detoxExpect(element(by.id('product-image-gallery'))).toBeVisible();
      await detoxExpect(element(by.id('product-name'))).toBeVisible();
      await detoxExpect(element(by.id('product-price'))).toBeVisible();
      await detoxExpect(element(by.id('product-rating'))).toBeVisible();

      // Scroll to see more details
      await element(by.id('product-scroll-view')).scroll(300, 'down');
      await detoxExpect(element(by.id('product-description'))).toBeVisible();
    });

    it('should view product image gallery', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Swipe through images
      await element(by.id('product-image-gallery')).swipe('left', 'fast');
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('shopping-11-product-image-2');

      await element(by.id('product-image-gallery')).swipe('left', 'fast');
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('shopping-12-product-image-3');
    });

    it('should select product variant', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Scroll to variants
      await element(by.id('product-scroll-view')).scroll(200, 'down');

      // Select size variant
      await tapElement(by.id('variant-size-M'));
      await takeScreenshot('shopping-13-variant-size-selected');

      // Select color variant
      await tapElement(by.id('variant-color-blue'));
      await takeScreenshot('shopping-14-variant-color-selected');

      // Verify price updated if variants have different prices
      await detoxExpect(element(by.id('product-price'))).toBeVisible();
    });

    it('should view product reviews', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Scroll to reviews section
      await element(by.id('product-scroll-view')).scroll(500, 'down');
      await waitForElement(by.id('reviews-section'), 2000);

      await detoxExpect(element(by.id('reviews-section'))).toBeVisible();
      await takeScreenshot('shopping-15-reviews-section');

      // View all reviews
      await tapElement(by.id('view-all-reviews-button'));
      await waitForElement(by.id('reviews-screen'), 2000);

      await detoxExpect(element(by.id('reviews-screen'))).toBeVisible();
      await takeScreenshot('shopping-16-all-reviews');

      await element(by.id('back-button')).tap();
    });

    it('should view related products', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Scroll to related products
      await element(by.id('product-scroll-view')).scrollTo('bottom');
      await waitForElement(by.id('related-products-section'), 2000);

      await detoxExpect(element(by.id('related-products-section'))).toBeVisible();
      await takeScreenshot('shopping-17-related-products');

      // Tap on related product
      await tapElement(by.id('related-product-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Verify navigated to new product
      await detoxExpect(element(by.id('product-page'))).toBeVisible();
    });

    it('should share product', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Tap share button
      await tapElement(by.id('share-product-button'));
      await waitForElement(by.id('share-modal'), 2000);

      await detoxExpect(element(by.id('share-modal'))).toBeVisible();
      await takeScreenshot('shopping-18-share-modal');

      // Close modal
      await tapElement(by.id('close-modal-button'));
    });

    it('should add product to wishlist', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Tap wishlist button
      await tapElement(by.id('wishlist-button'));

      // Wait for toast
      await waitForElement(by.text('Added to wishlist'), 2000);
      await takeScreenshot('shopping-19-added-to-wishlist');

      // Verify button state changed
      await detoxExpect(element(by.id('wishlist-button-active'))).toBeVisible();
    });
  });

  describe('Add to Cart', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should add product to cart from product page', async () => {
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Select quantity
      await tapElement(by.id('quantity-plus-button'));
      await takeScreenshot('shopping-20-quantity-increased');

      // Add to cart
      await tapElement(by.id('add-to-cart-button'));

      // Wait for success toast
      await waitForElement(by.text('Added to cart'), 2000);
      await takeScreenshot('shopping-21-added-to-cart-toast');

      // Verify cart badge updated
      await detoxExpect(element(by.id('cart-badge'))).toBeVisible();
    });

    it('should add product directly from product card', async () => {
      // Long press on product card to show quick add
      await element(by.id('product-card-1')).longPress();
      await waitForElement(by.id('quick-add-modal'), 2000);

      await detoxExpect(element(by.id('quick-add-modal'))).toBeVisible();
      await takeScreenshot('shopping-22-quick-add-modal');

      // Add to cart
      await tapElement(by.id('quick-add-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
    });

    it('should add multiple products to cart', async () => {
      // Add first product
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      // Add second product
      await tapElement(by.id('product-card-1'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);

      // Verify cart badge shows 2
      await detoxExpect(element(by.id('cart-badge'))).toHaveText('2');
      await takeScreenshot('shopping-23-multiple-items-cart');
    });

    it('should handle out of stock products', async () => {
      // Find out of stock product (test data dependent)
      await tapElement(by.id('search-bar'));
      await waitForElement(by.id('search-screen'), 2000);
      await typeText(by.id('search-input'), 'out of stock');
      await tapElement(by.id('search-button'));
      await waitForElement(by.id('search-results'), 3000);

      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Add to cart button should be disabled
      await detoxExpect(element(by.id('out-of-stock-message'))).toBeVisible();
      await takeScreenshot('shopping-24-out-of-stock');

      // Notify when available option
      await tapElement(by.id('notify-when-available-button'));
      await waitForElement(by.text('You will be notified'), 2000);
    });
  });

  describe('Cart Management', () => {
    beforeEach(async () => {
      // Reset and add items to cart
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);

      // Add product to cart
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();
    });

    it('should view cart with all items', async () => {
      // Navigate to cart
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      await detoxExpect(element(by.id('cart-page'))).toBeVisible();
      await takeScreenshot('shopping-25-cart-page');

      // Verify cart items
      await detoxExpect(element(by.id('cart-item-0'))).toBeVisible();
      await detoxExpect(element(by.id('cart-total'))).toBeVisible();
    });

    it('should update item quantity in cart', async () => {
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Increase quantity
      await tapElement(by.id('cart-item-0-quantity-plus'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('shopping-26-quantity-increased');

      // Verify total updated
      await detoxExpect(element(by.id('cart-total'))).toBeVisible();

      // Decrease quantity
      await tapElement(by.id('cart-item-0-quantity-minus'));
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should remove item from cart', async () => {
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Swipe to delete
      await element(by.id('cart-item-0')).swipe('left', 'fast');
      await tapElement(by.id('cart-item-0-delete-button'));

      // Confirm deletion
      await tapElement(by.text('Remove'));
      await takeScreenshot('shopping-27-item-removed');

      // Verify empty cart message if no items
      const emptyCartExists = await element(by.id('empty-cart-message')).exists();
      if (emptyCartExists) {
        await detoxExpect(element(by.id('empty-cart-message'))).toBeVisible();
      }
    });

    it('should apply coupon code', async () => {
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Tap apply coupon
      await tapElement(by.id('apply-coupon-button'));
      await waitForElement(by.id('coupon-input'), 2000);

      // Enter coupon code
      await typeText(by.id('coupon-input'), 'SAVE10');
      await tapElement(by.id('apply-button'));

      // Wait for success
      await waitForElement(by.text('Coupon applied'), 2000);
      await takeScreenshot('shopping-28-coupon-applied');

      // Verify discount applied
      await detoxExpect(element(by.id('discount-amount'))).toBeVisible();
    });

    it('should view available coupons', async () => {
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // View available coupons
      await tapElement(by.id('view-coupons-button'));
      await waitForElement(by.id('coupons-modal'), 2000);

      await detoxExpect(element(by.id('coupons-modal'))).toBeVisible();
      await takeScreenshot('shopping-29-available-coupons');

      // Apply coupon from list
      await tapElement(by.id('coupon-0-apply-button'));
      await waitForElement(by.text('Coupon applied'), 2000);

      await tapElement(by.id('close-modal-button'));
    });

    it('should see price breakdown', async () => {
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Scroll to price breakdown
      await element(by.id('cart-scroll-view')).scrollTo('bottom');
      await waitForElement(by.id('price-breakdown'), 2000);

      await detoxExpect(element(by.id('subtotal-amount'))).toBeVisible();
      await detoxExpect(element(by.id('delivery-fee'))).toBeVisible();
      await detoxExpect(element(by.id('total-amount'))).toBeVisible();
      await takeScreenshot('shopping-30-price-breakdown');
    });
  });

  describe('Checkout Flow', () => {
    beforeEach(async () => {
      // Reset and prepare cart
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);

      // Add product to cart
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      // Go to cart
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);
    });

    it('should proceed to checkout', async () => {
      // Tap checkout button
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      await detoxExpect(element(by.id('checkout-screen'))).toBeVisible();
      await takeScreenshot('shopping-31-checkout-screen');
    });

    it('should add delivery address', async () => {
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Add new address
      await tapElement(by.id('add-address-button'));
      await waitForElement(by.id('address-form'), 2000);
      await takeScreenshot('shopping-32-address-form');

      // Fill address details
      await typeText(by.id('address-name-input'), 'John Doe');
      await typeText(by.id('address-phone-input'), '+919876543210');
      await typeText(by.id('address-line1-input'), '123 Main Street');
      await typeText(by.id('address-line2-input'), 'Apt 4B');
      await typeText(by.id('address-city-input'), 'Mumbai');
      await typeText(by.id('address-state-input'), 'Maharashtra');
      await typeText(by.id('address-pincode-input'), '400001');

      await takeScreenshot('shopping-33-address-filled');

      // Save address
      await tapElement(by.id('save-address-button'));
      await waitForElement(by.text('Address saved'), 2000);
    });

    it('should select existing delivery address', async () => {
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Select address
      await tapElement(by.id('address-0'));
      await takeScreenshot('shopping-34-address-selected');

      // Verify selected state
      await detoxExpect(element(by.id('address-0-selected'))).toBeVisible();
    });

    it('should select delivery time slot', async () => {
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Scroll to delivery slots
      await element(by.id('checkout-scroll-view')).scroll(300, 'down');
      await waitForElement(by.id('delivery-slots'), 2000);

      // Select time slot
      await tapElement(by.id('slot-tomorrow-morning'));
      await takeScreenshot('shopping-35-delivery-slot-selected');

      await detoxExpect(element(by.id('slot-tomorrow-morning-selected'))).toBeVisible();
    });

    it('should select payment method', async () => {
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Scroll to payment methods
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await waitForElement(by.id('payment-methods'), 2000);

      await detoxExpect(element(by.id('payment-methods'))).toBeVisible();
      await takeScreenshot('shopping-36-payment-methods');

      // Select UPI payment
      await tapElement(by.id('payment-upi'));
      await detoxExpect(element(by.id('payment-upi-selected'))).toBeVisible();
    });

    it('should review order summary', async () => {
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Scroll to order summary
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await waitForElement(by.id('order-summary'), 2000);

      await detoxExpect(element(by.id('order-summary'))).toBeVisible();
      await detoxExpect(element(by.id('order-items-count'))).toBeVisible();
      await detoxExpect(element(by.id('order-total'))).toBeVisible();
      await takeScreenshot('shopping-37-order-summary');
    });
  });

  describe('Payment and Order Confirmation', () => {
    beforeEach(async () => {
      // Prepare for payment
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);

      // Add to cart and go to checkout
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Select address (if available)
      try {
        await tapElement(by.id('address-0'));
      } catch {}
    });

    it('should complete payment with COD', async () => {
      // Scroll to payment methods
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');

      // Select Cash on Delivery
      await tapElement(by.id('payment-cod'));
      await takeScreenshot('shopping-38-cod-selected');

      // Place order
      await tapElement(by.id('place-order-button'));

      // Wait for order confirmation
      await waitForElement(by.id('order-confirmation-screen'), 5000);
      await detoxExpect(element(by.id('order-confirmation-screen'))).toBeVisible();
      await takeScreenshot('shopping-39-order-confirmation');

      // Verify order details
      await detoxExpect(element(by.id('order-number'))).toBeVisible();
      await detoxExpect(element(by.id('delivery-date'))).toBeVisible();
    });

    it('should complete payment with UPI', async () => {
      // Scroll to payment methods
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');

      // Select UPI
      await tapElement(by.id('payment-upi'));

      // Place order
      await tapElement(by.id('place-order-button'));

      // UPI payment screen
      await waitForElement(by.id('upi-payment-screen'), 3000);
      await detoxExpect(element(by.id('upi-payment-screen'))).toBeVisible();
      await takeScreenshot('shopping-40-upi-payment');

      // Enter UPI ID
      await typeText(by.id('upi-id-input'), 'test@upi');
      await tapElement(by.id('verify-and-pay-button'));

      // Simulate payment success (in test environment)
      await waitForElement(by.id('order-confirmation-screen'), 10000);
      await detoxExpect(element(by.id('order-confirmation-screen'))).toBeVisible();
      await takeScreenshot('shopping-41-upi-order-confirmed');
    });

    it('should complete payment with card', async () => {
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');

      // Select Card Payment
      await tapElement(by.id('payment-card'));
      await tapElement(by.id('place-order-button'));

      // Card details screen
      await waitForElement(by.id('card-payment-screen'), 3000);
      await takeScreenshot('shopping-42-card-payment');

      // Enter card details (test card)
      await typeText(by.id('card-number-input'), '4111111111111111');
      await typeText(by.id('card-expiry-input'), '12/25');
      await typeText(by.id('card-cvv-input'), '123');
      await typeText(by.id('card-name-input'), 'John Doe');

      await tapElement(by.id('pay-button'));

      // Wait for confirmation
      await waitForElement(by.id('order-confirmation-screen'), 10000);
      await detoxExpect(element(by.id('order-confirmation-screen'))).toBeVisible();
    });

    it('should use wallet for payment', async () => {
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');

      // Select Wallet Payment
      await tapElement(by.id('payment-wallet'));
      await takeScreenshot('shopping-43-wallet-payment');

      // Verify wallet balance
      await detoxExpect(element(by.id('wallet-balance'))).toBeVisible();

      // Place order
      await tapElement(by.id('place-order-button'));

      // Wait for confirmation
      await waitForElement(by.id('order-confirmation-screen'), 5000);
      await detoxExpect(element(by.id('order-confirmation-screen'))).toBeVisible();
      await takeScreenshot('shopping-44-wallet-order-confirmed');
    });

    it('should handle payment failure gracefully', async () => {
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');

      // Select payment that will fail (test scenario)
      await tapElement(by.id('payment-card'));
      await tapElement(by.id('place-order-button'));

      await waitForElement(by.id('card-payment-screen'), 3000);

      // Enter invalid card
      await typeText(by.id('card-number-input'), '0000000000000000');
      await typeText(by.id('card-expiry-input'), '12/25');
      await typeText(by.id('card-cvv-input'), '123');
      await typeText(by.id('card-name-input'), 'Test Fail');

      await tapElement(by.id('pay-button'));

      // Wait for error message
      await waitForElement(by.text('Payment failed'), 5000);
      await takeScreenshot('shopping-45-payment-failed');

      // Retry option should be visible
      await detoxExpect(element(by.id('retry-payment-button'))).toBeVisible();
    });

    it('should view order details from confirmation', async () => {
      // Complete an order first
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('payment-cod'));
      await tapElement(by.id('place-order-button'));
      await waitForElement(by.id('order-confirmation-screen'), 5000);

      // View order details
      await tapElement(by.id('view-order-button'));
      await waitForElement(by.id('order-details-screen'), 2000);

      await detoxExpect(element(by.id('order-details-screen'))).toBeVisible();
      await takeScreenshot('shopping-46-order-details');

      // Verify order information
      await detoxExpect(element(by.id('order-status'))).toBeVisible();
      await detoxExpect(element(by.id('order-items'))).toBeVisible();
      await detoxExpect(element(by.id('delivery-address'))).toBeVisible();
    });

    it('should track order from confirmation', async () => {
      // Complete an order first
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('payment-cod'));
      await tapElement(by.id('place-order-button'));
      await waitForElement(by.id('order-confirmation-screen'), 5000);

      // Track order
      await tapElement(by.id('track-order-button'));
      await waitForElement(by.id('tracking-screen'), 2000);

      await detoxExpect(element(by.id('tracking-screen'))).toBeVisible();
      await takeScreenshot('shopping-47-order-tracking');

      // Verify tracking stages
      await detoxExpect(element(by.id('tracking-timeline'))).toBeVisible();
    });

    it('should continue shopping from confirmation', async () => {
      // Complete an order first
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('payment-cod'));
      await tapElement(by.id('place-order-button'));
      await waitForElement(by.id('order-confirmation-screen'), 5000);

      // Continue shopping
      await tapElement(by.id('continue-shopping-button'));
      await waitForElement(by.id('home-screen'), 2000);

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
      await takeScreenshot('shopping-48-back-to-home');
    });
  });

  describe('Order History', () => {
    it('should view order history', async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);

      // Navigate to profile
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);

      // Go to order history
      await tapElement(by.id('my-orders-button'));
      await waitForElement(by.id('order-history-screen'), 2000);

      await detoxExpect(element(by.id('order-history-screen'))).toBeVisible();
      await takeScreenshot('shopping-49-order-history');
    });

    it('should reorder from history', async () => {
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await tapElement(by.id('my-orders-button'));
      await waitForElement(by.id('order-history-screen'), 2000);

      // Tap reorder on first order
      await tapElement(by.id('order-0-reorder-button'));

      // Should add items to cart
      await waitForElement(by.text('Items added to cart'), 2000);
      await takeScreenshot('shopping-50-reorder-success');
    });

    it('should cancel order', async () => {
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await tapElement(by.id('my-orders-button'));
      await waitForElement(by.id('order-history-screen'), 2000);

      // View order details
      await tapElement(by.id('order-0'));
      await waitForElement(by.id('order-details-screen'), 2000);

      // Cancel order
      await tapElement(by.id('cancel-order-button'));
      await waitForElement(by.id('cancel-reason-modal'), 2000);
      await takeScreenshot('shopping-51-cancel-reason');

      // Select reason
      await tapElement(by.id('cancel-reason-0'));
      await tapElement(by.id('confirm-cancel-button'));

      // Wait for cancellation
      await waitForElement(by.text('Order cancelled'), 3000);
      await takeScreenshot('shopping-52-order-cancelled');
    });
  });
});
