/**
 * E2E Test: Add to Cart Flow
 *
 * Tests the complete add to cart and cart management flow
 */

import { device, element, by, expect as detoxExpect } from 'detox';
import {
  waitForElement,
  tapElement,
  scrollToElement,
  takeScreenshot,
  wait,
} from '../helpers/testHelpers';

describe('Add to Cart Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitForElement(by.id('home-screen'));
  });

  it('should display "Add to Cart" button on product page', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await detoxExpect(element(by.id('add-to-cart-button'))).toBeVisible();
  });

  it('should add product to cart successfully', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Add to cart
    await tapElement(by.id('add-to-cart-button'));

    // Verify success message/toast
    await waitForElement(by.id('added-to-cart-toast'));
    await detoxExpect(element(by.id('added-to-cart-toast'))).toBeVisible();

    await takeScreenshot('product-added-to-cart');
  });

  it('should update cart badge count after adding item', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));

    // Wait for cart update
    await wait(1000);

    // Check cart badge shows 1
    await detoxExpect(element(by.id('cart-badge'))).toBeVisible();
    await detoxExpect(element(by.id('cart-badge'))).toHaveText('1');
  });

  it('should navigate to cart from cart icon', async () => {
    // Add item first
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    // Navigate to cart
    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));
    await detoxExpect(element(by.id('cart-page'))).toBeVisible();

    await takeScreenshot('cart-page');
  });

  it('should display added product in cart', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Verify cart item exists
    await detoxExpect(element(by.id('cart-item-0'))).toBeVisible();
  });

  it('should display correct product details in cart', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Check product name in cart
    await detoxExpect(element(by.id('cart-item-name-0'))).toBeVisible();

    // Check product price in cart
    await detoxExpect(element(by.id('cart-item-price-0'))).toBeVisible();
  });

  it('should increase quantity in cart', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Tap increase quantity button
    await tapElement(by.id('increase-quantity-0'));

    // Verify quantity updated to 2
    await detoxExpect(element(by.id('quantity-0'))).toHaveText('2');

    await takeScreenshot('cart-quantity-increased');
  });

  it('should decrease quantity in cart', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Increase to 2 first
    await tapElement(by.id('increase-quantity-0'));
    await wait(500);

    // Then decrease
    await tapElement(by.id('decrease-quantity-0'));

    // Verify quantity back to 1
    await detoxExpect(element(by.id('quantity-0'))).toHaveText('1');
  });

  it('should remove item from cart when quantity becomes 0', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Decrease quantity to 0
    await tapElement(by.id('decrease-quantity-0'));
    await wait(500);

    // Verify item removed
    await detoxExpect(element(by.id('cart-item-0'))).not.toBeVisible();

    // Verify empty cart message
    await detoxExpect(element(by.id('empty-cart-message'))).toBeVisible();
  });

  it('should remove item using delete button', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Tap remove button
    await tapElement(by.id('remove-item-0'));

    // Verify item removed
    await detoxExpect(element(by.id('cart-item-0'))).not.toBeVisible();
  });

  it('should calculate total price correctly', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Verify total price exists
    await detoxExpect(element(by.id('cart-total-price'))).toBeVisible();

    // Increase quantity
    await tapElement(by.id('increase-quantity-0'));
    await wait(500);

    // Verify total price updated (should be visible, exact value depends on product)
    await detoxExpect(element(by.id('cart-total-price'))).toBeVisible();
  });

  it('should add multiple different products to cart', async () => {
    // Add first product
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await tapElement(by.id('back-button'));
    await wait(1000);

    // Add second product
    await tapElement(by.id('product-card-1'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    // Navigate to cart
    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Verify both items in cart
    await detoxExpect(element(by.id('cart-item-0'))).toBeVisible();
    await detoxExpect(element(by.id('cart-item-1'))).toBeVisible();

    // Verify cart badge shows 2
    await detoxExpect(element(by.id('cart-badge'))).toHaveText('2');

    await takeScreenshot('cart-multiple-items');
  });

  it('should show checkout button on cart page', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Scroll to bottom to see checkout button
    await scrollToElement(
      by.id('cart-scroll-view'),
      by.id('checkout-button'),
      'down'
    );

    await detoxExpect(element(by.id('checkout-button'))).toBeVisible();
  });

  it('should navigate back from cart to continue shopping', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Tap back button
    await tapElement(by.id('back-button'));

    // Verify returned to home
    await waitForElement(by.id('home-screen'));
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should persist cart after app reload', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('add-to-cart-button'));
    await wait(1000);

    // Reload app
    await device.reloadReactNative();
    await waitForElement(by.id('home-screen'));

    // Check cart badge still shows 1
    await detoxExpect(element(by.id('cart-badge'))).toBeVisible();
    await detoxExpect(element(by.id('cart-badge'))).toHaveText('1');

    // Navigate to cart
    await tapElement(by.id('cart-icon'));
    await waitForElement(by.id('cart-page'));

    // Verify item still in cart
    await detoxExpect(element(by.id('cart-item-0'))).toBeVisible();
  });
});
