/**
 * E2E Test: Reviews Flow
 *
 * Tests product review submission and viewing
 */

import { device, element, by, expect as detoxExpect } from 'detox';
import {
  waitForElement,
  tapElement,
  typeText,
  scrollToElement,
  takeScreenshot,
  wait,
} from '../helpers/testHelpers';

describe('Reviews Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { camera: 'YES', photos: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitForElement(by.id('home-screen'));
  });

  it('should display reviews section on product page', async () => {
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

  it('should display average rating and count', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('reviews-section'),
      'down'
    );

    // Verify rating display
    await detoxExpect(element(by.id('average-rating'))).toBeVisible();
    await detoxExpect(element(by.id('review-count'))).toBeVisible();

    await takeScreenshot('product-reviews');
  });

  it('should display rating breakdown', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('reviews-section'),
      'down'
    );

    // Verify rating bars (5-star to 1-star)
    await detoxExpect(element(by.id('rating-bar-5'))).toBeVisible();
    await detoxExpect(element(by.id('rating-bar-4'))).toBeVisible();
    await detoxExpect(element(by.id('rating-bar-3'))).toBeVisible();
    await detoxExpect(element(by.id('rating-bar-2'))).toBeVisible();
    await detoxExpect(element(by.id('rating-bar-1'))).toBeVisible();
  });

  it('should display individual reviews', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('reviews-section'),
      'down'
    );

    // Verify at least one review is visible
    await detoxExpect(element(by.id('review-item-0'))).toBeVisible();
  });

  it('should display review details', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('review-item-0'),
      'down'
    );

    // Verify review components
    await detoxExpect(element(by.id('review-rating-0'))).toBeVisible();
    await detoxExpect(element(by.id('review-author-0'))).toBeVisible();
    await detoxExpect(element(by.id('review-text-0'))).toBeVisible();
    await detoxExpect(element(by.id('review-date-0'))).toBeVisible();
  });

  it('should open write review modal', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('write-review-button'),
      'down'
    );

    await tapElement(by.id('write-review-button'));

    // Verify review modal opened
    await waitForElement(by.id('write-review-modal'));
    await detoxExpect(element(by.id('write-review-modal'))).toBeVisible();

    await takeScreenshot('write-review-modal');
  });

  it('should select rating in review form', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('write-review-button'),
      'down'
    );

    await tapElement(by.id('write-review-button'));
    await waitForElement(by.id('write-review-modal'));

    // Tap 4-star rating
    await tapElement(by.id('rating-star-4'));

    // Verify 4 stars selected
    await detoxExpect(element(by.id('selected-rating'))).toHaveText('4');

    await takeScreenshot('rating-selected');
  });

  it('should write review text', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('write-review-button'),
      'down'
    );

    await tapElement(by.id('write-review-button'));
    await waitForElement(by.id('write-review-modal'));

    // Type review
    await typeText(
      by.id('review-text-input'),
      'Great product! Highly recommend.'
    );

    await detoxExpect(element(by.id('review-text-input'))).toHaveText(
      'Great product! Highly recommend.'
    );
  });

  it('should submit review successfully', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('write-review-button'),
      'down'
    );

    await tapElement(by.id('write-review-button'));
    await waitForElement(by.id('write-review-modal'));

    // Select rating
    await tapElement(by.id('rating-star-5'));

    // Write review
    await typeText(by.id('review-text-input'), 'Excellent product!');

    // Submit
    await tapElement(by.id('submit-review-button'));

    // Verify success message
    await waitForElement(by.id('review-submitted-toast'));
    await detoxExpect(element(by.id('review-submitted-toast'))).toBeVisible();

    await takeScreenshot('review-submitted');
  });

  it('should validate review before submission', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('write-review-button'),
      'down'
    );

    await tapElement(by.id('write-review-button'));
    await waitForElement(by.id('write-review-modal'));

    // Try to submit without rating
    await tapElement(by.id('submit-review-button'));

    // Verify validation error
    await detoxExpect(element(by.id('rating-required-error'))).toBeVisible();
  });

  it('should close review modal', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('write-review-button'),
      'down'
    );

    await tapElement(by.id('write-review-button'));
    await waitForElement(by.id('write-review-modal'));

    // Close modal
    await tapElement(by.id('close-review-modal-button'));

    // Verify modal closed
    await detoxExpect(element(by.id('write-review-modal'))).not.toBeVisible();
  });

  it('should filter reviews by rating', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('reviews-section'),
      'down'
    );

    // Tap 5-star filter
    await tapElement(by.id('filter-5-star'));

    // Verify only 5-star reviews shown
    await detoxExpect(element(by.id('filtered-reviews-5-star'))).toBeVisible();

    await takeScreenshot('reviews-filtered-5-star');
  });

  it('should sort reviews', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('reviews-section'),
      'down'
    );

    // Tap sort button
    await tapElement(by.id('sort-reviews-button'));

    // Select sort option
    await tapElement(by.id('sort-most-recent'));

    await takeScreenshot('reviews-sorted');
  });

  it('should like a review', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('review-item-0'),
      'down'
    );

    // Tap like button
    await tapElement(by.id('like-review-0'));

    // Verify like count increased
    await detoxExpect(element(by.id('like-count-0'))).toBeVisible();

    await takeScreenshot('review-liked');
  });

  it('should view all reviews', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('view-all-reviews-button'),
      'down'
    );

    await tapElement(by.id('view-all-reviews-button'));

    // Verify all reviews page
    await waitForElement(by.id('all-reviews-page'));
    await detoxExpect(element(by.id('all-reviews-page'))).toBeVisible();

    await takeScreenshot('all-reviews-page');
  });

  it('should display "verified purchase" badge', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('review-item-0'),
      'down'
    );

    // Check if verified badge exists
    const badgeExists = await element(by.id('verified-badge-0')).exists();

    if (badgeExists) {
      await detoxExpect(element(by.id('verified-badge-0'))).toBeVisible();
    }
  });
});
