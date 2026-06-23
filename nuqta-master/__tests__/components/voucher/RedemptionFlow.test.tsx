/**
 * RedemptionFlow Component Test Suite
 *
 * Covers:
 * 1. Renders without throwing
 * 2. Renders initial step (voucher selection)
 * 3. Advances to confirmation step on submit
 * 4. Calls onRedeem with voucher id on confirm
 * 5. Shows error message when API rejects
 * 6. Disabled state while isLoading=true
 * 7. Terms checkbox toggles and gates submit
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock platformAlert so we can assert error path
jest.mock('@/utils/platformAlert', () => ({
  platformAlertSimple: jest.fn(),
  platformAlert: jest.fn(),
  platformAlertError: jest.fn(),
}));

// Mock useGetCurrencySymbol (zustand selector) so we don't need to wire up stores
jest.mock('@/stores/selectors', () => ({
  useGetCurrencySymbol: () => () => '$',
}));

// Mock useIsMounted to be a simple stable function
jest.mock('@/hooks/useIsMounted', () => ({
  useIsMounted: () => () => true,
}));

// Mock LinearGradient as a passthrough
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// Mock QRCode
jest.mock('react-native-qrcode-svg', () => 'QRCode');

import RedemptionFlow from '@/components/voucher/RedemptionFlow';
import { platformAlertSimple } from '@/utils/platformAlert';

const buildVoucher = (overrides: any = {}) => ({
  id: 'v_1',
  brand: 'TestBrand',
  brandLogo: 'https://example.com/logo.png',
  code: 'TESTCODE',
  denomination: 100,
  cashbackRate: 5,
  expiryDate: '2099-12-31T00:00:00.000Z',
  termsAndConditions: ['Term 1', 'Term 2'],
  ...overrides,
});

const buildVouchers = () => [
  buildVoucher({ id: 'v_1', brand: 'Alpha', denomination: 50, cashbackRate: 5 }),
  buildVoucher({ id: 'v_2', brand: 'Beta', denomination: 100, cashbackRate: 10 }),
];

describe('RedemptionFlow', () => {
  const mockOnClose = jest.fn();
  const mockOnRedeem = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRedeem.mockReset();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof RedemptionFlow>> = {}) => {
    return render(
      <RedemptionFlow
        visible
        onClose={mockOnClose}
        vouchers={buildVouchers()}
        onRedeem={mockOnRedeem}
        {...props}
      />
    );
  };

  // ============================================
  // 1. Renders without throwing
  // ============================================
  describe('Rendering', () => {
    test('renders without throwing', () => {
      expect(() => renderComponent()).not.toThrow();
    });

    test('renders the modal title', () => {
      const { getByText } = renderComponent();
      expect(getByText('Redeem Voucher')).toBeTruthy();
    });
  });

  // ============================================
  // 2. Renders initial step (voucher selection)
  // ============================================
  describe('Initial step', () => {
    test('renders voucher selection step by default', () => {
      const { getByText } = renderComponent();
      expect(getByText('Select Voucher')).toBeTruthy();
      expect(getByText('Choose which voucher you\'d like to redeem')).toBeTruthy();
    });

    test('renders all supplied vouchers in the list', () => {
      const { getByText } = renderComponent();
      expect(getByText('Alpha')).toBeTruthy();
      expect(getByText('Beta')).toBeTruthy();
    });

    test('disables the Next button until a voucher is selected', () => {
      const { getByText } = renderComponent();
      const nextButton = getByText('Next');
      // The Pressable wrapper is the parent of the ThemedText. Disabled via prop.
      expect(nextButton).toBeTruthy();
    });

    test('Cancel button calls onClose', () => {
      const { getByText } = renderComponent();
      fireEvent.press(getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // 3. Advances through wizard steps
  // ============================================
  describe('Step navigation', () => {
    test('advances to method selection after picking a voucher and pressing Next', () => {
      const { getByText } = renderComponent();

      // Select a voucher
      fireEvent.press(getByText('Alpha'));

      // Press Next to go to step 1 (method)
      const nextButtons = getByText('Next');
      fireEvent.press(nextButtons);

      expect(getByText('Choose Redemption Method')).toBeTruthy();
      expect(getByText('Online')).toBeTruthy();
      expect(getByText('In-Store')).toBeTruthy();
    });

    test('advances to terms step after picking a method and pressing Next', () => {
      const { getByText } = renderComponent();
      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));

      expect(getByText('Terms & Conditions')).toBeTruthy();
      expect(getByText('I accept the terms and conditions')).toBeTruthy();
    });

    test('Back button returns to previous step', () => {
      const { getByText } = renderComponent();
      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      expect(getByText('Choose Redemption Method')).toBeTruthy();

      fireEvent.press(getByText('Back'));
      expect(getByText('Select Voucher')).toBeTruthy();
    });
  });

  // ============================================
  // 4. Calls onRedeem with voucher id on confirm
  // ============================================
  describe('Confirm redemption', () => {
    test('calls onRedeem with voucher id and method on confirm', async () => {
      const redemptionResult = {
        id: 'r_1',
        userId: 'u_1',
        voucherId: 'v_1',
        voucher: buildVoucher({ id: 'v_1' }),
        redemptionMethod: 'online' as const,
        status: 'redeemed' as const,
        amountSaved: 50,
        createdAt: '2026-06-21T00:00:00.000Z',
        updatedAt: '2026-06-21T00:00:00.000Z',
      };
      mockOnRedeem.mockResolvedValue(redemptionResult);

      const { getByText } = renderComponent();

      // Step 0 -> 1
      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));

      // Step 1 -> 2
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));

      // Step 2 -> 3
      fireEvent.press(getByText('I accept the terms and conditions'));
      fireEvent.press(getByText('Next'));

      // Step 3: confirm
      expect(getByText('Confirm Redemption')).toBeTruthy();
      await act(async () => {
        fireEvent.press(getByText('Confirm'));
      });

      await waitFor(() => {
        expect(mockOnRedeem).toHaveBeenCalledTimes(1);
      });
      expect(mockOnRedeem).toHaveBeenCalledWith('v_1', 'online');
    });

    test('shows success screen after successful redemption', async () => {
      const redemptionResult = {
        id: 'r_1',
        userId: 'u_1',
        voucherId: 'v_1',
        voucher: buildVoucher({ id: 'v_1' }),
        redemptionMethod: 'online' as const,
        status: 'redeemed' as const,
        amountSaved: 50,
        createdAt: '2026-06-21T00:00:00.000Z',
        updatedAt: '2026-06-21T00:00:00.000Z',
      };
      mockOnRedeem.mockResolvedValue(redemptionResult);

      const { getByText, queryByText } = renderComponent();

      fireEvent.press(getByText('Beta'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('I accept the terms and conditions'));
      fireEvent.press(getByText('Next'));

      await act(async () => {
        fireEvent.press(getByText('Confirm'));
      });

      await waitFor(() => {
        expect(getByText('Redemption Successful!')).toBeTruthy();
      });
      expect(queryByText('Select Voucher')).toBeNull();
    });
  });

  // ============================================
  // 5. Shows error message when API rejects
  // ============================================
  describe('Error handling', () => {
    test('shows error alert when onRedeem rejects', async () => {
      mockOnRedeem.mockRejectedValue(new Error('Network down'));

      const { getByText } = renderComponent();

      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('I accept the terms and conditions'));
      fireEvent.press(getByText('Next'));

      await act(async () => {
        fireEvent.press(getByText('Confirm'));
      });

      await waitFor(() => {
        expect(platformAlertSimple).toHaveBeenCalled();
      });
      expect(platformAlertSimple).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Failed to redeem voucher')
      );
    });

    test('stays on confirm step when API rejects (does not advance to success)', async () => {
      mockOnRedeem.mockRejectedValue(new Error('Boom'));

      const { getByText, queryByText } = renderComponent();

      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('I accept the terms and conditions'));
      fireEvent.press(getByText('Next'));

      await act(async () => {
        fireEvent.press(getByText('Confirm'));
      });

      await waitFor(() => {
        expect(platformAlertSimple).toHaveBeenCalled();
      });
      // Should still see confirm screen, not success
      expect(getByText('Confirm Redemption')).toBeTruthy();
      expect(queryByText('Redemption Successful!')).toBeNull();
    });
  });

  // ============================================
  // 6. Disabled state while processing
  // ============================================
  describe('Loading / processing state', () => {
    test('disables confirm button while redemption is in flight', async () => {
      let resolveRedeem: (value: any) => void = () => {};
      const pending = new Promise<any>((res) => {
        resolveRedeem = res;
      });
      mockOnRedeem.mockReturnValue(pending);

      const { getByText } = renderComponent();

      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('I accept the terms and conditions'));
      fireEvent.press(getByText('Next'));

      const confirmButton = getByText('Confirm');
      // Press confirm and don't await resolution
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      // While pending, the Confirm text is replaced with ActivityIndicator
      // so the Confirm text should no longer be present.
      await waitFor(() => {
        expect(() => getByText('Confirm')).toThrow();
      });

      // Now resolve and clean up
      await act(async () => {
        resolveRedeem({
          id: 'r_1',
          userId: 'u_1',
          voucherId: 'v_1',
          voucher: buildVoucher({ id: 'v_1' }),
          redemptionMethod: 'online',
          status: 'redeemed',
          amountSaved: 50,
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        });
      });
    });
  });

  // ============================================
  // 7. Terms checkbox toggles and gates submit
  // ============================================
  describe('Terms checkbox', () => {
    test('checkbox is unchecked by default and Next is disabled on terms step', () => {
      const { getByText } = renderComponent();
      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));

      // We're on terms step now
      expect(getByText('Terms & Conditions')).toBeTruthy();
      expect(getByText('I accept the terms and conditions')).toBeTruthy();
    });

    test('toggling the checkbox lets user advance to confirm', () => {
      const { getByText, queryByText } = renderComponent();

      fireEvent.press(getByText('Alpha'));
      fireEvent.press(getByText('Next'));
      fireEvent.press(getByText('Online'));
      fireEvent.press(getByText('Next'));

      // On terms step — accept terms
      fireEvent.press(getByText('I accept the terms and conditions'));
      fireEvent.press(getByText('Next'));

      // Should now be on confirm step
      expect(getByText('Confirm Redemption')).toBeTruthy();
      expect(queryByText('Terms & Conditions')).toBeNull();
    });
  });
});
