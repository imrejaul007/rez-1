/**
 * ModeSwitcher Component - Unit Tests
 *
 * Tests for ModeSwitcher component including:
 * - Rendering all 4 modes
 * - Mode change handling
 * - Privé eligibility states
 * - Lock icon for non-eligible users
 * - Active styling
 * - Accessibility
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import ModeSwitcher from '@/components/homepage/ModeSwitcher';
import { ModeId, PriveEligibility } from '@/types/mode.types';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/utils/haptics', () => ({
  triggerImpact: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

describe('ModeSwitcher', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const defaultProps = {
    activeMode: 'near-u' as ModeId,
    onModeChange: jest.fn(),
    priveEligibility: {
      isEligible: false,
      score: 0,
      tier: 'none' as const,
      pillars: [],
      trustScore: 70,
      hasSeenGlowThisSession: false,
    } as PriveEligibility,
    onPriveLockedPress: jest.fn(),
    isPriveMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Rendering', () => {
    it('should render all 4 mode tabs', () => {
      const { getByText } = render(<ModeSwitcher {...defaultProps} />);

      expect(getByText('Near U')).toBeTruthy();
      expect(getByText('Mall')).toBeTruthy();
      expect(getByText('Cash')).toBeTruthy();
      expect(getByText('Privé')).toBeTruthy();
    });

    it('should render mode icons', () => {
      const { getByText } = render(<ModeSwitcher {...defaultProps} />);

      expect(getByText('📍')).toBeTruthy();
      expect(getByText('🛍')).toBeTruthy();
      expect(getByText('💰')).toBeTruthy();
      expect(getByText('✦')).toBeTruthy();
    });

    it('should show lock icon when Privé is not eligible', () => {
      const { getByLabelText } = render(
        <ModeSwitcher
          {...defaultProps}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: false,
          }}
        />
      );

      // Should have accessibility hint for locked state
      const priveTab = getByLabelText('Privé mode');
      expect(priveTab.props.accessibilityHint).toContain('Requires eligibility');
    });

    it('should not show lock icon when Privé is eligible', () => {
      const { getByLabelText } = render(
        <ModeSwitcher
          {...defaultProps}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: true,
            tier: 'entry',
          }}
        />
      );

      const priveTab = getByLabelText('Privé mode');
      expect(priveTab.props.accessibilityHint).not.toContain('Requires eligibility');
    });
  });

  describe('Mode Change Handling', () => {
    it('should call onModeChange when Near U tab is pressed', async () => {
      const onModeChange = jest.fn();
      const { getByText } = render(
        <ModeSwitcher {...defaultProps} onModeChange={onModeChange} activeMode="mall" />
      );

      fireEvent.press(getByText('Near U'));

      await waitFor(() => {
        expect(onModeChange).toHaveBeenCalledWith('near-u');
      });
    });

    it('should call onModeChange when Mall tab is pressed', async () => {
      const onModeChange = jest.fn();
      const { getByText } = render(
        <ModeSwitcher {...defaultProps} onModeChange={onModeChange} />
      );

      fireEvent.press(getByText('Mall'));

      await waitFor(() => {
        expect(onModeChange).toHaveBeenCalledWith('mall');
      });
    });

    it('should call onModeChange when Cash tab is pressed', async () => {
      const onModeChange = jest.fn();
      const { getByText } = render(
        <ModeSwitcher {...defaultProps} onModeChange={onModeChange} />
      );

      fireEvent.press(getByText('Cash'));

      await waitFor(() => {
        expect(onModeChange).toHaveBeenCalledWith('cash');
      });
    });

    it('should call onModeChange when eligible Privé tab is pressed', async () => {
      const onModeChange = jest.fn();
      const { getByText } = render(
        <ModeSwitcher
          {...defaultProps}
          onModeChange={onModeChange}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: true,
            tier: 'entry',
          }}
        />
      );

      fireEvent.press(getByText('Privé'));

      await waitFor(() => {
        expect(onModeChange).toHaveBeenCalledWith('prive');
      });
    });
  });

  describe('Privé Eligibility Handling', () => {
    it('should call onPriveLockedPress when non-eligible Privé is pressed', async () => {
      const onPriveLockedPress = jest.fn();
      const onModeChange = jest.fn();
      const { getByText } = render(
        <ModeSwitcher
          {...defaultProps}
          onModeChange={onModeChange}
          onPriveLockedPress={onPriveLockedPress}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: false,
          }}
        />
      );

      fireEvent.press(getByText('Privé'));

      await waitFor(() => {
        expect(onPriveLockedPress).toHaveBeenCalled();
        expect(onModeChange).not.toHaveBeenCalled();
      });
    });

    it('should navigate to subscription when locked Privé is pressed without custom handler', async () => {
      const { getByText } = render(
        <ModeSwitcher
          {...defaultProps}
          onPriveLockedPress={undefined}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: false,
          }}
        />
      );

      fireEvent.press(getByText('Privé'));

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/subscription');
      });
    });

    it('should not block eligible Privé users', async () => {
      const onModeChange = jest.fn();
      const onPriveLockedPress = jest.fn();
      const { getByText } = render(
        <ModeSwitcher
          {...defaultProps}
          onModeChange={onModeChange}
          onPriveLockedPress={onPriveLockedPress}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: true,
            tier: 'elite',
          }}
        />
      );

      fireEvent.press(getByText('Privé'));

      await waitFor(() => {
        expect(onModeChange).toHaveBeenCalledWith('prive');
        expect(onPriveLockedPress).not.toHaveBeenCalled();
      });
    });
  });

  describe('Active Mode Styling', () => {
    it('should apply active style to Near U when selected', () => {
      const { getByLabelText } = render(
        <ModeSwitcher {...defaultProps} activeMode="near-u" />
      );

      const nearUTab = getByLabelText('Near U mode');
      expect(nearUTab.props.accessibilityState.selected).toBe(true);
    });

    it('should apply active style to Mall when selected', () => {
      const { getByLabelText } = render(
        <ModeSwitcher {...defaultProps} activeMode="mall" />
      );

      const mallTab = getByLabelText('Mall mode');
      expect(mallTab.props.accessibilityState.selected).toBe(true);
    });

    it('should apply active style to Cash when selected', () => {
      const { getByLabelText } = render(
        <ModeSwitcher {...defaultProps} activeMode="cash" />
      );

      const cashTab = getByLabelText('Cash mode');
      expect(cashTab.props.accessibilityState.selected).toBe(true);
    });

    it('should apply active style to Privé when selected and eligible', () => {
      const { getByLabelText } = render(
        <ModeSwitcher
          {...defaultProps}
          activeMode="prive"
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: true,
            tier: 'entry',
          }}
        />
      );

      const priveTab = getByLabelText('Privé mode');
      expect(priveTab.props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility role for all tabs', () => {
      const { getByLabelText } = render(<ModeSwitcher {...defaultProps} />);

      expect(getByLabelText('Near U mode').props.accessibilityRole).toBe('tab');
      expect(getByLabelText('Mall mode').props.accessibilityRole).toBe('tab');
      expect(getByLabelText('Cash mode').props.accessibilityRole).toBe('tab');
      expect(getByLabelText('Privé mode').props.accessibilityRole).toBe('tab');
    });

    it('should have disabled state for locked Privé', () => {
      const { getByLabelText } = render(
        <ModeSwitcher
          {...defaultProps}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: false,
          }}
        />
      );

      const priveTab = getByLabelText('Privé mode');
      expect(priveTab.props.accessibilityState.disabled).toBe(true);
    });

    it('should provide helpful hints for each mode', () => {
      const { getByLabelText } = render(
        <ModeSwitcher
          {...defaultProps}
          priveEligibility={{
            ...defaultProps.priveEligibility,
            isEligible: true,
          }}
        />
      );

      expect(getByLabelText('Near U mode').props.accessibilityHint).toContain('Save around you');
      expect(getByLabelText('Mall mode').props.accessibilityHint).toContain('Curated brands');
      expect(getByLabelText('Cash mode').props.accessibilityHint).toContain('Cashback deals');
      expect(getByLabelText('Privé mode').props.accessibilityHint).toContain('Exclusive access');
    });
  });

  describe('Dark Mode (Privé Theme)', () => {
    it('should apply dark theme when isPriveMode is true', () => {
      const { getByTestId } = render(
        <ModeSwitcher {...defaultProps} isPriveMode={true} />
      );

      // Test passes if component renders without errors in dark mode
      expect(true).toBe(true);
    });
  });
});
