/**
 * E2E Test: Search Flow
 *
 * Tests product search functionality
 */

import { device, element, by, expect as detoxExpect } from 'detox';
import {
  waitForElement,
  tapElement,
  typeText,
  clearText,
  takeScreenshot,
  wait,
} from '../helpers/testHelpers';

describe('Search Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitForElement(by.id('home-screen'));
  });

  it('should display search bar on home screen', async () => {
    await detoxExpect(element(by.id('search-bar'))).toBeVisible();
  });

  it('should focus search input when tapped', async () => {
    await tapElement(by.id('search-input'));

    // Verify keyboard is visible (input focused)
    await detoxExpect(element(by.id('search-input'))).toBeFocused();

    await takeScreenshot('search-input-focused');
  });

  it('should display search suggestions while typing', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'shoe');

    // Wait for suggestions to appear
    await wait(500);

    await detoxExpect(element(by.id('search-suggestions'))).toBeVisible();

    await takeScreenshot('search-suggestions');
  });

  it('should search for products', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');

    // Submit search
    await tapElement(by.id('search-submit-button'));

    // Verify search results page
    await waitForElement(by.id('search-results-page'));
    await detoxExpect(element(by.id('search-results-page'))).toBeVisible();

    await takeScreenshot('search-results');
  });

  it('should display search results', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await waitForElement(by.id('search-results-page'));

    // Verify results list
    await detoxExpect(element(by.id('search-results-list'))).toBeVisible();

    // Verify at least one result
    await detoxExpect(element(by.id('search-result-0'))).toBeVisible();
  });

  it('should display "no results" message for invalid search', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'xyzabc123notfound');
    await tapElement(by.id('search-submit-button'));
    await wait(1000);

    // Verify no results message
    await detoxExpect(element(by.id('no-results-message'))).toBeVisible();

    await takeScreenshot('no-search-results');
  });

  it('should navigate to product from search results', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await waitForElement(by.id('search-results-page'));

    // Tap first result
    await tapElement(by.id('search-result-0'));

    // Verify product page opened
    await waitForElement(by.id('product-page'));
    await detoxExpect(element(by.id('product-page'))).toBeVisible();
  });

  it('should clear search input', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');

    // Tap clear button
    await tapElement(by.id('search-clear-button'));

    // Verify input is empty
    await detoxExpect(element(by.id('search-input'))).toHaveText('');
  });

  it('should show recent searches', async () => {
    // Perform a search
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await wait(1000);

    // Go back and open search again
    await tapElement(by.id('back-button'));
    await tapElement(by.id('search-input'));

    // Verify recent searches shown
    await detoxExpect(element(by.id('recent-searches'))).toBeVisible();
    await detoxExpect(element(by.id('recent-search-0'))).toHaveText('sneakers');

    await takeScreenshot('recent-searches');
  });

  it('should search from recent searches', async () => {
    // Perform initial search
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await wait(1000);

    // Go back
    await tapElement(by.id('back-button'));

    // Open search and tap recent search
    await tapElement(by.id('search-input'));
    await tapElement(by.id('recent-search-0'));

    // Verify search results page
    await waitForElement(by.id('search-results-page'));
    await detoxExpect(element(by.id('search-results-page'))).toBeVisible();
  });

  it('should apply search filters', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await waitForElement(by.id('search-results-page'));

    // Tap filter button
    await tapElement(by.id('filter-button'));

    // Verify filter modal
    await waitForElement(by.id('filter-modal'));
    await detoxExpect(element(by.id('filter-modal'))).toBeVisible();

    await takeScreenshot('search-filters');
  });

  it('should sort search results', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await waitForElement(by.id('search-results-page'));

    // Tap sort button
    await tapElement(by.id('sort-button'));

    // Verify sort options
    await waitForElement(by.id('sort-options'));
    await detoxExpect(element(by.id('sort-option-price-low'))).toBeVisible();
    await detoxExpect(element(by.id('sort-option-price-high'))).toBeVisible();
    await detoxExpect(element(by.id('sort-option-rating'))).toBeVisible();

    // Select sort option
    await tapElement(by.id('sort-option-price-low'));

    await takeScreenshot('search-sorted');
  });

  it('should display search result count', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'sneakers');
    await tapElement(by.id('search-submit-button'));
    await waitForElement(by.id('search-results-page'));

    // Verify result count displayed
    await detoxExpect(element(by.id('search-results-count'))).toBeVisible();
  });

  it('should handle search with special characters', async () => {
    await tapElement(by.id('search-input'));
    await typeText(by.id('search-input'), 'men\'s shoes');
    await tapElement(by.id('search-submit-button'));

    // Should not crash, show results or no results
    await wait(1000);
    await detoxExpect(element(by.id('search-results-page'))).toBeVisible();
  });
});
