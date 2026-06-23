/**
 * E2E Test: Price Alerts Flow
 *
 * Tests price alert creation and management
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

describe('Price Alerts Flow', () => {
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

  it('should display price tracking button on product page', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    // Scroll to price tracking section
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );

    await detoxExpect(element(by.id('price-tracking-button'))).toBeVisible();
  });

  it('should open price alert modal', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));

    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );

    await tapElement(by.id('price-tracking-button'));

    // Verify modal opened
    await waitForElement(by.id('price-alert-modal'));
    await detoxExpect(element(by.id('price-alert-modal'))).toBeVisible();

    await takeScreenshot('price-alert-modal');
  });

  it('should display price alert type options', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    // Verify alert types
    await detoxExpect(element(by.id('alert-type-target-price'))).toBeVisible();
    await detoxExpect(element(by.id('alert-type-percentage-drop'))).toBeVisible();
    await detoxExpect(element(by.id('alert-type-any-drop'))).toBeVisible();
  });

  it('should create target price alert', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    // Select target price alert
    await tapElement(by.id('alert-type-target-price'));

    // Enter target price
    await typeText(by.id('target-price-input'), '50');

    // Create alert
    await tapElement(by.id('create-alert-button'));

    // Verify success
    await waitForElement(by.id('alert-created-toast'));
    await detoxExpect(element(by.id('alert-created-toast'))).toBeVisible();

    await takeScreenshot('price-alert-created');
  });

  it('should create percentage drop alert', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    // Select percentage drop alert
    await tapElement(by.id('alert-type-percentage-drop'));

    // Enter percentage
    await typeText(by.id('percentage-input'), '20');

    // Create alert
    await tapElement(by.id('create-alert-button'));

    // Verify success
    await waitForElement(by.id('alert-created-toast'));

    await takeScreenshot('percentage-alert-created');
  });

  it('should create "any drop" alert', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    // Select any drop alert
    await tapElement(by.id('alert-type-any-drop'));

    // Create alert (no input needed)
    await tapElement(by.id('create-alert-button'));

    // Verify success
    await waitForElement(by.id('alert-created-toast'));

    await takeScreenshot('any-drop-alert-created');
  });

  it('should validate target price input', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    await tapElement(by.id('alert-type-target-price'));

    // Try to create without entering price
    await tapElement(by.id('create-alert-button'));

    // Verify validation error
    await detoxExpect(element(by.id('target-price-error'))).toBeVisible();
  });

  it('should display price history chart', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-history-section'),
      'down'
    );

    // Verify price history chart
    await detoxExpect(element(by.id('price-history-chart'))).toBeVisible();

    await takeScreenshot('price-history-chart');
  });

  it('should display price statistics', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-statistics'),
      'down'
    );

    // Verify statistics
    await detoxExpect(element(by.id('lowest-price'))).toBeVisible();
    await detoxExpect(element(by.id('highest-price'))).toBeVisible();
    await detoxExpect(element(by.id('average-price'))).toBeVisible();
  });

  it('should view active price alerts in profile', async () => {
    // Create an alert first
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));
    await tapElement(by.id('alert-type-any-drop'));
    await tapElement(by.id('create-alert-button'));
    await wait(1000);

    // Navigate to profile
    await tapElement(by.id('profile-tab'));
    await waitForElement(by.id('profile-screen'));

    // Navigate to price alerts
    await tapElement(by.id('my-price-alerts-button'));
    await waitForElement(by.id('price-alerts-list-screen'));

    // Verify alert appears
    await detoxExpect(element(by.id('price-alert-item-0'))).toBeVisible();

    await takeScreenshot('active-price-alerts');
  });

  it('should cancel price alert', async () => {
    // Create an alert
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));
    await tapElement(by.id('alert-type-any-drop'));
    await tapElement(by.id('create-alert-button'));
    await wait(1000);

    // Navigate to alerts list
    await tapElement(by.id('profile-tab'));
    await waitForElement(by.id('profile-screen'));
    await tapElement(by.id('my-price-alerts-button'));
    await waitForElement(by.id('price-alerts-list-screen'));

    // Cancel alert
    await tapElement(by.id('cancel-alert-0'));

    // Confirm cancellation
    await waitForElement(by.id('cancel-alert-confirmation'));
    await tapElement(by.id('confirm-cancel-button'));

    // Verify alert removed
    await detoxExpect(element(by.id('price-alert-item-0'))).not.toBeVisible();

    await takeScreenshot('alert-cancelled');
  });

  it('should show current price in alert creation', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    // Verify current price is displayed
    await detoxExpect(element(by.id('current-price-display'))).toBeVisible();
  });

  it('should close price alert modal', async () => {
    await tapElement(by.id('product-card-0'));
    await waitForElement(by.id('product-page'));
    await scrollToElement(
      by.id('product-scroll-view'),
      by.id('price-tracking-button'),
      'down'
    );
    await tapElement(by.id('price-tracking-button'));
    await waitForElement(by.id('price-alert-modal'));

    // Close modal
    await tapElement(by.id('close-modal-button'));

    // Verify closed
    await detoxExpect(element(by.id('price-alert-modal'))).not.toBeVisible();
    await detoxExpect(element(by.id('product-page'))).toBeVisible();
  });
});
