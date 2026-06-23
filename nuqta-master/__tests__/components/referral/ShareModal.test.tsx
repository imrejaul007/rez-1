/**
 * ShareModal Component Tests
 *
 * Tests for the referral share modal — covers rendering, copy/clipboard,
 * native share, close behavior, and visibility handling.
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Share as RNShare, Clipboard, Pressable } from 'react-native';

// Mock stores/selectors
jest.mock('@/stores/selectors', () => ({
  useGetCurrencySymbol: jest.fn(() => () => 'Rs. '),
}));

// Mock services
jest.mock('@/services/referralApi', () => ({
  __esModule: true,
  default: {
    shareReferralLink: jest.fn(() =>
      Promise.resolve({ success: true, data: { success: true } })
    ),
  },
}));

jest.mock('@/services/analyticsService', () => ({
  __esModule: true,
  default: {
    track: jest.fn(),
  },
}));

// Mock platformAlertSimple so it doesn't trigger any side-effects
jest.mock('@/utils/platformAlert', () => ({
  platformAlertSimple: jest.fn(),
  platformAlert: jest.fn(),
  platformAlertConfirm: jest.fn(),
  platformAlertDestructive: jest.fn(),
  platformAlertError: jest.fn(),
}));

// Mock useIsMounted hook to always return true
jest.mock('@/hooks/useIsMounted', () => ({
  useIsMounted: jest.fn(() => () => true),
}));

// Mock QR code component to render an identifiable marker
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Import after mocks are set up
import ShareModal from '@/components/referral/ShareModal';
import * as ClipboardExpo from 'expo-clipboard';
import referralService from '@/services/referralApi';
import analyticsService from '@/services/analyticsService';
import { platformAlertSimple } from '@/utils/platformAlert';

// Walk a test-instance tree and return true if any descendant is an
// element with props.name === targetName (used to find Ionicons by name).
const containsIconNamed = (node: any, targetName: string): boolean => {
  if (!node) return false;
  if (node.props && node.props.name === targetName) return true;
  const children = node.children;
  if (!children) return false;
  if (Array.isArray(children)) return children.some((c) => containsIconNamed(c, targetName));
  return containsIconNamed(children, targetName);
};

describe('ShareModal', () => {
  const defaultProps = {
    visible: true,
    referralCode: 'REZ123',
    referralLink: 'https://rez.app/r/REZ123',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    expect(() => render(<ShareModal {...defaultProps} />)).not.toThrow();
  });

  it('renders modal with referral code and link from prop', () => {
    const { getByText } = render(<ShareModal {...defaultProps} />);

    expect(getByText('REZ123')).toBeTruthy();
    expect(getByText('https://rez.app/r/REZ123')).toBeTruthy();
    expect(getByText('Share Referral')).toBeTruthy();
  });

  it('copy-to-clipboard button calls Clipboard.setString with the link', async () => {
    const { getByText } = render(<ShareModal {...defaultProps} />);

    // The link container displays the referral link and triggers copy on press
    const linkText = getByText('https://rez.app/r/REZ123');
    const linkContainer = linkText.parent;

    await act(async () => {
      fireEvent.press(linkContainer);
    });

    await waitFor(() => {
      // Source uses react-native Clipboard.setString
      expect(Clipboard.setString).toHaveBeenCalledWith('https://rez.app/r/REZ123');
    });

    // Also verify the expo-clipboard mock was not invoked here (the source uses RN's Clipboard)
    expect(ClipboardExpo.setStringAsync).not.toHaveBeenCalled();
  });

  it('native share button invokes Share.share with correct message/url', async () => {
    const { getByText } = render(<ShareModal {...defaultProps} />);

    // The 'instagram' platform is not in the switch and falls through to default → RNShare.share
    const instagramButton = getByText('Instagram');

    await act(async () => {
      fireEvent.press(instagramButton);
    });

    await waitFor(() => {
      expect(RNShare.share).toHaveBeenCalledTimes(1);
    });

    const shareArgs = (RNShare.share as jest.Mock).mock.calls[0][0];
    expect(shareArgs.message).toContain('REZ123');
    expect(shareArgs.message).toContain('https://rez.app/r/REZ123');
    expect(shareArgs.title).toBe('Join REZ');
  });

  it('closes via onClose prop when X pressed', () => {
    const onClose = jest.fn();
    const renderResult = render(<ShareModal {...defaultProps} onClose={onClose} />);

    // Find the close Pressable — it's the only one that contains an Ionicons
    // child with name="close" (the X icon in the header).
    const pressables = renderResult.UNSAFE_root.findAllByType(Pressable);
    const closeButton = pressables.find((p) => containsIconNamed(p, 'close'));

    expect(closeButton).toBeTruthy();
    fireEvent.press(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when visible=false', () => {
    const renderResult = render(
      <ShareModal {...defaultProps} visible={false} />
    );

    // The Modal returns null from its host when not visible, so the entire
    // tree is null and none of the content text is rendered.
    expect(renderResult.toJSON()).toBeNull();
    expect(renderResult.queryByText('Share Referral')).toBeNull();
    expect(renderResult.queryByText('REZ123')).toBeNull();
  });
});
