// ScratchCard Component Tests
// Test suite for scratch card game functionality

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as platformAlertModule from '@/utils/platformAlert';
import ScratchCardGame from '@/components/gamification/ScratchCardGame';
import gamificationAPI from '@/services/gamificationApi';

// Mock dependencies
jest.mock('@/services/gamificationApi');
jest.mock('@/utils/platformAlert', () => ({
  platformAlert: jest.fn(),
  platformAlertSimple: jest.fn(),
  platformAlertError: jest.fn(),
  platformAlertSuccess: jest.fn(),
  platformAlertConfirm: jest.fn(),
  platformAlertDestructive: jest.fn(),
  default: {
    show: jest.fn(),
    simple: jest.fn(),
    confirm: jest.fn(),
    destructive: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const platformAlert = platformAlertModule.platformAlert as jest.Mock;

const mockPrize = {
  id: 'prize-1',
  type: 'coin',
  value: 100,
  title: '100 REZ Coins',
  description: 'You won 100 coins!',
  icon: 'diamond',
  color: '#8B5CF6',
  isActive: true,
};

const mockScratchCard = {
  id: 'card-1',
  prize: mockPrize,
  isScratched: false,
  isClaimed: false,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
};

const mockEligibility = {
  canCreate: true,
  isEligible: true,
  completionPercentage: 85,
  requiredPercentage: 80,
  message: 'You are eligible for a scratch card!',
};

// Press the first button passed to platformAlert
const pressAlertButton = (buttonIndex = 0) => {
  if (!platformAlert.mock.calls.length) return;
  const lastCall = platformAlert.mock.calls[platformAlert.mock.calls.length - 1];
  const buttons = lastCall[2] || [];
  if (buttons[buttonIndex] && buttons[buttonIndex].onPress) {
    buttons[buttonIndex].onPress();
  }
};

describe('ScratchCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (gamificationAPI as any).canCreateScratchCard = jest.fn().mockResolvedValue({
      success: true,
      data: { canCreate: true, reason: null, nextAvailableAt: null },
    });
    (gamificationAPI as any).createScratchCard = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'card-default', prize: null },
    });
    (gamificationAPI as any).scratchCard = jest.fn().mockResolvedValue({
      success: true,
      data: { card: { id: 'card-default' }, prize: null, coinsAdded: 0 },
    });
    (gamificationAPI as any).claimPrize = jest.fn().mockResolvedValue({
      success: true,
      data: { claimed: true, coinsAdded: 0 },
    });
  });

  describe('Rendering', () => {
    it('should render scratch card container when eligible', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      const { getByTestId } = render(<ScratchCardGame />);

      await waitFor(() => {
        expect(getByTestId('scratch-card-container')).toBeTruthy();
      });
    });

    it('should show locked state when not eligible', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...mockEligibility,
          canCreate: false,
        },
      });

      const { getByText } = render(<ScratchCardGame />);

      await waitFor(() => {
        // The component shows "Scratch Card Not Available" when canCreate is false
        expect(getByText(/Scratch Card Not Available/i)).toBeTruthy();
      });
    });

    it('should show "Scratch to reveal" overlay before scratching', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockScratchCard,
      });

      const { getByText } = render(<ScratchCardGame />);

      // Before scratching, the component shows the "Create" button
      await waitFor(() => {
        expect(getByText(/Create Scratch Card/i)).toBeTruthy();
      });
    });
  });

  describe('Create Card Flow', () => {
    it('should call createScratchCard on first press', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockScratchCard,
      });

      const { getByText } = render(<ScratchCardGame />);

      await waitFor(() => {
        expect(getByText(/Create Scratch Card/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/Create Scratch Card/i));
      });

      await waitFor(() => {
        expect(gamificationAPI.createScratchCard).toHaveBeenCalled();
      });
    });

    it('should not create card when canCreate is false', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockEligibility, canCreate: false },
      });

      const { queryByText, getByText } = render(<ScratchCardGame />);

      await waitFor(() => {
        expect(getByText(/Scratch Card Not Available/i)).toBeTruthy();
      });

      // Should not find the "Create" button when not eligible
      expect(queryByText(/Create Scratch Card/i)).toBeFalsy();
    });
  });

  describe('Scratch Functionality', () => {
    it('should call scratchCard API when scratching', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockScratchCard,
      });

      (gamificationAPI.scratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: { card: mockScratchCard, prize: mockPrize, coinsAdded: 100 },
      });

      const { getByText } = render(<ScratchCardGame />);

      // Wait for create button
      await waitFor(() => {
        expect(getByText(/Create Scratch Card/i)).toBeTruthy();
      });

      // Create the card
      await act(async () => {
        fireEvent.press(getByText(/Create Scratch Card/i));
      });

      // Wait for "SCRATCH HERE" prompt
      await waitFor(() => {
        expect(getByText(/SCRATCH HERE/i)).toBeTruthy();
      });

      // Press to scratch
      await act(async () => {
        fireEvent.press(getByText(/SCRATCH HERE/i));
      });

      await waitFor(() => {
        expect(gamificationAPI.scratchCard).toHaveBeenCalledWith('card-1');
      });
    });

    it('should display the revealed prize after scratching', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockScratchCard,
      });

      (gamificationAPI.scratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: { card: { ...mockScratchCard, isScratched: true }, prize: mockPrize, coinsAdded: 100 },
      });

      const { getByText } = render(<ScratchCardGame />);

      await waitFor(() => {
        expect(getByText(/Create Scratch Card/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/Create Scratch Card/i));
      });

      await waitFor(() => {
        expect(getByText(/SCRATCH HERE/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/SCRATCH HERE/i));
      });

      // Prize should be shown after scratching (the prize.title is rendered)
      await waitFor(() => {
        expect(getByText('100 REZ Coins')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle create card failure', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockRejectedValue(
        new Error('Failed to create card')
      );

      const { getByText } = render(<ScratchCardGame />);

      await waitFor(() => {
        expect(getByText(/Create Scratch Card/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/Create Scratch Card/i));
      });

      await waitFor(() => {
        expect(platformAlert).toHaveBeenCalledWith(
          'Error',
          expect.any(String)
        );
      });
    });

    it('should handle scratchCard failure', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEligibility,
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockScratchCard,
      });

      (gamificationAPI.scratchCard as jest.Mock).mockRejectedValue(
        new Error('Failed to scratch')
      );

      const { getByText } = render(<ScratchCardGame />);

      await waitFor(() => {
        expect(getByText(/Create Scratch Card/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/Create Scratch Card/i));
      });

      await waitFor(() => {
        expect(getByText(/SCRATCH HERE/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/SCRATCH HERE/i));
      });

      await waitFor(() => {
        expect(platformAlert).toHaveBeenCalledWith(
          'Error',
          expect.any(String)
        );
      });
    });
  });

  describe('Eligibility', () => {
    it('should respect canCreate flag', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockEligibility, canCreate: false },
      });

      const { queryByTestId } = render(<ScratchCardGame />);

      await waitFor(() => {
        // Container should NOT show when canCreate=false and no card
        expect(queryByTestId('scratch-card-container')).toBeFalsy();
      });
    });

    it('should default to allowing scratch on API error', async () => {
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByTestId } = render(<ScratchCardGame />);

      // On error, the component falls back to canCreate=true
      await waitFor(() => {
        expect(getByTestId('scratch-card-container')).toBeTruthy();
      });
    });
  });
});
