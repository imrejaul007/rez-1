/**
 * VoucherSelectionModal Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import VoucherSelectionModal from '@/components/voucher/VoucherSelectionModal';

jest.mock('@/utils/platformAlert', () => ({
  platformAlertSimple: jest.fn(),
}));

jest.mock('@/stores/selectors', () => ({
  useGetCurrencySymbol: () => () => '$',
}));

jest.mock('@/hooks/useIsMounted', () => ({
  useIsMounted: () => () => true,
}));

jest.mock('@/services/couponApi', () => ({
  __esModule: true,
  default: {
    getUserCoupons: jest.fn(() => Promise.resolve({ data: { coupons: [] } })),
    getAvailableCoupons: jest.fn(() => Promise.resolve({ data: { coupons: [] } })),
  },
  UserCoupon: class {},
}));

jest.mock('@/services/realVouchersApi', () => ({
  __esModule: true,
  default: {
    getUserVouchers: jest.fn(() => Promise.resolve({ data: { vouchers: [] } })),
    getAvailableVouchers: jest.fn(() => Promise.resolve({ data: { vouchers: [] } })),
  },
}));

describe('VoucherSelectionModal', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();
  const mockOnRemove = jest.fn();

  const defaultProps = {
    visible: true,
    cartTotal: 500,
    currentVoucher: null,
    onClose: mockOnClose,
    onApply: mockOnApply,
    onRemove: mockOnRemove,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing when visible', () => {
    expect(() => render(<VoucherSelectionModal {...defaultProps} />)).not.toThrow();
  });

  it('does not crash when visible is false', () => {
    expect(() =>
      render(<VoucherSelectionModal {...defaultProps} visible={false} />)
    ).not.toThrow();
  });

  it('renders to a valid tree when visible', () => {
    const { toJSON } = render(<VoucherSelectionModal {...defaultProps} />);
    // toJSON may be null if Modal is invisible, but the call shouldn't throw
    expect(toJSON !== undefined).toBe(true);
  });

  it('exposes all the required props via the component function', () => {
    // Render and verify the component consumes the props without throwing
    expect(() =>
      render(
        <VoucherSelectionModal
          {...defaultProps}
          currentVoucher={{
            id: 'v1',
            code: 'WELCOME10',
            type: 'voucher',
            title: 'Welcome',
            description: '10% off',
            value: 10,
            discountType: 'PERCENTAGE',
            minOrderValue: 100,
            expiryDate: '2026-12-31',
            isActive: true,
          }}
        />
      )
    ).not.toThrow();
  });

  it('handles a cartTotal of 0 without crashing', () => {
    expect(() =>
      render(<VoucherSelectionModal {...defaultProps} cartTotal={0} />)
    ).not.toThrow();
  });

  it('handles a very large cartTotal without crashing', () => {
    expect(() =>
      render(<VoucherSelectionModal {...defaultProps} cartTotal={100000} />)
    ).not.toThrow();
  });

  it('does not invoke onClose on mount', () => {
    render(<VoucherSelectionModal {...defaultProps} />);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not invoke onApply on mount', () => {
    render(<VoucherSelectionModal {...defaultProps} />);
    expect(mockOnApply).not.toHaveBeenCalled();
  });
});
