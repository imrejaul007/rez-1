/**
 * E2E Test Helpers
 *
 * Reusable helper functions for E2E tests
 */

import { device, element, by, waitFor, expect as detoxExpect } from 'detox';

/**
 * Wait for element to be visible with timeout
 */
export const waitForElement = async (
  elementMatcher: Detox.NativeMatcher,
  timeout: number = 10000
) => {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .withTimeout(timeout);
};

/**
 * Tap on element after waiting for it to be visible
 */
export const tapElement = async (
  elementMatcher: Detox.NativeMatcher,
  timeout: number = 10000
) => {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).tap();
};

/**
 * Type text into input field
 */
export const typeText = async (
  elementMatcher: Detox.NativeMatcher,
  text: string,
  timeout: number = 10000
) => {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).typeText(text);
};

/**
 * Clear text from input field
 */
export const clearText = async (
  elementMatcher: Detox.NativeMatcher,
  timeout: number = 10000
) => {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).clearText();
};

/**
 * Replace text in input field
 */
export const replaceText = async (
  elementMatcher: Detox.NativeMatcher,
  text: string,
  timeout: number = 10000
) => {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).replaceText(text);
};

/**
 * Scroll to element in ScrollView
 */
export const scrollToElement = async (
  scrollViewMatcher: Detox.NativeMatcher,
  elementMatcher: Detox.NativeMatcher,
  direction: 'up' | 'down' | 'left' | 'right' = 'down'
) => {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .whileElement(elementMatcher)
    .scroll(200, direction);
};

/**
 * Swipe on element
 */
export const swipeElement = async (
  elementMatcher: Detox.NativeMatcher,
  direction: 'up' | 'down' | 'left' | 'right',
  speed: 'fast' | 'slow' = 'fast'
) => {
  await element(elementMatcher).swipe(direction, speed);
};

/**
 * Take screenshot
 */
export const takeScreenshot = async (name: string) => {
  await device.takeScreenshot(name);
};

/**
 * Reload React Native app
 */
export const reloadApp = async () => {
  await device.reloadReactNative();
};

/**
 * Open app notifications (iOS)
 */
export const openNotifications = async () => {
  if (device.getPlatform() === 'ios') {
    await device.launchApp({ newInstance: false });
    await device.openURL({ url: 'notifications' });
  }
};

/**
 * Send app to background
 */
export const sendToBackground = async (duration: number = 2000) => {
  await device.sendToHome();
  await new Promise(resolve => setTimeout(resolve, duration));
  await device.launchApp({ newInstance: false });
};

/**
 * Wait for specified time
 */
export const wait = async (ms: number) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Login helper (if auth is required)
 */
export const login = async (phone: string, otp: string = '123456') => {
  // Navigate to login screen
  await waitForElement(by.id('login-phone-input'));
  await typeText(by.id('login-phone-input'), phone);
  await tapElement(by.id('send-otp-button'));

  // Wait for OTP screen
  await waitForElement(by.id('otp-input'));
  await typeText(by.id('otp-input'), otp);
  await tapElement(by.id('verify-otp-button'));

  // Wait for home screen
  await waitForElement(by.id('home-screen'));
};

/**
 * Logout helper
 */
export const logout = async () => {
  await tapElement(by.id('profile-tab'));
  await tapElement(by.id('logout-button'));
  await tapElement(by.text('Confirm')); // Confirm logout
};

/**
 * Navigate to product page
 */
export const navigateToProduct = async (productId: string) => {
  await tapElement(by.id('home-tab'));
  await tapElement(by.id(`product-card-${productId}`));
  await waitForElement(by.id('product-page'));
};

/**
 * Add product to cart
 */
export const addToCart = async () => {
  await tapElement(by.id('add-to-cart-button'));
  await waitForElement(by.id('added-to-cart-toast'));
};

/**
 * Navigate to cart
 */
export const navigateToCart = async () => {
  await tapElement(by.id('cart-icon'));
  await waitForElement(by.id('cart-page'));
};

/**
 * Check if element exists
 */
export const elementExists = async (
  elementMatcher: Detox.NativeMatcher
): Promise<boolean> => {
  try {
    await detoxExpect(element(elementMatcher)).toExist();
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if element is visible
 */
export const elementIsVisible = async (
  elementMatcher: Detox.NativeMatcher
): Promise<boolean> => {
  try {
    await detoxExpect(element(elementMatcher)).toBeVisible();
    return true;
  } catch {
    return false;
  }
};

/**
 * Get element text
 */
export const getElementText = async (
  elementMatcher: Detox.NativeMatcher
): Promise<string> => {
  const attributes = await element(elementMatcher).getAttributes();
  return attributes.text || '';
};

/**
 * Assert element has text
 */
export const assertElementText = async (
  elementMatcher: Detox.NativeMatcher,
  expectedText: string
) => {
  await detoxExpect(element(elementMatcher)).toHaveText(expectedText);
};

/**
 * Assert element contains text
 */
export const assertElementContainsText = async (
  elementMatcher: Detox.NativeMatcher,
  expectedText: string
) => {
  const text = await getElementText(elementMatcher);
  if (!text.includes(expectedText)) {
    throw new Error(`Element text "${text}" does not contain "${expectedText}"`);
  }
};

export default {
  waitForElement,
  tapElement,
  typeText,
  clearText,
  replaceText,
  scrollToElement,
  swipeElement,
  takeScreenshot,
  reloadApp,
  openNotifications,
  sendToBackground,
  wait,
  login,
  logout,
  navigateToProduct,
  addToCart,
  navigateToCart,
  elementExists,
  elementIsVisible,
  getElementText,
  assertElementText,
  assertElementContainsText,
};
