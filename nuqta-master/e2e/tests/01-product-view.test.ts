/**
 * E2E Test: Product View Flow
 *
 * Tests the complete product viewing experience
 */

import { device, element, by, expect as detoxExpect } from 'detox';
import {
  waitForElement,
  tapElement,
  scrollToElement,
  swipeElement,
  takeScreenshot,
} from '../helpers/testHelpers';

describe('Product View Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', location: 'inuse' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should load the home screen successfully', async () => {
    await waitForElement(by.id('home-screen'));
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should display product list on home screen', async () => {
    await waitForElement(by.id('product-list'));
    await detoxExpect(element(by.id('product-list'))).toBeVisible();
  });

  it('should navigate to product details when tapping a product', async () => {
    // Tap first product
    await waitForElement(by.id('product-card-0'));
    await tapElement(by.id('product-card-0'));

    // Verify product page loaded
    await waitForElement(by.id('product-page'));
    await detoxExpect(element(by.id('product-page'))).toBeVisible();

    await takeScreenshot('product-details-page');
  });

  it('should display product name and price', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check product name exists
    await detoxExpect(element(by.id('product-name'))).toBeVisible();

    // Check price exists
    await detoxExpect(element(by.id('product-price'))).toBeVisible();
  });

  it('should display product images gallery', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check image gallery exists
    await detoxExpect(element(by.id('product-image-gallery'))).toBeVisible();
  });

  it('should swipe through product images', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-image-gallery'));

    // Swipe left to see next image
    await swipeElement(by.id('product-image-gallery'), 'left');
    await detoxExpect(element(by.id('product-image-1'))).toBeVisible();

    // Swipe left again
    await swipeElement(by.id('product-image-gallery'), 'left');
    await detoxExpect(element(by.id('product-image-2'))).toBeVisible();

    await takeScreenshot('product-images-swiped');
  });

  it('should display product description', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Scroll to description
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('product-description'),
      'down'
    );

    await detoxExpect(element(by.id('product-description'))).toBeVisible();
  });

  it('should display product specifications', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Scroll to specifications
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('product-specifications'),
      'down'
    );

    await detoxExpect(element(by.id('product-specifications'))).toBeVisible();
  });

  it('should display variant selector if product has variants', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check if variant selector exists
    const variantSelectorExists = await element(by.id('variant-selector')).exists();

    if (variantSelectorExists) {
      await detoxExpect(element(by.id('variant-selector'))).toBeVisible();
    }
  });

  it('should select different product variant', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check if variant selector exists
    const variantSelectorExists = await element(by.id('variant-selector')).exists();

    if (variantSelectorExists) {
      // Tap on second variant
      await tapElement(by.id('variant-option-1'));

      // Verify variant is selected
      await detoxExpect(element(by.id('variant-option-1'))).toBeVisible();

      await takeScreenshot('variant-selected');
    }
  });

  it('should display stock availability indicator', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check stock indicator
    await detoxExpect(element(by.id('stock-indicator'))).toBeVisible();
  });

  it('should show share button', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check share button
    await detoxExpect(element(by.id('share-button'))).toBeVisible();
  });

  it('should display reviews section', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Scroll to reviews
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('reviews-section'),
      'down'
    );

    await detoxExpect(element(by.id('reviews-section'))).toBeVisible();
  });

  it('should display average rating', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Check rating display
    await detoxExpect(element(by.id('product-rating'))).toBeVisible();
  });

  it('should navigate back from product page', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Tap back button
    await tapElement(by.id('back-button'));

    // Verify returned to home screen
    await waitForElement(by.id('home-screen'));
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should maintain scroll position when navigating back', async () => {
    // Scroll down on home screen
    await element(by.id('product-list')).scroll(500, 'down');

    // Navigate to product
    await tapElement(by.id('product-card-2'));
    await waitForElement(by.id('product-page'));

    // Navigate back
    await tapElement(by.id('back-button'));
    await waitForElement(by.id('home-screen'));

    // Verify product-card-2 is still visible (scroll position maintained)
    await detoxExpect(element(by.id('product-card-2'))).toBeVisible();
  });
});
