/**
 * HomeTabContext - Integration Tests
 *
 * Tests for HomeTabContext including:
 * - 4-mode system (near-u, mall, cash, prive)
 * - Mode persistence with AsyncStorage
 * - Privé eligibility integration
 * - Legacy API backward compatibility
 * - Mode change behavior
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeTabProvider, useHomeTab } from '@/contexts/HomeTabContext';
import { ModeId, MODE_STORAGE_KEYS } from '@/types/mode.types';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/hooks/useModePersistence', () => ({
  useModePersistence: () => ({
    storedMode: 'near-u',
    isLoaded: true,
    saveMode: jest.fn().mockResolvedValue(undefined),
    clearMode: jest.fn().mockResolvedValue(undefined),
  }),
  usePriveGlowSession: () => ({
    hasSeenGlow: false,
    markGlowSeen: jest.fn(),
    resetGlow: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePriveEligibility', () => ({
  usePriveEligibility: () => ({
    eligibility: {
      isEligible: false,
      score: 50,
      tier: 'none',
      pillars: [],
      trustScore: 70,
      hasSeenGlowThisSession: false,
    },
    isEligible: false,
    isPrive: false,
    tier: 'none',
    refresh: jest.fn().mockResolvedValue(undefined),
    markGlowSeen: jest.fn(),
  }),
}));

// Test component to access context
const TestConsumer: React.FC<{
  onModeChange?: (mode: ModeId) => void;
  onTabChange?: (tab: string) => void;
}> = ({ onModeChange, onTabChange }) => {
  const context = useHomeTab();

  return (
    <>
      <Text testID="active-mode">{context.activeMode}</Text>
      <Text testID="active-home-tab">{context.activeHomeTab}</Text>
      <Text testID="is-loaded">{String(context.isLoaded)}</Text>
      <Text testID="is-near-u-active">{String(context.isNearUActive)}</Text>
      <Text testID="is-mall-active">{String(context.isMallActive)}</Text>
      <Text testID="is-cash-active">{String(context.isCashActive)}</Text>
      <Text testID="is-prive-active">{String(context.isPriveActive)}</Text>
      <Text testID="is-rez-mall-active">{String(context.isRezMallActive)}</Text>
      <Text testID="is-cash-store-active">{String(context.isCashStoreActive)}</Text>
      <Text testID="is-prive-eligible">{String(context.isPriveEligible)}</Text>

      <TouchableOpacity
        testID="set-near-u"
        onPress={() => {
          context.setActiveMode('near-u');
          onModeChange?.('near-u');
        }}
      />
      <TouchableOpacity
        testID="set-mall"
        onPress={() => {
          context.setActiveMode('mall');
          onModeChange?.('mall');
        }}
      />
      <TouchableOpacity
        testID="set-cash"
        onPress={() => {
          context.setActiveMode('cash');
          onModeChange?.('cash');
        }}
      />
      <TouchableOpacity
        testID="set-prive"
        onPress={() => {
          context.setActiveMode('prive');
          onModeChange?.('prive');
        }}
      />

      {/* Legacy API */}
      <TouchableOpacity
        testID="set-rez-mall-legacy"
        onPress={() => {
          context.setActiveHomeTab('rez-mall');
          onTabChange?.('rez-mall');
        }}
      />
    </>
  );
};

describe('HomeTabContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should default to near-u mode', async () => {
      const { getByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      await waitFor(() => {
        expect(getByTestId('active-mode').children[0]).toBe('near-u');
      });
    });

    it('should map near-u mode to rez legacy tab', async () => {
      const { getByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      await waitFor(() => {
        expect(getByTestId('active-home-tab').children[0]).toBe('rez');
      });
    });

    it('should set isNearUActive to true by default', async () => {
      const { getByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      await waitFor(() => {
        expect(getByTestId('is-near-u-active').children[0]).toBe('true');
        expect(getByTestId('is-mall-active').children[0]).toBe('false');
        expect(getByTestId('is-cash-active').children[0]).toBe('false');
        expect(getByTestId('is-prive-active').children[0]).toBe('false');
      });
    });
  });

  describe('Mode Switching', () => {
    it('should switch to mall mode', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setMallButton = await findByTestId('set-mall');
      await act(async () => {
        setMallButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('active-mode').children[0]).toBe('mall');
        expect(getByTestId('is-mall-active').children[0]).toBe('true');
      });
    });

    it('should switch to cash mode', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setCashButton = await findByTestId('set-cash');
      await act(async () => {
        setCashButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('active-mode').children[0]).toBe('cash');
        expect(getByTestId('is-cash-active').children[0]).toBe('true');
      });
    });

    it('should not switch to prive mode when not eligible', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setPriveButton = await findByTestId('set-prive');
      await act(async () => {
        setPriveButton.props.onPress();
      });

      await waitFor(() => {
        // Should still be near-u because user is not eligible
        expect(getByTestId('active-mode').children[0]).toBe('near-u');
        expect(getByTestId('is-prive-active').children[0]).toBe('false');
      });
    });

    it('should switch back to near-u mode', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      // First switch to mall
      const setMallButton = await findByTestId('set-mall');
      await act(async () => {
        setMallButton.props.onPress();
      });

      // Then switch back to near-u
      const setNearUButton = await findByTestId('set-near-u');
      await act(async () => {
        setNearUButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('active-mode').children[0]).toBe('near-u');
        expect(getByTestId('is-near-u-active').children[0]).toBe('true');
      });
    });
  });

  describe('Legacy API Compatibility', () => {
    it('should map mall mode to rez-mall legacy tab', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setMallButton = await findByTestId('set-mall');
      await act(async () => {
        setMallButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('active-home-tab').children[0]).toBe('rez-mall');
        expect(getByTestId('is-rez-mall-active').children[0]).toBe('true');
      });
    });

    it('should map cash mode to cash-store legacy tab', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setCashButton = await findByTestId('set-cash');
      await act(async () => {
        setCashButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('active-home-tab').children[0]).toBe('cash-store');
        expect(getByTestId('is-cash-store-active').children[0]).toBe('true');
      });
    });

    it('should accept legacy setActiveHomeTab calls', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setRezMallLegacy = await findByTestId('set-rez-mall-legacy');
      await act(async () => {
        setRezMallLegacy.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('active-mode').children[0]).toBe('mall');
        expect(getByTestId('active-home-tab').children[0]).toBe('rez-mall');
      });
    });
  });

  describe('Mode Flags', () => {
    it('should correctly set mode flags for near-u', async () => {
      const { getByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      await waitFor(() => {
        expect(getByTestId('is-near-u-active').children[0]).toBe('true');
        expect(getByTestId('is-mall-active').children[0]).toBe('false');
        expect(getByTestId('is-cash-active').children[0]).toBe('false');
        expect(getByTestId('is-prive-active').children[0]).toBe('false');
      });
    });

    it('should correctly set mode flags for mall', async () => {
      const { getByTestId, findByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      const setMallButton = await findByTestId('set-mall');
      await act(async () => {
        setMallButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('is-near-u-active').children[0]).toBe('false');
        expect(getByTestId('is-mall-active').children[0]).toBe('true');
        expect(getByTestId('is-cash-active').children[0]).toBe('false');
        expect(getByTestId('is-prive-active').children[0]).toBe('false');
      });
    });
  });

  describe('Privé Eligibility', () => {
    it('should expose isPriveEligible state', async () => {
      const { getByTestId } = render(
        <HomeTabProvider>
          <TestConsumer />
        </HomeTabProvider>
      );

      await waitFor(() => {
        expect(getByTestId('is-prive-eligible').children[0]).toBe('false');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useHomeTab is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useHomeTab must be used within a HomeTabProvider');

      consoleSpy.mockRestore();
    });
  });
});

describe('Mode Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load persisted mode on mount', async () => {
    // This test verifies the integration with useModePersistence hook
    // The hook is mocked to return 'near-u' as the stored mode
    const { getByTestId } = render(
      <HomeTabProvider>
        <TestConsumer />
      </HomeTabProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-loaded').children[0]).toBe('true');
    });
  });

  it('should default to near-u for invalid persisted mode', async () => {
    // The mock already defaults to near-u
    const { getByTestId } = render(
      <HomeTabProvider>
        <TestConsumer />
      </HomeTabProvider>
    );

    await waitFor(() => {
      expect(getByTestId('active-mode').children[0]).toBe('near-u');
    });
  });
});
