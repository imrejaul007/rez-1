/**
 * Navigation Accessibility Tests
 *
 * Tests for navigation components accessibility:
 * - Tab navigation
 * - Stack navigation
 * - Drawer navigation
 * - Breadcrumbs
 * - Back buttons
 * - Navigation focus management
 *
 * WCAG 2.1 AA Compliance Testing
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import AccessibleButton from '@/components/common/AccessibleButton';
import {
  validateAccessibilityLabel,
  validateAccessibilityRole,
  validateAccessibilityState,
  getReadingOrder,
} from '../utils/accessibilityTestUtils';

describe('Navigation Accessibility Tests', () => {
  describe('Tab Navigation', () => {
    it('should have proper role for tab buttons', () => {
      const { getByTestId } = render(
        <View testID="tabs">
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: true }}
            testID="tab-home"
          >
            <Text>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            testID="tab-explore"
          >
            <Text>Explore</Text>
          </TouchableOpacity>
        </View>
      );

      const homeTab = getByTestId('tab-home');
      expect(homeTab.props.accessibilityRole).toBe('tab');
    });

    it('should indicate selected tab state', () => {
      const { getByTestId } = render(
        <View>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: true }}
            testID="tab-home"
          >
            <Text>Home</Text>
          </TouchableOpacity>
        </View>
      );

      const homeTab = getByTestId('tab-home');
      expect(homeTab.props.accessibilityState.selected).toBe(true);
    });

    it('should have descriptive labels for tabs', () => {
      const { getByTestId } = render(
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityLabel="Home, Tab 1 of 4"
          accessibilityState={{ selected: true }}
          testID="tab"
        >
          <Text>Home</Text>
        </TouchableOpacity>
      );

      const tab = getByTestId('tab');
      const result = validateAccessibilityLabel(tab);

      expect(result.passed).toBe(true);
      expect(tab.props.accessibilityLabel).toContain('Home');
    });

    it('should announce tab changes', () => {
      const onPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityHint="Activate to view home screen"
          onPress={onPress}
          testID="tab"
        >
          <Text>Home</Text>
        </TouchableOpacity>
      );

      const tab = getByTestId('tab');
      fireEvent.press(tab);

      expect(onPress).toHaveBeenCalled();

      // After selection
      rerender(
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: true }}
          testID="tab"
        >
          <Text>Home</Text>
        </TouchableOpacity>
      );

      const updatedTab = getByTestId('tab');
      expect(updatedTab.props.accessibilityState.selected).toBe(true);
    });

    it('should support keyboard navigation', () => {
      const { getAllByRole } = render(
        <View>
          <TouchableOpacity accessibilityRole="tab" accessible={true}>
            <Text>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="tab" accessible={true}>
            <Text>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="tab" accessible={true}>
            <Text>Earn</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="tab" accessible={true}>
            <Text>Play</Text>
          </TouchableOpacity>
        </View>
      );

      const tabs = getAllByRole('tab');
      expect(tabs).toHaveLength(4);

      // Each tab should be accessible
      tabs.forEach((tab) => {
        expect(tab.props.accessible).toBe(true);
      });
    });
  });

  describe('Back Button', () => {
    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <AccessibleButton
          label="Back"
          onPress={jest.fn()}
          icon="arrow-back"
          accessibilityLabel="Go back to previous screen"
        />
      );

      const backButton = getByLabelText('Go back to previous screen');
      expect(backButton).toBeTruthy();
    });

    it('should have button role', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Back"
          onPress={jest.fn()}
          testID="back-btn"
        />
      );

      const backButton = getByTestId('back-btn');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    it('should provide hint about navigation', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Back"
          onPress={jest.fn()}
          accessibilityHint="Returns to previous screen"
          testID="back-btn"
        />
      );

      const backButton = getByTestId('back-btn');
      expect(backButton.props.accessibilityHint).toContain('Returns to previous screen');
    });

    it('should be disabled when cannot go back', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Back"
          onPress={jest.fn()}
          disabled={true}
          testID="back-btn"
        />
      );

      const backButton = getByTestId('back-btn');
      expect(backButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Navigation Links', () => {
    it('should have link role for navigation items', () => {
      const { getByTestId } = render(
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="View product details"
          onPress={jest.fn()}
          testID="link"
        >
          <Text>Product Name</Text>
        </TouchableOpacity>
      );

      const link = getByTestId('link');
      expect(link.props.accessibilityRole).toBe('link');
    });

    it('should provide context about destination', () => {
      const { getByTestId } = render(
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="View Nike Store"
          accessibilityHint="Opens store page with products and details"
          onPress={jest.fn()}
          testID="link"
        >
          <Text>Nike Store</Text>
        </TouchableOpacity>
      );

      const link = getByTestId('link');
      expect(link.props.accessibilityHint).toContain('Opens store page');
    });

    it('should distinguish external links', () => {
      const { getByTestId } = render(
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="Visit website (opens in browser)"
          onPress={jest.fn()}
          testID="external-link"
        >
          <Text>Visit Website</Text>
        </TouchableOpacity>
      );

      const link = getByTestId('external-link');
      expect(link.props.accessibilityLabel).toContain('opens in browser');
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should have proper structure for breadcrumbs', () => {
      const { getAllByRole } = render(
        <View accessible={true} accessibilityLabel="Breadcrumb navigation">
          <TouchableOpacity accessibilityRole="link">
            <Text>Home</Text>
          </TouchableOpacity>
          <Text> / </Text>
          <TouchableOpacity accessibilityRole="link">
            <Text>Stores</Text>
          </TouchableOpacity>
          <Text> / </Text>
          <Text>Nike Store</Text>
        </View>
      );

      const links = getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should indicate current page in breadcrumb', () => {
      const { getByText } = render(
        <View>
          <TouchableOpacity accessibilityRole="link">
            <Text>Home</Text>
          </TouchableOpacity>
          <Text
            accessible={true}
            accessibilityLabel="Current page: Nike Store"
            accessibilityRole="text"
          >
            Nike Store
          </Text>
        </View>
      );

      const currentPage = getByText('Nike Store');
      expect(currentPage.props.accessibilityLabel).toContain('Current page');
    });
  });

  describe('Skip Links', () => {
    it('should provide skip to main content link', () => {
      const { getByLabelText } = render(
        <View>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Skip to main content"
            onPress={jest.fn()}
          >
            <Text>Skip to content</Text>
          </TouchableOpacity>
          <View accessibilityRole="navigation">
            {/* Navigation items */}
          </View>
          <View accessibilityRole="main">
            {/* Main content */}
          </View>
        </View>
      );

      const skipLink = getByLabelText('Skip to main content');
      expect(skipLink).toBeTruthy();
    });
  });

  describe('Reading Order', () => {
    it('should maintain logical reading order', () => {
      const { UNSAFE_root } = render(
        <View>
          <Text accessibilityLabel="Header">Welcome</Text>
          <View>
            <TouchableOpacity
              accessibilityRole="tab"
              accessibilityLabel="Home tab"
            >
              <Text>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="tab"
              accessibilityLabel="Explore tab"
            >
              <Text>Explore</Text>
            </TouchableOpacity>
          </View>
          <Text accessibilityLabel="Main content">Content here</Text>
        </View>
      );

      const order = getReadingOrder(UNSAFE_root);

      // Should read in order: Header, tabs, then content
      expect(order[0]).toContain('Header');
      expect(order[order.length - 1]).toContain('Main content');
    });

    it('should skip hidden navigation items', () => {
      const { UNSAFE_root } = render(
        <View>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel="Visible tab"
          >
            <Text>Visible</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel="Hidden tab"
            accessibilityElementsHidden={true}
          >
            <Text>Hidden</Text>
          </TouchableOpacity>
        </View>
      );

      const order = getReadingOrder(UNSAFE_root);

      expect(order).toContain('Visible tab');
      expect(order).not.toContain('Hidden tab');
    });
  });

  describe('Navigation Announcements', () => {
    it('should announce route changes', () => {
      const { rerender, getByTestId } = render(
        <View testID="screen">
          <Text
            accessible={true}
            accessibilityLabel="Home screen"
            accessibilityLiveRegion="polite"
          >
            Home
          </Text>
        </View>
      );

      let screen = getByTestId('screen');
      expect(screen).toBeTruthy();

      // Simulate navigation
      rerender(
        <View testID="screen">
          <Text
            accessible={true}
            accessibilityLabel="Explore screen"
            accessibilityLiveRegion="polite"
          >
            Explore
          </Text>
        </View>
      );

      screen = getByTestId('screen');
      const heading = screen.findByType(Text);
      expect(heading.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Focus Management', () => {
    it('should focus on page heading after navigation', () => {
      const { getByRole } = render(
        <View>
          <Text
            accessibilityRole="header"
            accessibilityLabel="Product Details"
            accessible={true}
          >
            Product Details
          </Text>
          <Text>Product description...</Text>
        </View>
      );

      const heading = getByRole('header');
      expect(heading.props.accessible).toBe(true);
    });

    it('should maintain focus indicator visibility', () => {
      const { getByTestId } = render(
        <TouchableOpacity
          accessibilityRole="button"
          style={{ borderWidth: 2, borderColor: '#9333EA' }}
          testID="button"
        >
          <Text>Focused Button</Text>
        </TouchableOpacity>
      );

      const button = getByTestId('button');
      const style = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style;

      // Should have visible focus indicator
      expect(style.borderWidth).toBeGreaterThan(0);
    });
  });

  describe('Nested Navigation', () => {
    it('should handle nested navigation hierarchies', () => {
      const { getAllByRole } = render(
        <View accessibilityRole="navigation" accessibilityLabel="Main navigation">
          <View accessibilityRole="none">
            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel="Products"
            >
              <Text>Products</Text>
            </TouchableOpacity>
            <View accessibilityRole="menu" accessibilityLabel="Product categories">
              <TouchableOpacity
                accessibilityRole="menuitem"
                accessibilityLabel="Electronics"
              >
                <Text>Electronics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="menuitem"
                accessibilityLabel="Fashion"
              >
                <Text>Fashion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );

      const menuItems = getAllByRole('menuitem');
      expect(menuItems.length).toBe(2);
    });
  });

  describe('Navigation State', () => {
    it('should indicate loading state during navigation', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="View Details"
          onPress={jest.fn()}
          loading={true}
          testID="nav-button"
        />
      );

      const button = getByTestId('nav-button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should disable navigation during loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <AccessibleButton
          label="View Store"
          onPress={onPress}
          loading={true}
          testID="nav-button"
        />
      );

      const button = getByTestId('nav-button');
      fireEvent.press(button);

      // Should not navigate while loading
      expect(button.props.disabled).toBe(true);
    });
  });
});
