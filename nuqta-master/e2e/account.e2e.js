/**
 * E2E Test: Account Management Journey
 *
 * Tests the complete account management experience including:
 * - Profile management
 * - Settings and preferences
 * - Address management
 * - Payment methods
 * - Privacy settings
 * - Notifications
 * - Security
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');
const {
  waitForElement,
  tapElement,
  typeText,
  clearText,
  replaceText,
  scrollToElement,
  takeScreenshot,
  login,
  logout,
} = require('./helpers/testHelpers');

describe('Account Management Journey E2E', () => {
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

  describe('Profile Screen', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should display profile screen with user details', async () => {
      await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
      await takeScreenshot('account-01-profile-screen');

      // Verify profile elements
      await detoxExpect(element(by.id('profile-avatar'))).toBeVisible();
      await detoxExpect(element(by.id('profile-name'))).toBeVisible();
      await detoxExpect(element(by.id('profile-email'))).toBeVisible();
      await detoxExpect(element(by.id('profile-phone'))).toBeVisible();
    });

    it('should display profile stats', async () => {
      await detoxExpect(element(by.id('profile-stats'))).toBeVisible();
      await detoxExpect(element(by.id('orders-count'))).toBeVisible();
      await detoxExpect(element(by.id('coins-balance'))).toBeVisible();
      await detoxExpect(element(by.id('wishlist-count'))).toBeVisible();
      await takeScreenshot('account-02-profile-stats');
    });

    it('should display menu options', async () => {
      // Scroll to see all options
      await element(by.id('profile-scroll-view')).scroll(300, 'down');

      await detoxExpect(element(by.id('my-orders-menu'))).toBeVisible();
      await detoxExpect(element(by.id('my-wishlist-menu'))).toBeVisible();
      await detoxExpect(element(by.id('my-wallet-menu'))).toBeVisible();
      await detoxExpect(element(by.id('settings-menu'))).toBeVisible();
      await takeScreenshot('account-03-menu-options');
    });
  });

  describe('Edit Profile', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should navigate to edit profile', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      await detoxExpect(element(by.id('edit-profile-screen'))).toBeVisible();
      await takeScreenshot('account-04-edit-profile-screen');
    });

    it('should update profile photo', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Tap change photo
      await tapElement(by.id('change-photo-button'));
      await waitForElement(by.id('photo-options-modal'), 2000);

      await detoxExpect(element(by.id('photo-options-modal'))).toBeVisible();
      await takeScreenshot('account-05-photo-options');

      // Choose from gallery
      await tapElement(by.id('choose-from-gallery'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should update name', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Update first name
      await replaceText(by.id('first-name-input'), 'UpdatedFirst');
      await replaceText(by.id('last-name-input'), 'UpdatedLast');
      await takeScreenshot('account-06-name-updated');

      // Save
      await tapElement(by.id('save-profile-button'));
      await waitForElement(by.text('Profile updated'), 2000);
      await takeScreenshot('account-07-profile-saved');
    });

    it('should update email', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Update email
      await replaceText(by.id('email-input'), 'newemail@example.com');
      await tapElement(by.id('save-profile-button'));

      // May require verification
      await waitForElement(by.text('Verification email sent'), 3000);
      await takeScreenshot('account-08-email-verification');
    });

    it('should update date of birth', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Tap date picker
      await tapElement(by.id('dob-picker'));
      await waitForElement(by.id('date-picker-modal'), 2000);
      await takeScreenshot('account-09-dob-picker');

      // Select date
      await tapElement(by.id('date-1990-01-15'));
      await tapElement(by.id('confirm-date-button'));

      await tapElement(by.id('save-profile-button'));
      await waitForElement(by.text('Profile updated'), 2000);
    });

    it('should update gender', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Select gender
      await tapElement(by.id('gender-dropdown'));
      await waitForElement(by.id('gender-picker'), 2000);
      await takeScreenshot('account-10-gender-picker');

      await tapElement(by.id('gender-male'));
      await tapElement(by.id('save-profile-button'));
      await waitForElement(by.text('Profile updated'), 2000);
    });

    it('should validate profile fields', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.id('edit-profile-screen'), 2000);

      // Clear required fields
      await clearText(by.id('first-name-input'));
      await tapElement(by.id('save-profile-button'));

      // Should show error
      await waitForElement(by.text('First name is required'), 2000);
      await takeScreenshot('account-11-validation-error');
    });
  });

  describe('Address Management', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should navigate to addresses', async () => {
      await tapElement(by.id('my-addresses-menu'));
      await waitForElement(by.id('addresses-screen'), 2000);

      await detoxExpect(element(by.id('addresses-screen'))).toBeVisible();
      await takeScreenshot('account-12-addresses-screen');
    });

    it('should add new address', async () => {
      await tapElement(by.id('my-addresses-menu'));
      await waitForElement(by.id('addresses-screen'), 2000);

      // Add address
      await tapElement(by.id('add-address-button'));
      await waitForElement(by.id('add-address-form'), 2000);

      await detoxExpect(element(by.id('add-address-form'))).toBeVisible();
      await takeScreenshot('account-13-add-address-form');

      // Fill address
      await typeText(by.id('address-name-input'), 'Home');
      await typeText(by.id('address-line1-input'), '123 Main Street');
      await typeText(by.id('address-line2-input'), 'Apt 4B');
      await typeText(by.id('address-city-input'), 'Mumbai');
      await typeText(by.id('address-state-input'), 'Maharashtra');
      await typeText(by.id('address-pincode-input'), '400001');
      await typeText(by.id('address-phone-input'), '+919876543210');

      await takeScreenshot('account-14-address-filled');

      // Save
      await tapElement(by.id('save-address-button'));
      await waitForElement(by.text('Address saved'), 2000);
      await takeScreenshot('account-15-address-saved');
    });

    it('should edit existing address', async () => {
      await tapElement(by.id('my-addresses-menu'));
      await waitForElement(by.id('addresses-screen'), 2000);

      // Edit first address
      await tapElement(by.id('address-0-edit-button'));
      await waitForElement(by.id('edit-address-form'), 2000);

      // Update address
      await replaceText(by.id('address-line2-input'), 'Apt 5C');
      await tapElement(by.id('save-address-button'));

      await waitForElement(by.text('Address updated'), 2000);
      await takeScreenshot('account-16-address-updated');
    });

    it('should delete address', async () => {
      await tapElement(by.id('my-addresses-menu'));
      await waitForElement(by.id('addresses-screen'), 2000);

      // Delete address
      await tapElement(by.id('address-0-delete-button'));
      await waitForElement(by.id('delete-confirmation-modal'), 2000);

      await detoxExpect(element(by.id('delete-confirmation-modal'))).toBeVisible();
      await takeScreenshot('account-17-delete-address-confirmation');

      await tapElement(by.id('confirm-delete-button'));
      await waitForElement(by.text('Address deleted'), 2000);
    });

    it('should set default address', async () => {
      await tapElement(by.id('my-addresses-menu'));
      await waitForElement(by.id('addresses-screen'), 2000);

      // Set as default
      await tapElement(by.id('address-1-set-default-button'));
      await waitForElement(by.text('Default address updated'), 2000);
      await takeScreenshot('account-18-default-address');

      // Verify default badge
      await detoxExpect(element(by.id('address-1-default-badge'))).toBeVisible();
    });
  });

  describe('Payment Methods', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should navigate to payment methods', async () => {
      await tapElement(by.id('payment-methods-menu'));
      await waitForElement(by.id('payment-methods-screen'), 2000);

      await detoxExpect(element(by.id('payment-methods-screen'))).toBeVisible();
      await takeScreenshot('account-19-payment-methods');
    });

    it('should add credit card', async () => {
      await tapElement(by.id('payment-methods-menu'));
      await waitForElement(by.id('payment-methods-screen'), 2000);

      // Add card
      await tapElement(by.id('add-card-button'));
      await waitForElement(by.id('add-card-form'), 2000);

      await detoxExpect(element(by.id('add-card-form'))).toBeVisible();
      await takeScreenshot('account-20-add-card-form');

      // Enter card details
      await typeText(by.id('card-number-input'), '4111111111111111');
      await typeText(by.id('card-name-input'), 'John Doe');
      await typeText(by.id('card-expiry-input'), '12/25');
      await typeText(by.id('card-cvv-input'), '123');

      await takeScreenshot('account-21-card-details-filled');

      // Save
      await tapElement(by.id('save-card-button'));
      await waitForElement(by.text('Card added'), 2000);
    });

    it('should add UPI ID', async () => {
      await tapElement(by.id('payment-methods-menu'));
      await waitForElement(by.id('payment-methods-screen'), 2000);

      // Add UPI
      await tapElement(by.id('add-upi-button'));
      await waitForElement(by.id('add-upi-form'), 2000);

      // Enter UPI ID
      await typeText(by.id('upi-id-input'), 'user@upi');
      await tapElement(by.id('verify-upi-button'));

      await waitForElement(by.text('UPI ID verified'), 3000);
      await takeScreenshot('account-22-upi-added');
    });

    it('should remove payment method', async () => {
      await tapElement(by.id('payment-methods-menu'));
      await waitForElement(by.id('payment-methods-screen'), 2000);

      // Remove card
      await tapElement(by.id('card-0-remove-button'));
      await waitForElement(by.id('remove-confirmation-modal'), 2000);

      await tapElement(by.id('confirm-remove-button'));
      await waitForElement(by.text('Payment method removed'), 2000);
      await takeScreenshot('account-23-payment-removed');
    });

    it('should set default payment method', async () => {
      await tapElement(by.id('payment-methods-menu'));
      await waitForElement(by.id('payment-methods-screen'), 2000);

      // Set as default
      await tapElement(by.id('card-0-set-default-button'));
      await waitForElement(by.text('Default payment updated'), 2000);
      await takeScreenshot('account-24-default-payment');
    });
  });

  describe('Settings', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should navigate to settings', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);

      await detoxExpect(element(by.id('settings-screen'))).toBeVisible();
      await takeScreenshot('account-25-settings-screen');
    });

    it('should view general settings', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);

      // Verify settings sections
      await detoxExpect(element(by.id('general-settings'))).toBeVisible();
      await detoxExpect(element(by.id('notification-settings'))).toBeVisible();
      await detoxExpect(element(by.id('privacy-settings'))).toBeVisible();
      await takeScreenshot('account-26-settings-sections');
    });

    it('should change language', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);

      // Change language
      await tapElement(by.id('language-setting'));
      await waitForElement(by.id('language-picker'), 2000);

      await detoxExpect(element(by.id('language-picker'))).toBeVisible();
      await takeScreenshot('account-27-language-picker');

      await tapElement(by.id('language-hindi'));
      await waitForElement(by.text('Language updated'), 2000);
    });

    it('should toggle dark mode', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);

      // Toggle dark mode
      await tapElement(by.id('dark-mode-toggle'));
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('account-28-dark-mode');

      // Toggle back
      await tapElement(by.id('dark-mode-toggle'));
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should manage notification preferences', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);

      // Open notification settings
      await tapElement(by.id('notification-settings'));
      await waitForElement(by.id('notification-preferences-screen'), 2000);

      await detoxExpect(element(by.id('notification-preferences-screen'))).toBeVisible();
      await takeScreenshot('account-29-notification-preferences');

      // Toggle push notifications
      await tapElement(by.id('push-notifications-toggle'));
      await waitForElement(by.text('Preferences updated'), 2000);
    });

    it('should manage email notifications', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);
      await tapElement(by.id('notification-settings'));
      await waitForElement(by.id('notification-preferences-screen'), 2000);

      // Toggle email notifications
      await tapElement(by.id('email-notifications-toggle'));
      await tapElement(by.id('order-updates-email-toggle'));
      await tapElement(by.id('promotional-email-toggle'));
      await takeScreenshot('account-30-email-notifications');
    });

    it('should view privacy settings', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);

      // Open privacy settings
      await tapElement(by.id('privacy-settings'));
      await waitForElement(by.id('privacy-settings-screen'), 2000);

      await detoxExpect(element(by.id('privacy-settings-screen'))).toBeVisible();
      await takeScreenshot('account-31-privacy-settings');
    });

    it('should toggle profile visibility', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);
      await tapElement(by.id('privacy-settings'));
      await waitForElement(by.id('privacy-settings-screen'), 2000);

      // Toggle profile visibility
      await tapElement(by.id('profile-visibility-toggle'));
      await waitForElement(by.text('Privacy updated'), 2000);
      await takeScreenshot('account-32-profile-visibility');
    });

    it('should manage data sharing preferences', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('settings-menu'));
      await waitForElement(by.id('settings-screen'), 2000);
      await tapElement(by.id('privacy-settings'));
      await waitForElement(by.id('privacy-settings-screen'), 2000);

      // Data sharing toggles
      await tapElement(by.id('analytics-sharing-toggle'));
      await tapElement(by.id('personalization-toggle'));
      await takeScreenshot('account-33-data-sharing');
    });
  });

  describe('Security', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should navigate to security settings', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('security-menu'));
      await waitForElement(by.id('security-screen'), 2000);

      await detoxExpect(element(by.id('security-screen'))).toBeVisible();
      await takeScreenshot('account-34-security-screen');
    });

    it('should change password', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('security-menu'));
      await waitForElement(by.id('security-screen'), 2000);

      // Change password
      await tapElement(by.id('change-password-button'));
      await waitForElement(by.id('change-password-form'), 2000);

      await detoxExpect(element(by.id('change-password-form'))).toBeVisible();
      await takeScreenshot('account-35-change-password-form');

      // Enter passwords
      await typeText(by.id('current-password-input'), 'oldpassword');
      await typeText(by.id('new-password-input'), 'newpassword123');
      await typeText(by.id('confirm-password-input'), 'newpassword123');

      await tapElement(by.id('save-password-button'));
      await waitForElement(by.text('Password updated'), 2000);
    });

    it('should enable two-factor authentication', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('security-menu'));
      await waitForElement(by.id('security-screen'), 2000);

      // Enable 2FA
      await tapElement(by.id('enable-2fa-button'));
      await waitForElement(by.id('2fa-setup-screen'), 2000);

      await detoxExpect(element(by.id('2fa-setup-screen'))).toBeVisible();
      await takeScreenshot('account-36-2fa-setup');

      // Select SMS
      await tapElement(by.id('2fa-sms-option'));
      await tapElement(by.id('send-verification-button'));

      await waitForElement(by.text('Verification code sent'), 2000);
    });

    it('should view login sessions', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('security-menu'));
      await waitForElement(by.id('security-screen'), 2000);

      // View sessions
      await tapElement(by.id('active-sessions-button'));
      await waitForElement(by.id('sessions-screen'), 2000);

      await detoxExpect(element(by.id('sessions-screen'))).toBeVisible();
      await takeScreenshot('account-37-active-sessions');
    });

    it('should revoke device session', async () => {
      await element(by.id('profile-scroll-view')).scroll(400, 'down');
      await tapElement(by.id('security-menu'));
      await waitForElement(by.id('security-screen'), 2000);
      await tapElement(by.id('active-sessions-button'));
      await waitForElement(by.id('sessions-screen'), 2000);

      // Revoke session (if multiple exist)
      const sessionExists = await element(by.id('session-1-revoke-button')).exists();
      if (sessionExists) {
        await tapElement(by.id('session-1-revoke-button'));
        await waitForElement(by.text('Session revoked'), 2000);
        await takeScreenshot('account-38-session-revoked');
      }
    });
  });

  describe('Help and Support', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should navigate to help center', async () => {
      await element(by.id('profile-scroll-view')).scroll(500, 'down');
      await tapElement(by.id('help-center-menu'));
      await waitForElement(by.id('help-center-screen'), 2000);

      await detoxExpect(element(by.id('help-center-screen'))).toBeVisible();
      await takeScreenshot('account-39-help-center');
    });

    it('should view FAQ', async () => {
      await element(by.id('profile-scroll-view')).scroll(500, 'down');
      await tapElement(by.id('help-center-menu'));
      await waitForElement(by.id('help-center-screen'), 2000);

      // View FAQs
      await tapElement(by.id('faq-section'));
      await waitForElement(by.id('faq-screen'), 2000);

      await detoxExpect(element(by.id('faq-screen'))).toBeVisible();
      await takeScreenshot('account-40-faq');

      // Expand FAQ item
      await tapElement(by.id('faq-item-0'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('account-41-faq-expanded');
    });

    it('should contact support', async () => {
      await element(by.id('profile-scroll-view')).scroll(500, 'down');
      await tapElement(by.id('help-center-menu'));
      await waitForElement(by.id('help-center-screen'), 2000);

      // Contact support
      await tapElement(by.id('contact-support-button'));
      await waitForElement(by.id('support-chat-screen'), 2000);

      await detoxExpect(element(by.id('support-chat-screen'))).toBeVisible();
      await takeScreenshot('account-42-support-chat');

      // Send message
      await typeText(by.id('chat-input'), 'I need help with my order');
      await tapElement(by.id('send-message-button'));

      await waitForElement(by.id('message-sent'), 2000);
    });

    it('should view terms and conditions', async () => {
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('terms-conditions-menu'));
      await waitForElement(by.id('terms-screen'), 2000);

      await detoxExpect(element(by.id('terms-screen'))).toBeVisible();
      await takeScreenshot('account-43-terms-conditions');
    });

    it('should view privacy policy', async () => {
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('privacy-policy-menu'));
      await waitForElement(by.id('privacy-policy-screen'), 2000);

      await detoxExpect(element(by.id('privacy-policy-screen'))).toBeVisible();
      await takeScreenshot('account-44-privacy-policy');
    });
  });

  describe('Account Actions', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should logout successfully', async () => {
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('logout-button'));
      await waitForElement(by.id('logout-confirmation-modal'), 2000);

      await detoxExpect(element(by.id('logout-confirmation-modal'))).toBeVisible();
      await takeScreenshot('account-45-logout-confirmation');

      await tapElement(by.id('confirm-logout-button'));

      // Should navigate to login/splash
      await waitForElement(by.id('onboarding-screen'), 5000);
      await detoxExpect(element(by.id('onboarding-screen'))).toBeVisible();
      await takeScreenshot('account-46-logged-out');
    });

    it('should cancel logout', async () => {
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('logout-button'));
      await waitForElement(by.id('logout-confirmation-modal'), 2000);

      await tapElement(by.id('cancel-logout-button'));

      // Should stay on profile
      await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
    });

    it('should view delete account option', async () => {
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('delete-account-button'));
      await waitForElement(by.id('delete-account-modal'), 2000);

      await detoxExpect(element(by.id('delete-account-modal'))).toBeVisible();
      await takeScreenshot('account-47-delete-account-warning');

      // Verify warning message
      await detoxExpect(element(by.text('This action cannot be undone'))).toBeVisible();

      // Cancel (don't actually delete)
      await tapElement(by.id('cancel-delete-button'));
    });
  });

  describe('My Orders', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should view order history', async () => {
      await tapElement(by.id('my-orders-menu'));
      await waitForElement(by.id('orders-screen'), 2000);

      await detoxExpect(element(by.id('orders-screen'))).toBeVisible();
      await takeScreenshot('account-48-order-history');
    });

    it('should filter orders by status', async () => {
      await tapElement(by.id('my-orders-menu'));
      await waitForElement(by.id('orders-screen'), 2000);

      // Filter by delivered
      await tapElement(by.id('filter-delivered'));
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('account-49-delivered-orders');

      // Filter by pending
      await tapElement(by.id('filter-pending'));
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should view order details', async () => {
      await tapElement(by.id('my-orders-menu'));
      await waitForElement(by.id('orders-screen'), 2000);

      // Tap on order
      await tapElement(by.id('order-0'));
      await waitForElement(by.id('order-details-screen'), 2000);

      await detoxExpect(element(by.id('order-details-screen'))).toBeVisible();
      await takeScreenshot('account-50-order-details');
    });
  });
});
