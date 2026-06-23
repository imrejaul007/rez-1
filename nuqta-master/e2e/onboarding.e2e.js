/**
 * E2E Test: Onboarding Flow
 *
 * Tests the complete onboarding experience including:
 * - App launch
 * - Splash screen
 * - Onboarding screens
 * - Registration
 * - Login
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');

describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        location: 'always',
        camera: 'YES',
        photos: 'YES'
      },
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('App Launch and Splash Screen', () => {
    it('should display splash screen on app launch', async () => {
      await device.reloadReactNative();

      // Wait for splash screen
      await waitFor(element(by.id('splash-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('splash-screen'))).toBeVisible();
      await device.takeScreenshot('01-splash-screen');
    });

    it('should navigate from splash to onboarding', async () => {
      // Wait for splash to finish (3 seconds)
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await detoxExpect(element(by.id('onboarding-screen'))).toBeVisible();
      await device.takeScreenshot('02-onboarding-start');
    });
  });

  describe('Onboarding Screens', () => {
    beforeEach(async () => {
      // Reset to onboarding start
      await device.reloadReactNative();
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display welcome message and app description', async () => {
      await detoxExpect(element(by.id('onboarding-title'))).toBeVisible();
      await detoxExpect(element(by.id('onboarding-description'))).toBeVisible();
      await device.takeScreenshot('03-onboarding-welcome');
    });

    it('should navigate to location permission screen', async () => {
      await element(by.id('continue-button')).tap();

      await waitFor(element(by.id('location-permission-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('location-permission-screen'))).toBeVisible();
      await device.takeScreenshot('04-location-permission');
    });

    it('should request location permission', async () => {
      await element(by.id('continue-button')).tap();
      await waitFor(element(by.id('location-permission-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('allow-location-button')).tap();

      // System permission dialog should appear (can't test directly)
      // Wait and proceed
      await new Promise(resolve => setTimeout(resolve, 1000));
      await device.takeScreenshot('05-location-permission-granted');
    });

    it('should navigate to category selection screen', async () => {
      // Navigate through location permission
      await element(by.id('continue-button')).tap();
      await waitFor(element(by.id('location-permission-screen')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.id('allow-location-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Continue to category selection
      await element(by.id('continue-button')).tap();

      await waitFor(element(by.id('category-selection-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('category-selection-screen'))).toBeVisible();
      await device.takeScreenshot('06-category-selection');
    });

    it('should allow selecting multiple categories', async () => {
      // Navigate to category selection
      await element(by.id('continue-button')).tap();
      await waitFor(element(by.id('location-permission-screen')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.id('allow-location-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await element(by.id('continue-button')).tap();

      await waitFor(element(by.id('category-selection-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Select categories
      await element(by.id('category-fashion')).tap();
      await element(by.id('category-electronics')).tap();
      await element(by.id('category-food')).tap();

      await device.takeScreenshot('07-categories-selected');

      // Continue
      await element(by.id('continue-button')).tap();
    });

    it('should show rewards intro screen', async () => {
      // Navigate to rewards intro
      await element(by.id('continue-button')).tap();
      await waitFor(element(by.id('location-permission-screen')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.id('allow-location-button')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await element(by.id('continue-button')).tap();
      await waitFor(element(by.id('category-selection-screen')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.id('category-fashion')).tap();
      await element(by.id('continue-button')).tap();

      await waitFor(element(by.id('rewards-intro-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('rewards-intro-screen'))).toBeVisible();
      await device.takeScreenshot('08-rewards-intro');
    });
  });

  describe('Registration Flow', () => {
    beforeEach(async () => {
      // Navigate to registration
      await device.reloadReactNative();
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Skip through onboarding
      await element(by.id('skip-button')).tap();
      await waitFor(element(by.id('registration-screen')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should display registration form', async () => {
      await detoxExpect(element(by.id('registration-screen'))).toBeVisible();
      await detoxExpect(element(by.id('phone-input'))).toBeVisible();
      await detoxExpect(element(by.id('send-otp-button'))).toBeVisible();
      await device.takeScreenshot('09-registration-form');
    });

    it('should validate phone number format', async () => {
      // Enter invalid phone number
      await element(by.id('phone-input')).typeText('12345');
      await element(by.id('send-otp-button')).tap();

      // Should show error
      await waitFor(element(by.id('phone-error')))
        .toBeVisible()
        .withTimeout(1000);

      await detoxExpect(element(by.id('phone-error'))).toBeVisible();
      await device.takeScreenshot('10-phone-validation-error');
    });

    it('should send OTP for valid phone number', async () => {
      // Enter valid phone number
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      // Should navigate to OTP screen
      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('otp-verification-screen'))).toBeVisible();
      await device.takeScreenshot('11-otp-screen');
    });

    it('should display OTP input fields', async () => {
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Check OTP inputs
      await detoxExpect(element(by.id('otp-input-0'))).toBeVisible();
      await detoxExpect(element(by.id('otp-input-1'))).toBeVisible();
      await detoxExpect(element(by.id('otp-input-2'))).toBeVisible();
      await detoxExpect(element(by.id('otp-input-3'))).toBeVisible();
      await detoxExpect(element(by.id('otp-input-4'))).toBeVisible();
      await detoxExpect(element(by.id('otp-input-5'))).toBeVisible();
    });

    it('should verify OTP and navigate to profile completion', async () => {
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Enter OTP (test OTP: 123456)
      await element(by.id('otp-input-0')).typeText('1');
      await element(by.id('otp-input-1')).typeText('2');
      await element(by.id('otp-input-2')).typeText('3');
      await element(by.id('otp-input-3')).typeText('4');
      await element(by.id('otp-input-4')).typeText('5');
      await element(by.id('otp-input-5')).typeText('6');

      await element(by.id('verify-otp-button')).tap();

      // Should navigate to profile completion
      await waitFor(element(by.id('profile-completion-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('profile-completion-screen'))).toBeVisible();
      await device.takeScreenshot('12-profile-completion');
    });

    it('should complete profile with all details', async () => {
      // Navigate to profile completion (assuming OTP verified)
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();
      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Enter OTP
      await element(by.id('otp-input-0')).typeText('123456');
      await element(by.id('verify-otp-button')).tap();

      await waitFor(element(by.id('profile-completion-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Fill profile details
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('email-input')).typeText('john.doe@example.com');
      await element(by.id('referral-code-input')).typeText('REF123');

      await device.takeScreenshot('13-profile-filled');

      // Submit
      await element(by.id('complete-profile-button')).tap();

      // Should navigate to home
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
      await device.takeScreenshot('14-registration-complete');
    });

    it('should handle resend OTP', async () => {
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Wait for resend timer
      await new Promise(resolve => setTimeout(resolve, 31000));

      // Resend OTP
      await element(by.id('resend-otp-button')).tap();

      // Should show success message
      await waitFor(element(by.text('OTP sent successfully')))
        .toBeVisible()
        .withTimeout(2000);

      await device.takeScreenshot('15-otp-resent');
    });
  });

  describe('Login Flow', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to login
      await element(by.id('skip-button')).tap();
      await waitFor(element(by.id('registration-screen')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.id('login-link')).tap();
    });

    it('should display login screen', async () => {
      await detoxExpect(element(by.id('login-screen'))).toBeVisible();
      await detoxExpect(element(by.id('phone-input'))).toBeVisible();
      await device.takeScreenshot('16-login-screen');
    });

    it('should login existing user with OTP', async () => {
      // Enter phone number
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Enter OTP
      await element(by.id('otp-input-0')).typeText('123456');
      await element(by.id('verify-otp-button')).tap();

      // Should navigate to home
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
      await device.takeScreenshot('17-login-success');
    });

    it('should handle invalid OTP', async () => {
      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      await waitFor(element(by.id('otp-verification-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Enter wrong OTP
      await element(by.id('otp-input-0')).typeText('000000');
      await element(by.id('verify-otp-button')).tap();

      // Should show error
      await waitFor(element(by.id('otp-error')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('otp-error'))).toBeVisible();
      await device.takeScreenshot('18-invalid-otp');
    });

    it('should navigate back to registration from login', async () => {
      await element(by.id('register-link')).tap();

      await waitFor(element(by.id('registration-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('registration-screen'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during OTP send', async () => {
      // Note: This would require mocking network responses
      // For now, we test the UI behavior

      await device.reloadReactNative();
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('skip-button')).tap();
      await waitFor(element(by.id('registration-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Disable network
      await device.setURLBlacklist(['.*']);

      await element(by.id('phone-input')).typeText('+919876543210');
      await element(by.id('send-otp-button')).tap();

      // Should show error
      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(5000);

      await device.takeScreenshot('19-network-error');

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should handle app backgrounding during onboarding', async () => {
      await device.reloadReactNative();
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Send app to background
      await device.sendToHome();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Bring back to foreground
      await device.launchApp({ newInstance: false });

      // Should still be on onboarding
      await detoxExpect(element(by.id('onboarding-screen'))).toBeVisible();
      await device.takeScreenshot('20-resume-onboarding');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels on all interactive elements', async () => {
      await device.reloadReactNative();
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Check accessibility labels
      await detoxExpect(element(by.id('continue-button'))).toHaveLabel('Continue');
      await detoxExpect(element(by.id('skip-button'))).toHaveLabel('Skip');
    });
  });
});
