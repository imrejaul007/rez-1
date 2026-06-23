/**
 * E2E Test: Stock Notifications Flow
 *
 * Tests stock notification subscription and management
 */

import { device, element, by, expect as detoxExpect } from 'detox';
import {
  waitForElement,
  tapElement,
  scrollToElement,
  takeScreenshot,
  wait,
} from '../helpers/testHelpers';

describe('Stock Notifications Flow', () => {
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

  it('should show "Notify Me" button for out-of-stock products', async () => {
    // Navigate to an out-of-stock product
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));

    // Verify stock indicator shows out of stock
    await detoxExpect(element(by.id('stock-indicator'))).toHaveText('Out of Stock');

    // Verify notify me button exists
    await detoxExpect(element(by.id('notify-me-button'))).toBeVisible();

    await takeScreenshot('out-of-stock-product');
  });

  it('should open notification preferences modal', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));

    // Tap notify me button
    await tapElement(by.id('notify-me-button'));

    // Verify modal opened
    await waitForElement(by.id('notification-preferences-modal'));
    await detoxExpect(element(by.id('notification-preferences-modal'))).toBeVisible();

    await takeScreenshot('notification-preferences-modal');
  });

  it('should display notification method options', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    // Verify notification methods available
    await detoxExpect(element(by.id('notification-method-push'))).toBeVisible();
    await detoxExpect(element(by.id('notification-method-email'))).toBeVisible();
    await detoxExpect(element(by.id('notification-method-sms'))).toBeVisible();
  });

  it('should select notification method', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    // Select email notification
    await tapElement(by.id('notification-method-email'));

    // Verify selected
    await detoxExpect(element(by.id('notification-method-email'))).toHaveValue('true');

    await takeScreenshot('notification-method-selected');
  });

  it('should subscribe to stock notification successfully', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    // Select push notification
    await tapElement(by.id('notification-method-push'));

    // Tap subscribe button
    await tapElement(by.id('subscribe-button'));

    // Verify success message
    await waitForElement(by.id('subscription-success-toast'));
    await detoxExpect(element(by.id('subscription-success-toast'))).toBeVisible();

    await takeScreenshot('subscription-success');
  });

  it('should change button text after subscription', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    await tapElement(by.id('notification-method-push'));
    await tapElement(by.id('subscribe-button'));
    await wait(1000);

    // Verify button changed to "Notification Active"
    await detoxExpect(element(by.id('notification-active-button'))).toBeVisible();
  });

  it('should unsubscribe from stock notification', async () => {
    // First subscribe
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));
    await tapElement(by.id('notification-method-push'));
    await tapElement(by.id('subscribe-button'));
    await wait(1000);

    // Tap notification active button to unsubscribe
    await tapElement(by.id('notification-active-button'));

    // Confirm unsubscribe
    await waitForElement(by.id('unsubscribe-confirmation-modal'));
    await tapElement(by.id('confirm-unsubscribe-button'));

    // Verify unsubscribed
    await waitForElement(by.id('unsubscribe-success-toast'));
    await detoxExpect(element(by.id('notify-me-button'))).toBeVisible();

    await takeScreenshot('unsubscribed');
  });

  it('should view active notifications in profile', async () => {
    // Subscribe to notification first
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));
    await tapElement(by.id('notification-method-push'));
    await tapElement(by.id('subscribe-button'));
    await wait(1000);

    // Navigate to profile
    await tapElement(by.id('profile-tab'));
    await waitForElement(by.id('profile-screen'));

    // Navigate to notifications settings
    await tapElement(by.id('my-notifications-button'));
    await waitForElement(by.id('notifications-list-screen'));

    // Verify subscribed notification appears
    await detoxExpect(element(by.id('notification-item-0'))).toBeVisible();

    await takeScreenshot('active-notifications-list');
  });

  it('should prevent duplicate subscriptions', async () => {
    // Subscribe once
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));
    await tapElement(by.id('notification-method-push'));
    await tapElement(by.id('subscribe-button'));
    await wait(1000);

    // Try to subscribe again
    await tapElement(by.id('notification-active-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    // Verify message about existing subscription
    await detoxExpect(element(by.id('already-subscribed-message'))).toBeVisible();
  });

  it('should select multiple notification methods', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    // Select push
    await tapElement(by.id('notification-method-push'));

    // Select email
    await tapElement(by.id('notification-method-email'));

    // Verify both selected
    await detoxExpect(element(by.id('notification-method-push'))).toHaveValue('true');
    await detoxExpect(element(by.id('notification-method-email'))).toHaveValue('true');

    // Subscribe
    await tapElement(by.id('subscribe-button'));

    // Verify success
    await waitForElement(by.id('subscription-success-toast'));

    await takeScreenshot('multiple-notification-methods');
  });

  it('should close notification modal', async () => {
    await tapElement(by.id('out-of-stock-product'));
    await waitForElement(by.id('product-page'));
    await tapElement(by.id('notify-me-button'));
    await waitForElement(by.id('notification-preferences-modal'));

    // Tap close button
    await tapElement(by.id('close-modal-button'));

    // Verify modal closed
    await detoxExpect(element(by.id('notification-preferences-modal'))).not.toBeVisible();
    await detoxExpect(element(by.id('product-page'))).toBeVisible();
  });
});
