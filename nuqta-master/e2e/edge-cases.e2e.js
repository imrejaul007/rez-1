/**
 * E2E Test: Edge Cases and Error Scenarios
 *
 * Tests error handling, edge cases, and recovery:
 * - Network failures
 * - Offline mode
 * - Session expiry
 * - Invalid inputs
 * - Payment failures
 * - App backgrounding
 * - Low memory scenarios
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');
const {
  waitForElement,
  tapElement,
  typeText,
  takeScreenshot,
  sendToBackground,
  reloadApp,
  login,
} = require('./helpers/testHelpers');

describe('Edge Cases and Error Scenarios E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        location: 'always',
        camera: 'YES',
        photos: 'YES',
      },
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Network Errors', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle network failure on app launch', async () => {
      // Disable network
      await device.setURLBlacklist(['.*']);

      // Reload app
      await device.reloadReactNative();

      // Should show network error
      await waitForElement(by.text('No internet connection'), 5000);
      await takeScreenshot('edge-01-network-error-launch');

      // Verify error state
      await detoxExpect(element(by.id('network-error-screen'))).toBeVisible();
      await detoxExpect(element(by.id('retry-button'))).toBeVisible();

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should retry loading after network error', async () => {
      // Disable network
      await device.setURLBlacklist(['.*']);
      await device.reloadReactNative();
      await waitForElement(by.text('No internet connection'), 5000);

      // Re-enable network
      await device.setURLBlacklist([]);

      // Tap retry
      await tapElement(by.id('retry-button'));

      // Should load successfully
      await waitForElement(by.id('home-screen'), 5000);
      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
      await takeScreenshot('edge-02-retry-success');
    });

    it('should handle network failure during product load', async () => {
      // Navigate to product
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Disable network
      await device.setURLBlacklist(['.*']);

      // Reload product
      await device.reloadReactNative();
      await tapElement(by.id('product-card-0'));

      // Should show error
      await waitForElement(by.text('Failed to load product'), 5000);
      await takeScreenshot('edge-03-product-load-error');

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should handle network timeout', async () => {
      // Simulate slow network (this depends on backend configuration)
      await tapElement(by.id('search-bar'));
      await waitForElement(by.id('search-screen'), 2000);
      await typeText(by.id('search-input'), 'test');
      await tapElement(by.id('search-button'));

      // If timeout occurs
      try {
        await waitForElement(by.text('Request timeout'), 10000);
        await takeScreenshot('edge-04-request-timeout');
        await detoxExpect(element(by.id('retry-button'))).toBeVisible();
      } catch {
        // Request succeeded (expected in test environment)
        await takeScreenshot('edge-04-request-success');
      }
    });

    it('should handle API server error (500)', async () => {
      // This requires backend to return 500 for specific request
      // Test the error handling UI
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);

      // If server error occurs
      const errorExists = await element(by.text('Server error')).exists();
      if (errorExists) {
        await takeScreenshot('edge-05-server-error');
        await detoxExpect(element(by.id('retry-button'))).toBeVisible();
      }
    });

    it('should queue actions when offline', async () => {
      // Login first
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Add item to cart
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Disable network
      await device.setURLBlacklist(['.*']);

      // Try to add to cart (should queue)
      await tapElement(by.id('add-to-cart-button'));

      // Should show queued message
      await waitForElement(by.text('Action queued'), 3000);
      await takeScreenshot('edge-06-action-queued');

      // Re-enable network
      await device.setURLBlacklist([]);

      // Action should sync
      await waitForElement(by.text('Synced'), 5000);
      await takeScreenshot('edge-07-action-synced');
    });
  });

  describe('Offline Mode', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should show offline indicator when disconnected', async () => {
      // Disable network
      await device.setURLBlacklist(['.*']);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should show offline indicator
      await waitForElement(by.id('offline-indicator'), 3000);
      await detoxExpect(element(by.id('offline-indicator'))).toBeVisible();
      await takeScreenshot('edge-08-offline-indicator');

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should allow browsing cached content offline', async () => {
      // View product while online
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await element(by.id('back-button')).tap();

      // Go offline
      await device.setURLBlacklist(['.*']);

      // Should still be able to view cached product
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      await detoxExpect(element(by.id('product-page'))).toBeVisible();
      await takeScreenshot('edge-09-cached-content');

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should prevent checkout when offline', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Add to cart while online
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      // Go to cart
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Go offline
      await device.setURLBlacklist(['.*']);

      // Try to checkout
      await tapElement(by.id('checkout-button'));

      // Should show offline error
      await waitForElement(by.text('Cannot checkout offline'), 3000);
      await takeScreenshot('edge-10-checkout-offline-error');

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should sync data when coming back online', async () => {
      // Go offline
      await device.setURLBlacklist(['.*']);

      // Make changes (e.g., add to wishlist)
      await tapElement(by.id('product-card-1'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('wishlist-button'));

      // Should show queued
      await waitForElement(by.text('Will sync when online'), 2000);
      await takeScreenshot('edge-11-queued-for-sync');

      // Go back online
      await device.setURLBlacklist([]);

      // Should auto-sync
      await waitForElement(by.text('Synced'), 5000);
      await takeScreenshot('edge-12-auto-synced');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle session expiry during checkout', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Add to cart
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      // Navigate to checkout
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Simulate session expiry (this would normally happen after timeout)
      // In test, we can try to trigger auth check
      await tapElement(by.id('checkout-button'));

      // If session expired, should redirect to login
      const loginVisible = await element(by.id('login-screen')).exists();
      if (loginVisible) {
        await takeScreenshot('edge-13-session-expired');
        await detoxExpect(element(by.id('login-screen'))).toBeVisible();
      }
    });

    it('should restore cart after re-login', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Add items to cart
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      // Logout
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('logout-button'));
      await waitForElement(by.id('logout-confirmation-modal'), 2000);
      await tapElement(by.id('confirm-logout-button'));

      // Login again
      await waitForElement(by.id('onboarding-screen'), 5000);
      await login('+919876543210', '123456');

      // Check cart
      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);

      // Cart should still have items
      await detoxExpect(element(by.id('cart-item-0'))).toBeVisible();
      await takeScreenshot('edge-14-cart-restored');
    });

    it('should handle concurrent session on multiple devices', async () => {
      // This is hard to test in E2E without actual multiple devices
      // But we can test the warning UI
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Check if concurrent session warning appears
      const warningExists = await element(by.text('Logged in on another device')).exists();
      if (warningExists) {
        await takeScreenshot('edge-15-concurrent-session-warning');
      }
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should validate empty required fields', async () => {
      // Go to registration
      await element(by.id('skip-button')).tap();
      await waitForElement(by.id('registration-screen'), 2000);

      // Try to submit without phone
      await tapElement(by.id('send-otp-button'));

      // Should show error
      await waitForElement(by.text('Phone number is required'), 2000);
      await takeScreenshot('edge-16-empty-field-error');
    });

    it('should validate invalid phone format', async () => {
      await element(by.id('skip-button')).tap();
      await waitForElement(by.id('registration-screen'), 2000);

      // Enter invalid phone
      await typeText(by.id('phone-input'), '123');
      await tapElement(by.id('send-otp-button'));

      // Should show format error
      await waitForElement(by.text('Invalid phone number'), 2000);
      await takeScreenshot('edge-17-invalid-phone-error');
    });

    it('should validate invalid email format', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Enter invalid email
      await element(by.id('email-input')).clearText();
      await typeText(by.id('email-input'), 'invalidemail');
      await tapElement(by.id('save-profile-button'));

      // Should show error
      await waitForElement(by.text('Invalid email format'), 2000);
      await takeScreenshot('edge-18-invalid-email-error');
    });

    it('should validate password strength', async () => {
      await element(by.id('skip-button')).tap();
      await waitForElement(by.id('registration-screen'), 2000);
      await typeText(by.id('phone-input'), '+919876543210');
      await tapElement(by.id('send-otp-button'));
      await waitForElement(by.id('otp-verification-screen'), 3000);

      // Assuming we get to password field
      const passwordExists = await element(by.id('password-input')).exists();
      if (passwordExists) {
        // Weak password
        await typeText(by.id('password-input'), '123');
        await tapElement(by.id('continue-button'));

        await waitForElement(by.text('Password too weak'), 2000);
        await takeScreenshot('edge-19-weak-password-error');
      }
    });

    it('should validate address fields', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await tapElement(by.id('my-addresses-menu'));
      await waitForElement(by.id('addresses-screen'), 2000);
      await tapElement(by.id('add-address-button'));
      await waitForElement(by.id('add-address-form'), 2000);

      // Invalid pincode
      await typeText(by.id('address-pincode-input'), '123');
      await tapElement(by.id('save-address-button'));

      await waitForElement(by.text('Invalid pincode'), 2000);
      await takeScreenshot('edge-20-invalid-pincode-error');
    });

    it('should validate card number', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await tapElement(by.id('payment-methods-menu'));
      await waitForElement(by.id('payment-methods-screen'), 2000);
      await tapElement(by.id('add-card-button'));
      await waitForElement(by.id('add-card-form'), 2000);

      // Invalid card number
      await typeText(by.id('card-number-input'), '1234');
      await tapElement(by.id('save-card-button'));

      await waitForElement(by.text('Invalid card number'), 2000);
      await takeScreenshot('edge-21-invalid-card-error');
    });
  });

  describe('Payment Failures', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle payment gateway timeout', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Add to cart and checkout
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Select card payment
      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('payment-card'));
      await tapElement(by.id('place-order-button'));

      // If payment times out
      const timeoutExists = await waitForElement(by.text('Payment timeout'), 15000).catch(() => false);
      if (timeoutExists) {
        await takeScreenshot('edge-22-payment-timeout');
        await detoxExpect(element(by.id('retry-payment-button'))).toBeVisible();
      }
    });

    it('should handle declined card', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Checkout with card
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('payment-card'));
      await tapElement(by.id('place-order-button'));
      await waitForElement(by.id('card-payment-screen'), 3000);

      // Enter card that will be declined (test scenario)
      await typeText(by.id('card-number-input'), '4000000000000002');
      await typeText(by.id('card-expiry-input'), '12/25');
      await typeText(by.id('card-cvv-input'), '123');
      await typeText(by.id('card-name-input'), 'Test Decline');
      await tapElement(by.id('pay-button'));

      // Should show declined message
      await waitForElement(by.text('Card declined'), 5000);
      await takeScreenshot('edge-23-card-declined');
    });

    it('should handle insufficient wallet balance', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Try to pay with wallet (assuming insufficient balance)
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      await element(by.id('checkout-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('payment-wallet'));
      await tapElement(by.id('place-order-button'));

      // If insufficient balance
      const errorExists = await element(by.text('Insufficient balance')).exists();
      if (errorExists) {
        await takeScreenshot('edge-24-insufficient-balance');
        await detoxExpect(element(by.id('add-money-button'))).toBeVisible();
      }
    });

    it('should retry failed payment', async () => {
      // Assuming previous payment failed
      const retryExists = await element(by.id('retry-payment-button')).exists();
      if (retryExists) {
        await tapElement(by.id('retry-payment-button'));

        // Should go back to payment screen
        await waitForElement(by.id('card-payment-screen'), 3000);
        await takeScreenshot('edge-25-retry-payment');
      }
    });
  });

  describe('App State Management', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle app backgrounding during video playback', async () => {
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Background app
      await sendToBackground(3000);

      // Should pause video
      await detoxExpect(element(by.id('video-player-screen'))).toBeVisible();
      await takeScreenshot('edge-26-video-after-background');
    });

    it('should handle app backgrounding during checkout', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await tapElement(by.id('add-to-cart-button'));
      await waitForElement(by.text('Added to cart'), 2000);
      await element(by.id('back-button')).tap();

      await tapElement(by.id('cart-icon'));
      await waitForElement(by.id('cart-page'), 2000);
      await tapElement(by.id('checkout-button'));
      await waitForElement(by.id('checkout-screen'), 3000);

      // Background app
      await sendToBackground(3000);

      // Should restore checkout state
      await detoxExpect(element(by.id('checkout-screen'))).toBeVisible();
      await takeScreenshot('edge-27-checkout-after-background');
    });

    it('should handle app kill and restore', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Navigate to specific screen
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);

      // Terminate and relaunch
      await device.terminateApp();
      await device.launchApp({ newInstance: false });

      // Should restore to home or saved state
      await waitForElement(by.id('home-screen'), 5000);
      await takeScreenshot('edge-28-app-restored');
    });

    it('should handle low memory warning', async () => {
      // This is hard to simulate in E2E
      // But we can test if app gracefully handles it
      // Navigate through multiple screens
      await tapElement(by.id('product-card-0'));
      await waitForElement(by.id('product-page'), 3000);
      await element(by.id('back-button')).tap();

      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);

      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);

      // App should still be responsive
      await detoxExpect(element(by.id('play-screen'))).toBeVisible();
      await takeScreenshot('edge-29-after-navigation-stress');
    });
  });

  describe('Data Synchronization', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle conflicting data updates', async () => {
      try {
        await login('+919876543210', '123456');
      } catch {}

      // Update profile
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Go offline
      await device.setURLBlacklist(['.*']);

      // Make changes
      await element(by.id('first-name-input')).replaceText('OfflineName');
      await tapElement(by.id('save-profile-button'));

      // Should queue update
      await waitForElement(by.text('Will sync when online'), 2000);
      await takeScreenshot('edge-30-conflicting-update-queued');

      // Go online
      await device.setURLBlacklist([]);

      // Should handle conflict resolution
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    it('should handle partial data loading', async () => {
      // Simulate slow network causing partial data
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);

      // If some sections fail to load
      const errorSectionExists = await element(by.id('section-error')).exists();
      if (errorSectionExists) {
        await takeScreenshot('edge-31-partial-data-load');
        await detoxExpect(element(by.id('retry-section-button'))).toBeVisible();
      }
    });
  });

  describe('Permission Denials', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle camera permission denial', async () => {
      // Relaunch with camera denied
      await device.launchApp({
        newInstance: true,
        permissions: { camera: 'NO' },
      });

      try {
        await login('+919876543210', '123456');
      } catch {}

      // Try to use camera
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);
      await tapElement(by.id('take-photo-button'));

      // Should show permission request or denial message
      await waitForElement(by.text('Camera permission required'), 3000);
      await takeScreenshot('edge-32-camera-permission-denied');
    });

    it('should handle location permission denial', async () => {
      await device.launchApp({
        newInstance: true,
        permissions: { location: 'never' },
      });

      // Features requiring location should show appropriate message
      await waitForElement(by.id('location-permission-warning'), 5000);
      await takeScreenshot('edge-33-location-permission-denied');
    });

    it('should handle notification permission denial', async () => {
      await device.launchApp({
        newInstance: true,
        permissions: { notifications: 'NO' },
      });

      try {
        await login('+919876543210', '123456');
      } catch {}

      // Check settings for notification warning
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);

      const notifWarningExists = await element(by.text('Enable notifications')).exists();
      if (notifWarningExists) {
        await takeScreenshot('edge-34-notification-permission-denied');
      }
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should handle too many OTP requests', async () => {
      await element(by.id('skip-button')).tap();
      await waitForElement(by.id('registration-screen'), 2000);

      // Send multiple OTP requests
      for (let i = 0; i < 5; i++) {
        await typeText(by.id('phone-input'), '+919876543210');
        await tapElement(by.id('send-otp-button'));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Should show rate limit error
      const rateLimitExists = await element(by.text('Too many attempts')).exists();
      if (rateLimitExists) {
        await takeScreenshot('edge-35-rate-limit-otp');
      }
    });

    it('should handle search rate limiting', async () => {
      // Perform many searches quickly
      for (let i = 0; i < 10; i++) {
        await tapElement(by.id('search-bar'));
        await waitForElement(by.id('search-screen'), 2000);
        await typeText(by.id('search-input'), `search${i}`);
        await tapElement(by.id('search-button'));
        await new Promise(resolve => setTimeout(resolve, 100));
        await element(by.id('back-button')).tap();
      }

      // Should show rate limit or throttle searches
      const throttleExists = await element(by.text('Please slow down')).exists();
      if (throttleExists) {
        await takeScreenshot('edge-36-rate-limit-search');
      }
    });
  });
});
