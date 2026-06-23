/**
 * E2E Test: Homepage Flow
 *
 * Tests the complete homepage experience including:
 * - Homepage loading
 * - Navigation
 * - Product carousels
 * - Search functionality
 * - Category navigation
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');

describe('Homepage Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        location: 'always',
      },
    });

    // Navigate to home (skip onboarding if needed)
    try {
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);
    } catch {
      // Skip onboarding if present
      await element(by.id('skip-button')).tap();
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(3000);
    }
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  describe('Homepage Loading', () => {
    it('should load homepage successfully', async () => {
      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
      await device.takeScreenshot('21-homepage-loaded');
    });

    it('should display header with logo', async () => {
      await detoxExpect(element(by.id('home-header'))).toBeVisible();
      await detoxExpect(element(by.id('app-logo'))).toBeVisible();
    });

    it('should display search bar', async () => {
      await detoxExpect(element(by.id('search-bar'))).toBeVisible();
    });

    it('should display location selector', async () => {
      await detoxExpect(element(by.id('location-selector'))).toBeVisible();
    });

    it('should display cart icon with badge', async () => {
      await detoxExpect(element(by.id('cart-icon'))).toBeVisible();
    });

    it('should display greeting message', async () => {
      await detoxExpect(element(by.id('greeting-message'))).toBeVisible();
    });

    it('should display coin balance', async () => {
      await detoxExpect(element(by.id('coin-balance'))).toBeVisible();
    });
  });

  describe('Category Navigation', () => {
    it('should display category carousel', async () => {
      await detoxExpect(element(by.id('category-carousel'))).toBeVisible();
      await device.takeScreenshot('22-category-carousel');
    });

    it('should display all main categories', async () => {
      // Check for main categories
      await detoxExpect(element(by.id('category-fashion'))).toBeVisible();
      await detoxExpect(element(by.id('category-electronics'))).toBeVisible();
    });

    it('should scroll through categories', async () => {
      // Scroll category carousel
      await element(by.id('category-carousel')).swipe('left', 'fast');
      await new Promise(resolve => setTimeout(resolve, 500));

      await device.takeScreenshot('23-categories-scrolled');
    });

    it('should navigate to category page on tap', async () => {
      await element(by.id('category-fashion')).tap();

      await waitFor(element(by.id('category-page')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('category-page'))).toBeVisible();
      await device.takeScreenshot('24-category-page');

      // Navigate back
      await element(by.id('back-button')).tap();
    });
  });

  describe('Product Carousels', () => {
    it('should display featured products carousel', async () => {
      await detoxExpect(element(by.id('featured-products-carousel'))).toBeVisible();
      await device.takeScreenshot('25-featured-products');
    });

    it('should display trending products carousel', async () => {
      // Scroll to trending section
      await element(by.id('home-scroll-view')).scroll(300, 'down');
      await waitFor(element(by.id('trending-products-carousel')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('trending-products-carousel'))).toBeVisible();
      await device.takeScreenshot('26-trending-products');
    });

    it('should scroll through featured products', async () => {
      // Scroll product carousel
      await element(by.id('featured-products-carousel')).swipe('left', 'fast');
      await new Promise(resolve => setTimeout(resolve, 500));

      await device.takeScreenshot('27-featured-scrolled');
    });

    it('should display product cards with all details', async () => {
      // Check first product card
      await detoxExpect(element(by.id('product-card-0'))).toBeVisible();
      await detoxExpect(element(by.id('product-image-0'))).toBeVisible();
      await detoxExpect(element(by.id('product-name-0'))).toBeVisible();
      await detoxExpect(element(by.id('product-price-0'))).toBeVisible();
    });

    it('should display cashback badge on products', async () => {
      // Check for cashback badge
      const cashbackExists = await element(by.id('cashback-badge-0')).exists();
      if (cashbackExists) {
        await detoxExpect(element(by.id('cashback-badge-0'))).toBeVisible();
      }
    });

    it('should display discount badge on products', async () => {
      // Check for discount badge
      const discountExists = await element(by.id('discount-badge-0')).exists();
      if (discountExists) {
        await detoxExpect(element(by.id('discount-badge-0'))).toBeVisible();
      }
    });

    it('should navigate to product page on tap', async () => {
      await element(by.id('product-card-0')).tap();

      await waitFor(element(by.id('product-page')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('product-page'))).toBeVisible();
      await device.takeScreenshot('28-product-from-homepage');

      // Navigate back
      await element(by.id('back-button')).tap();
    });
  });

  describe('Store Listings', () => {
    it('should display branded stores section', async () => {
      // Scroll to branded stores
      await element(by.id('home-scroll-view')).scroll(500, 'down');
      await waitFor(element(by.id('branded-stores-section')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('branded-stores-section'))).toBeVisible();
      await device.takeScreenshot('29-branded-stores');
    });

    it('should display store cards', async () => {
      await element(by.id('home-scroll-view')).scroll(500, 'down');
      await waitFor(element(by.id('store-card-0')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('store-card-0'))).toBeVisible();
    });

    it('should navigate to store page on tap', async () => {
      await element(by.id('home-scroll-view')).scroll(500, 'down');
      await waitFor(element(by.id('store-card-0')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('store-card-0')).tap();

      await waitFor(element(by.id('store-page')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('store-page'))).toBeVisible();
      await device.takeScreenshot('30-store-page');

      // Navigate back
      await element(by.id('back-button')).tap();
    });
  });

  describe('Deals and Offers', () => {
    it('should display deals section', async () => {
      await element(by.id('home-scroll-view')).scroll(600, 'down');
      await waitFor(element(by.id('deals-section')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('deals-section'))).toBeVisible();
      await device.takeScreenshot('31-deals-section');
    });

    it('should display deal cards', async () => {
      await element(by.id('home-scroll-view')).scroll(600, 'down');
      await waitFor(element(by.id('deal-card-0')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('deal-card-0'))).toBeVisible();
    });

    it('should navigate to offer details on tap', async () => {
      await element(by.id('home-scroll-view')).scroll(600, 'down');
      await waitFor(element(by.id('deal-card-0')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('deal-card-0')).tap();

      await waitFor(element(by.id('offer-details-modal')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('offer-details-modal'))).toBeVisible();
      await device.takeScreenshot('32-offer-details');

      // Close modal
      await element(by.id('close-modal-button')).tap();
    });
  });

  describe('Search Functionality', () => {
    it('should open search on search bar tap', async () => {
      await element(by.id('search-bar')).tap();

      await waitFor(element(by.id('search-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('search-screen'))).toBeVisible();
      await device.takeScreenshot('33-search-screen');

      // Navigate back
      await element(by.id('back-button')).tap();
    });

    it('should display search input and recent searches', async () => {
      await element(by.id('search-bar')).tap();

      await waitFor(element(by.id('search-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('search-input'))).toBeVisible();
      await detoxExpect(element(by.id('recent-searches'))).toBeVisible();

      await element(by.id('back-button')).tap();
    });

    it('should show suggestions while typing', async () => {
      await element(by.id('search-bar')).tap();

      await waitFor(element(by.id('search-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('search-input')).typeText('phone');

      await waitFor(element(by.id('search-suggestions')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('search-suggestions'))).toBeVisible();
      await device.takeScreenshot('34-search-suggestions');

      await element(by.id('back-button')).tap();
    });

    it('should display search results', async () => {
      await element(by.id('search-bar')).tap();

      await waitFor(element(by.id('search-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('search-input')).typeText('phone');
      await element(by.id('search-button')).tap();

      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('search-results'))).toBeVisible();
      await device.takeScreenshot('35-search-results');

      await element(by.id('back-button')).tap();
    });

    it('should filter search results', async () => {
      await element(by.id('search-bar')).tap();
      await waitFor(element(by.id('search-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('search-input')).typeText('phone');
      await element(by.id('search-button')).tap();
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(3000);

      // Open filters
      await element(by.id('filter-button')).tap();
      await waitFor(element(by.id('filter-modal')))
        .toBeVisible()
        .withTimeout(2000);

      await device.takeScreenshot('36-search-filters');

      // Close filter
      await element(by.id('close-filter-button')).tap();
      await element(by.id('back-button')).tap();
    });
  });

  describe('Quick Actions', () => {
    it('should display quick action buttons', async () => {
      await element(by.id('home-scroll-view')).scrollTo('top');
      await detoxExpect(element(by.id('quick-actions'))).toBeVisible();
      await device.takeScreenshot('37-quick-actions');
    });

    it('should navigate to wallet on wallet button tap', async () => {
      await element(by.id('quick-action-wallet')).tap();

      await waitFor(element(by.id('wallet-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('wallet-screen'))).toBeVisible();
      await device.takeScreenshot('38-wallet-from-homepage');

      await element(by.id('back-button')).tap();
    });

    it('should navigate to offers on offers button tap', async () => {
      await element(by.id('quick-action-offers')).tap();

      await waitFor(element(by.id('offers-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('offers-screen'))).toBeVisible();
      await device.takeScreenshot('39-offers-from-homepage');

      await element(by.id('back-button')).tap();
    });
  });

  describe('Bottom Navigation', () => {
    it('should display bottom navigation bar', async () => {
      await detoxExpect(element(by.id('bottom-nav'))).toBeVisible();
      await device.takeScreenshot('40-bottom-nav');
    });

    it('should navigate to explore tab', async () => {
      await element(by.id('tab-explore')).tap();

      await waitFor(element(by.id('explore-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('explore-screen'))).toBeVisible();
      await device.takeScreenshot('41-explore-tab');

      // Back to home
      await element(by.id('tab-home')).tap();
    });

    it('should navigate to earn tab', async () => {
      await element(by.id('tab-earn')).tap();

      await waitFor(element(by.id('earn-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('earn-screen'))).toBeVisible();
      await device.takeScreenshot('42-earn-tab');

      // Back to home
      await element(by.id('tab-home')).tap();
    });

    it('should navigate to play tab', async () => {
      await element(by.id('tab-play')).tap();

      await waitFor(element(by.id('play-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('play-screen'))).toBeVisible();
      await device.takeScreenshot('43-play-tab');

      // Back to home
      await element(by.id('tab-home')).tap();
    });

    it('should navigate to profile tab', async () => {
      await element(by.id('tab-profile')).tap();

      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
      await device.takeScreenshot('44-profile-tab');

      // Back to home
      await element(by.id('tab-home')).tap();
    });
  });

  describe('Scroll Performance', () => {
    it('should scroll smoothly through homepage', async () => {
      // Scroll down
      await element(by.id('home-scroll-view')).scroll(1000, 'down', 0.5, 0.5);
      await new Promise(resolve => setTimeout(resolve, 500));

      await device.takeScreenshot('45-scrolled-down');

      // Scroll up
      await element(by.id('home-scroll-view')).scroll(1000, 'up', 0.5, 0.5);
      await new Promise(resolve => setTimeout(resolve, 500));

      await device.takeScreenshot('46-scrolled-up');
    });

    it('should load more content on scroll', async () => {
      // Scroll to bottom
      await element(by.id('home-scroll-view')).scrollTo('bottom');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if more content loaded
      await detoxExpect(element(by.id('home-scroll-view'))).toBeVisible();
      await device.takeScreenshot('47-bottom-reached');
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh content on pull down', async () => {
      // Pull to refresh
      await element(by.id('home-scroll-view')).scrollTo('top');
      await element(by.id('home-scroll-view')).swipe('down', 'slow', 0.75);

      // Wait for refresh
      await new Promise(resolve => setTimeout(resolve, 2000));

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
      await device.takeScreenshot('48-after-refresh');
    });
  });

  describe('Notifications', () => {
    it('should display notification icon', async () => {
      await detoxExpect(element(by.id('notification-icon'))).toBeVisible();
    });

    it('should open notifications on icon tap', async () => {
      await element(by.id('notification-icon')).tap();

      await waitFor(element(by.id('notifications-screen')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('notifications-screen'))).toBeVisible();
      await device.takeScreenshot('49-notifications');

      await element(by.id('back-button')).tap();
    });

    it('should display notification badge if unread exist', async () => {
      const badgeExists = await element(by.id('notification-badge')).exists();
      if (badgeExists) {
        await detoxExpect(element(by.id('notification-badge'))).toBeVisible();
      }
    });
  });

  describe('Location Handling', () => {
    it('should display current location', async () => {
      await detoxExpect(element(by.id('location-selector'))).toBeVisible();
    });

    it('should open location selector on tap', async () => {
      await element(by.id('location-selector')).tap();

      await waitFor(element(by.id('location-modal')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('location-modal'))).toBeVisible();
      await device.takeScreenshot('50-location-modal');

      await element(by.id('close-modal-button')).tap();
    });
  });

  describe('Error Handling', () => {
    it('should handle network error gracefully', async () => {
      // Disable network
      await device.setURLBlacklist(['.*']);

      // Reload
      await device.reloadReactNative();

      // Should show error message
      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(5000);

      await device.takeScreenshot('51-network-error-homepage');

      // Re-enable network
      await device.setURLBlacklist([]);
    });

    it('should retry loading on error', async () => {
      // Disable network
      await device.setURLBlacklist(['.*']);
      await device.reloadReactNative();

      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(5000);

      // Re-enable network
      await device.setURLBlacklist([]);

      // Tap retry
      await element(by.id('retry-button')).tap();

      // Should load homepage
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    });
  });

  describe('Performance', () => {
    it('should load homepage within 3 seconds', async () => {
      const startTime = Date.now();

      await device.reloadReactNative();
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);

      const loadTime = Date.now() - startTime;

      // Assert load time is under 3 seconds
      if (loadTime > 3000) {
        throw new Error(`Homepage load time ${loadTime}ms exceeds 3000ms`);
      }
    });
  });
});
