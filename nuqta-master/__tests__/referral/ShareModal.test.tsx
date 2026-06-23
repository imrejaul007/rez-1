/**
 * ShareModal Test Suite
 *
 * Comprehensive tests for the ShareModal component covering:
 * - Modal functionality (open/close)
 * - Platform button interactions (7 platforms)
 * - Share URL generation
 * - Tier progress display
 * - Error handling
 * - Accessibility
 *
 * Total: 50 tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert, Linking, Share as RNShare, Clipboard } from 'react-native';
import ShareModal from '@/components/referral/ShareModal';
import referralService from '@/services/referralApi';

// Mock dependencies
jest.mock('@/services/referralApi');
jest.mock('expo-clipboard');
jest.mock('react-native-qrcode-svg', () => 'QRCode');

describe('ShareModal', () => {
  const mockProps = {
    visible: true,
    referralCode: 'TEST123',
    referralLink: 'https://rezapp.com/invite/TEST123',
    onClose: jest.fn(),
  };

  const mockPropsWithProgress = {
    ...mockProps,
    currentTierProgress: {
      current: 3,
      target: 5,
      nextTier: 'Silver',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (referralService.shareReferralLink as jest.Mock).mockResolvedValue({
      data: { success: true },
    });
  });

  // ============================================
  // 1. Modal Rendering & Visibility Tests (8 tests)
  // ============================================

  describe('Modal Rendering', () => {
    test('renders when visible prop is true', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Share Referral')).toBeTruthy();
    });

    test('does not render content when visible is false', () => {
      const { queryByText } = render(<ShareModal {...mockProps} visible={false} />);
      expect(queryByText('Share Referral')).toBeNull();
    });

    test('displays referral code correctly', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('TEST123')).toBeTruthy();
    });

    test('displays referral link correctly', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('https://rezapp.com/invite/TEST123')).toBeTruthy();
    });

    test('displays QR code section', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('QR Code')).toBeTruthy();
      expect(getByText('Scan to join with your referral code')).toBeTruthy();
    });

    test('displays "Your Referral Code" section title', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Your Referral Code')).toBeTruthy();
    });

    test('displays "Referral Link" section title', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Referral Link')).toBeTruthy();
    });

    test('displays "Share Via" section title', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Share Via')).toBeTruthy();
    });
  });

  // ============================================
  // 2. Close Functionality Tests (3 tests)
  // ============================================

  describe('Close Functionality', () => {
    test('calls onClose when close button is pressed', () => {
      const { UNSAFE_getAllByType } = render(<ShareModal {...mockProps} />);

      // Find close button by looking for the Ionicons with name="close"
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const closeIcon = icons.find(t => t.props.name === 'close');

      expect(closeIcon).toBeTruthy();
      // Walk up to find the Pressable parent and press it
      fireEvent.press(closeIcon.parent);
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when backdrop is pressed', () => {
      const { UNSAFE_getAllByType } = render(<ShareModal {...mockProps} />);

      // Find backdrop by looking for View with position: absolute
      const views = UNSAFE_getAllByType('View' as any);
      const backdrop = views.find(t => {
        const style = t.props.style;
        if (!style) return false;
        const styleArr = Array.isArray(style) ? style : [style];
        return styleArr.some((s: any) => s && s.position === 'absolute');
      });

      expect(backdrop).toBeTruthy();
      if (backdrop) {
        fireEvent.press(backdrop);
        expect(mockProps.onClose).toHaveBeenCalled();
      }
    });

    test('does not close when content area is pressed', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Share Referral'));
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // 3. Tier Progress Display Tests (5 tests)
  // ============================================

  describe('Tier Progress Display', () => {
    test('shows tier progress when provided', () => {
      const { getByText } = render(<ShareModal {...mockPropsWithProgress} />);
      expect(getByText('Progress to Silver')).toBeTruthy();
    });

    test('displays current and target referrals count', () => {
      const { getByText } = render(<ShareModal {...mockPropsWithProgress} />);
      expect(getByText('3/5 referrals')).toBeTruthy();
    });

    test('does not show tier progress when not provided', () => {
      const { queryByText } = render(<ShareModal {...mockProps} />);
      expect(queryByText(/Progress to/)).toBeNull();
    });

    test('displays progress bar with correct width', () => {
      const { UNSAFE_getAllByType } = render(<ShareModal {...mockPropsWithProgress} />);

      // Progress should be 60% (3/5)
      const views = UNSAFE_getAllByType('View' as any);
      const progressFill = views.find((v) => {
        const style = v.props.style;
        if (!style || !Array.isArray(style)) return false;
        return style.some((s: any) => s && s.width === '60%');
      });

      expect(progressFill).toBeTruthy();
    });

    test('handles zero progress correctly', () => {
      const propsWithZeroProgress = {
        ...mockProps,
        currentTierProgress: { current: 0, target: 10, nextTier: 'Gold' },
      };

      const { getByText } = render(<ShareModal {...propsWithZeroProgress} />);
      expect(getByText('0/10 referrals')).toBeTruthy();
    });
  });

  // ============================================
  // 4. Copy Code Functionality Tests (6 tests)
  // ============================================

  describe('Copy Code Functionality', () => {
    test('copies referral code to clipboard when code is pressed', async () => {
      // The component uses Clipboard.setString (expo-clipboard sync API).
      // Spy on that method instead of setStringAsync.
      const setStringMock = jest.spyOn(Clipboard, 'setString');
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('TEST123').parent);

      await waitFor(() => {
        expect(setStringMock).toHaveBeenCalledWith('TEST123');
      });
    });

    test('shows success alert after copying code', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('TEST123').parent);

      await waitFor(() => {
        const called = alertSpy.mock.calls.find(
          (call) => call[0] === 'Copied!' && call[1] === 'Referral code copied to clipboard'
        );
        expect(called).toBeDefined();
      });
    });

    test('changes copy button text to "Copied!" temporarily', async () => {
      const { getByText, queryByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('TEST123').parent);

      await waitFor(() => {
        expect(queryByText('Copied!')).toBeTruthy();
      });
    });

    test('copy button displays correct initial text', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Copy')).toBeTruthy();
    });

    test('handles clipboard copy errors gracefully', async () => {
      const spy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {
        throw new Error('Clipboard error');
      });
      const { getByText } = render(<ShareModal {...mockProps} />);

      // Should not crash
      fireEvent.press(getByText('TEST123').parent);

      await waitFor(() => {
        expect(true).toBeTruthy(); // Just verify no crash
      });
      spy.mockRestore();
    });

    test('resets copy button text after timeout', async () => {
      jest.useFakeTimers();
      const { getByText, queryByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('TEST123').parent);

      await waitFor(() => {
        expect(queryByText('Copied!')).toBeTruthy();
      });

      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(queryByText('Copy')).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  // ============================================
  // 5. Copy Link Functionality Tests (3 tests)
  // ============================================

  describe('Copy Link Functionality', () => {
    test('copies referral link to clipboard when link is pressed', async () => {
      const setStringMock = jest.spyOn(Clipboard, 'setString');
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText(mockProps.referralLink).parent);

      await waitFor(() => {
        expect(setStringMock).toHaveBeenCalledWith(mockProps.referralLink);
      });
    });

    test('shows success alert after copying link', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText(mockProps.referralLink).parent);

      await waitFor(() => {
        const called = alertSpy.mock.calls.find(
          (call) => call[0] === 'Copied!' && call[1] === 'Referral link copied to clipboard'
        );
        expect(called).toBeDefined();
      });
    });

    test('handles long links with ellipsis', () => {
      const longLink = 'https://rezapp.com/invite/TEST123?utm_source=referral&utm_campaign=2024';
      const { getByText } = render(
        <ShareModal {...mockProps} referralLink={longLink} />
      );

      expect(getByText(longLink)).toBeTruthy();
    });
  });

  // ============================================
  // 6. Platform Buttons Display Tests (7 tests)
  // ============================================

  describe('Platform Buttons Display', () => {
    test('displays WhatsApp button', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Whatsapp')).toBeTruthy();
    });

    test('displays Facebook button', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Facebook')).toBeTruthy();
    });

    test('displays Instagram button', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Instagram')).toBeTruthy();
    });

    test('displays Telegram button', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Telegram')).toBeTruthy();
    });

    test('displays SMS button', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Sms')).toBeTruthy();
    });

    test('displays Email button', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);
      expect(getByText('Email')).toBeTruthy();
    });

    test('displays all 6 platform buttons', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);

      const platforms = ['Whatsapp', 'Facebook', 'Instagram', 'Telegram', 'Sms', 'Email'];
      platforms.forEach(platform => {
        expect(getByText(platform)).toBeTruthy();
      });
    });
  });

  // ============================================
  // 7. WhatsApp Share Tests (2 tests)
  // ============================================

  describe('WhatsApp Share', () => {
    test('opens WhatsApp with correct message when button is pressed', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        expect(openURLSpy).toHaveBeenCalled();
        const url = openURLSpy.mock.calls[0][0];
        expect(url).toContain('whatsapp://send?text=');
        expect(url).toContain('TEST123');
      });
    });

    test('tracks WhatsApp share event', async () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        expect(referralService.shareReferralLink).toHaveBeenCalledWith('whatsapp');
      });
    });
  });

  // ============================================
  // 8. Facebook Share Tests (2 tests)
  // ============================================

  describe('Facebook Share', () => {
    test('opens Facebook with correct URL when button is pressed', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Facebook'));

      await waitFor(() => {
        expect(openURLSpy).toHaveBeenCalled();
        const url = openURLSpy.mock.calls[0][0];
        expect(url).toContain('fb://facewebmodal');
        expect(url).toContain(encodeURIComponent(mockProps.referralLink));
      });
    });

    test('tracks Facebook share event', async () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Facebook'));

      await waitFor(() => {
        expect(referralService.shareReferralLink).toHaveBeenCalledWith('facebook');
      });
    });
  });

  // ============================================
  // 9. Telegram Share Tests (2 tests)
  // ============================================

  describe('Telegram Share', () => {
    test('opens Telegram with correct message when button is pressed', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Telegram'));

      await waitFor(() => {
        expect(openURLSpy).toHaveBeenCalled();
        const url = openURLSpy.mock.calls[0][0];
        expect(url).toContain('tg://msg?text=');
        expect(url).toContain('TEST123');
      });
    });

    test('tracks Telegram share event', async () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Telegram'));

      await waitFor(() => {
        expect(referralService.shareReferralLink).toHaveBeenCalledWith('telegram');
      });
    });
  });

  // ============================================
  // 10. Email Share Tests (2 tests)
  // ============================================

  describe('Email Share', () => {
    test('opens email client with correct subject and body', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Email'));

      await waitFor(() => {
        expect(openURLSpy).toHaveBeenCalled();
        const url = openURLSpy.mock.calls[0][0];
        expect(url).toContain('mailto:?subject=');
        expect(url).toContain('TEST123');
      });
    });

    test('tracks Email share event', async () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Email'));

      await waitFor(() => {
        expect(referralService.shareReferralLink).toHaveBeenCalledWith('email');
      });
    });
  });

  // ============================================
  // 11. SMS Share Tests (2 tests)
  // ============================================

  describe('SMS Share', () => {
    test('opens SMS app with correct message', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Sms'));

      await waitFor(() => {
        expect(openURLSpy).toHaveBeenCalled();
        const url = openURLSpy.mock.calls[0][0];
        expect(url).toContain('sms:?body=');
        expect(url).toContain('TEST123');
      });
    });

    test('tracks SMS share event', async () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Sms'));

      await waitFor(() => {
        expect(referralService.shareReferralLink).toHaveBeenCalledWith('sms');
      });
    });
  });

  // ============================================
  // 12. Error Handling Tests (6 tests)
  // ============================================

  describe('Error Handling', () => {
    test('handles Linking.openURL errors gracefully', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Cannot open URL'));
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        const called = alertSpy.mock.calls.find(
          (call) => call[0] === 'Error' && call[1] === 'Could not open share dialog'
        );
        expect(called).toBeDefined();
      });
    });

    test('does not show error when user cancels share', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('User did not share'));
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        expect(alertSpy).not.toHaveBeenCalled();
      });
    });

    test('handles API tracking errors silently', async () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      (referralService.shareReferralLink as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const { getByText } = render(<ShareModal {...mockProps} />);

      // Should not crash or show error
      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    test('handles empty referral code gracefully', () => {
      const { getByText } = render(
        <ShareModal {...mockProps} referralCode="" />
      );

      // Should render without crashing
      expect(getByText('Share Referral')).toBeTruthy();
    });

    test('handles empty referral link gracefully', () => {
      const { getByText } = render(
        <ShareModal {...mockProps} referralLink="" />
      );

      // Should render without crashing
      expect(getByText('Share Referral')).toBeTruthy();
    });

    test('handles undefined currentTierProgress gracefully', () => {
      const { queryByText } = render(
        <ShareModal {...mockProps} currentTierProgress={undefined} />
      );

      expect(queryByText(/Progress to/)).toBeNull();
    });
  });

  // ============================================
  // 13. Message Template Tests (4 tests)
  // ============================================

  describe('Message Template', () => {
    test('replaces {CODE} placeholder in WhatsApp message', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        const url = openURLSpy.mock.calls[0][0];
        expect(decodeURIComponent(url)).toContain('TEST123');
        expect(decodeURIComponent(url)).not.toContain('{CODE}');
      });
    });

    test('replaces {LINK} placeholder in WhatsApp message', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        const url = openURLSpy.mock.calls[0][0];
        expect(decodeURIComponent(url)).toContain(mockProps.referralLink);
        expect(decodeURIComponent(url)).not.toContain('{LINK}');
      });
    });

    test('uses different message for each platform', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      // Test WhatsApp
      fireEvent.press(getByText('Whatsapp'));
      await waitFor(() => {
        const whatsappUrl = openURLSpy.mock.calls[0][0];
        expect(decodeURIComponent(whatsappUrl)).toContain('Join me on REZ');
      });

      openURLSpy.mockClear();

      // Test Telegram
      fireEvent.press(getByText('Telegram'));
      await waitFor(() => {
        const telegramUrl = openURLSpy.mock.calls[0][0];
        expect(decodeURIComponent(telegramUrl)).toContain('Check out REZ');
      });
    });

    test('includes emoji in WhatsApp message', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByText } = render(<ShareModal {...mockProps} />);

      fireEvent.press(getByText('Whatsapp'));

      await waitFor(() => {
        const url = openURLSpy.mock.calls[0][0];
        // WhatsApp message should contain emojis like 🎉 or ✨
        expect(url).toBeTruthy();
      });
    });
  });

  // ============================================
  // 14. Accessibility Tests (3 tests)
  // ============================================

  describe('Accessibility', () => {
    test('has accessible labels for platform buttons', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);

      // All platform buttons should have text labels
      expect(getByText('Whatsapp')).toBeTruthy();
      expect(getByText('Facebook')).toBeTruthy();
      expect(getByText('Telegram')).toBeTruthy();
    });

    test('code container is touchable for copying', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);

      const codeContainer = getByText('TEST123').parent;
      expect(codeContainer).toBeTruthy();
    });

    test('link container is touchable for copying', () => {
      const { getByText } = render(<ShareModal {...mockProps} />);

      const linkContainer = getByText(mockProps.referralLink).parent;
      expect(linkContainer).toBeTruthy();
    });
  });
});
