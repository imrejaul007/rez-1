/**
 * Safe Navigation Hook - Unit Tests
 *
 * Tests for the useSafeNavigation hook including:
 * - Navigation functions
 * - Back button handling
 * - Route guards
 * - Navigation events
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRouter, useSegments } from 'expo-router';
import { BackHandler } from 'react-native';
import { useSafeNavigation, useBackButton, useNavigationGuard, useCurrentRoute } from '@/hooks/useSafeNavigation';
import { navigationService } from '@/services/navigationService';

// Mock dependencies
jest.mock('expo-router');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('@/services/navigationService');
jest.mock('@/utils/navigationHelper', () => ({
  getPlatform: jest.fn(() => 'ios'),
  getDefaultFallbackRoute: jest.fn(() => '/(tabs)'),
  handleBrowserBack: jest.fn(),
  isWeb: jest.fn(() => false),
}));

describe('useSafeNavigation', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSegments as jest.Mock).mockReturnValue(['tabs', 'index']);
    (navigationService.initialize as jest.Mock).mockImplementation(() => {});
    (navigationService.canGoBack as jest.Mock).mockReturnValue(true);
    (navigationService.getCurrentRoute as jest.Mock).mockReturnValue('/tabs/index');
  });

  describe('Initialization', () => {
    it('should initialize navigation service on mount', () => {
      renderHook(() => useSafeNavigation());

      expect(navigationService.initialize).toHaveBeenCalledWith(mockRouter);
    });

    it('should not reinitialize on re-render', () => {
      const { rerender } = renderHook(() => useSafeNavigation());

      rerender();

      expect(navigationService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigate', () => {
    it('should navigate to a route successfully', async () => {
      (navigationService.navigate as jest.Mock).mockResolvedValue({
        success: true,
        route: '/profile',
      });

      const { result } = renderHook(() => useSafeNavigation());

      let navigationResult;
      await act(async () => {
        navigationResult = await result.current.navigate('/profile');
      });

      expect(navigationService.navigate).toHaveBeenCalledWith('/profile', undefined);
      expect(navigationResult).toEqual({
        success: true,
        route: '/profile',
      });
    });

    it('should set isNavigating state during navigation', async () => {
      (navigationService.navigate as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const { result } = renderHook(() => useSafeNavigation());

      expect(result.current.isNavigating).toBe(false);

      act(() => {
        result.current.navigate('/profile');
      });

      // Should be true while navigating
      expect(result.current.isNavigating).toBe(true);

      await waitFor(() => {
        expect(result.current.isNavigating).toBe(false);
      });
    });

    it('should pass navigation options correctly', async () => {
      (navigationService.navigate as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSafeNavigation());

      const options = { params: { id: '123' }, replace: false };

      await act(async () => {
        await result.current.navigate('/product/123', options);
      });

      expect(navigationService.navigate).toHaveBeenCalledWith('/product/123', options);
    });
  });

  describe('goBack', () => {
    it('should go back successfully', async () => {
      (navigationService.goBack as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.goBack();
      });

      expect(navigationService.goBack).toHaveBeenCalledWith('/(tabs)');
    });

    it('should use custom fallback route', async () => {
      (navigationService.goBack as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.goBack('/custom-fallback');
      });

      expect(navigationService.goBack).toHaveBeenCalledWith('/custom-fallback');
    });

    it('should handle navigation errors', async () => {
      (navigationService.goBack as jest.Mock).mockRejectedValue(
        new Error('Navigation failed')
      );

      const { result } = renderHook(() => useSafeNavigation());

      await expect(
        act(async () => {
          await result.current.goBack();
        })
      ).rejects.toThrow('Navigation failed');
    });
  });

  describe('replace', () => {
    it('should replace current route', async () => {
      (navigationService.replace as jest.Mock).mockResolvedValue({
        success: true,
        route: '/sign-in',
      });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.replace('/sign-in');
      });

      expect(navigationService.replace).toHaveBeenCalledWith('/sign-in', undefined);
    });
  });

  describe('navigateWithConfirmation', () => {
    it('should navigate after confirmation on web', async () => {
      const { isWeb } = require('@/utils/navigationHelper');
      (isWeb as jest.Mock).mockReturnValue(true);
      global.confirm = jest.fn(() => true);

      (navigationService.navigate as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.navigateWithConfirmation('/profile', 'Are you sure?');
      });

      expect(global.confirm).toHaveBeenCalledWith('Are you sure?');
      expect(navigationService.navigate).toHaveBeenCalledWith('/profile', undefined);
    });

    it('should not navigate if confirmation is cancelled', async () => {
      const { isWeb } = require('@/utils/navigationHelper');
      (isWeb as jest.Mock).mockReturnValue(true);
      global.confirm = jest.fn(() => false);

      const { result } = renderHook(() => useSafeNavigation());

      const navResult = await act(async () => {
        return await result.current.navigateWithConfirmation('/profile', 'Are you sure?');
      });

      expect(navResult).toBeNull();
      expect(navigationService.navigate).not.toHaveBeenCalled();
    });
  });

  describe('goToHome and goToProfile', () => {
    it('should navigate to home', async () => {
      (navigationService.replace as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.goToHome();
      });

      expect(navigationService.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('should navigate to profile', async () => {
      (navigationService.navigate as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.goToProfile();
      });

      expect(navigationService.navigate).toHaveBeenCalledWith('/profile');
    });
  });

  describe('goBackOrFallback', () => {
    it('should go back when history exists', async () => {
      (navigationService.canGoBack as jest.Mock).mockReturnValue(true);
      (navigationService.goBack as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.goBackOrFallback();
      });

      expect(navigationService.goBack).toHaveBeenCalled();
      expect(navigationService.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to fallback when no history', async () => {
      (navigationService.canGoBack as jest.Mock).mockReturnValue(false);
      (navigationService.navigate as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSafeNavigation());

      await act(async () => {
        await result.current.goBackOrFallback('/fallback');
      });

      expect(navigationService.navigate).toHaveBeenCalledWith('/fallback');
      expect(navigationService.goBack).not.toHaveBeenCalled();
    });
  });

  describe('canGoBack state', () => {
    it('should update canGoBack based on navigation state', () => {
      (navigationService.canGoBack as jest.Mock).mockReturnValue(true);

      const { result, rerender } = renderHook(() => useSafeNavigation());

      expect(result.current.canGoBack).toBe(true);

      (navigationService.canGoBack as jest.Mock).mockReturnValue(false);
      (useSegments as jest.Mock).mockReturnValue(['sign-in']);

      rerender();

      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('Service access methods', () => {
    it('should provide access to navigation service methods', () => {
      (navigationService.getCurrentRoute as jest.Mock).mockReturnValue('/current');
      (navigationService.getHistory as jest.Mock).mockReturnValue(['/home', '/profile']);

      const { result } = renderHook(() => useSafeNavigation());

      expect(result.current.getCurrentRoute()).toBe('/current');
      expect(result.current.getHistory()).toEqual(['/home', '/profile']);
    });

    it('should allow clearing history', () => {
      const { result } = renderHook(() => useSafeNavigation());

      act(() => {
        result.current.clearHistory();
      });

      expect(navigationService.clearHistory).toHaveBeenCalled();
    });
  });
});

describe('useBackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (navigationService.canGoBack as jest.Mock).mockReturnValue(true);
  });

  it('should handle Android hardware back button', () => {
    const { Platform } = require('react-native');
    Platform.OS = 'android';

    const onBackPress = jest.fn(() => true);

    renderHook(() => useBackButton(onBackPress, true));

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function)
    );
  });

  it('should call custom onBackPress handler', () => {
    const { Platform } = require('react-native');
    Platform.OS = 'android';

    const onBackPress = jest.fn(() => true);

    renderHook(() => useBackButton(onBackPress, true));

    const handler = (BackHandler.addEventListener as jest.Mock).mock.calls[0][1];
    const result = handler();

    expect(onBackPress).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should not register handler when disabled', () => {
    renderHook(() => useBackButton(undefined, false));

    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { Platform } = require('react-native');
    Platform.OS = 'android';

    const removeMock = jest.fn();
    (BackHandler.addEventListener as jest.Mock).mockReturnValue({ remove: removeMock });

    const { unmount } = renderHook(() => useBackButton(undefined, true));

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});

describe('useNavigationGuard', () => {
  it('should add guard on mount', () => {
    const guard = jest.fn(() => true);

    renderHook(() => useNavigationGuard(guard));

    expect(navigationService.addGuard).toHaveBeenCalledWith(guard);
  });

  it('should remove guard on unmount', () => {
    const guard = jest.fn(() => true);

    const { unmount } = renderHook(() => useNavigationGuard(guard));

    unmount();

    expect(navigationService.removeGuard).toHaveBeenCalledWith(guard);
  });

  it('should re-register guard when deps change', () => {
    const guard = jest.fn(() => true);

    const { rerender } = renderHook(
      ({ deps }) => useNavigationGuard(guard, deps),
      { initialProps: { deps: [1] } }
    );

    expect(navigationService.addGuard).toHaveBeenCalledTimes(1);

    rerender({ deps: [2] });

    expect(navigationService.removeGuard).toHaveBeenCalled();
    expect(navigationService.addGuard).toHaveBeenCalledTimes(2);
  });
});

describe('useCurrentRoute', () => {
  it('should return current route from segments', () => {
    (useSegments as jest.Mock).mockReturnValue(['tabs', 'profile']);

    const { result } = renderHook(() => useCurrentRoute());

    expect(result.current).toBe('/tabs/profile');
  });

  it('should update when segments change', () => {
    (useSegments as jest.Mock).mockReturnValue(['tabs', 'index']);

    const { result, rerender } = renderHook(() => useCurrentRoute());

    expect(result.current).toBe('/tabs/index');

    (useSegments as jest.Mock).mockReturnValue(['profile', 'edit']);
    rerender();

    expect(result.current).toBe('/profile/edit');
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle navigation service errors', async () => {
    (navigationService.navigate as jest.Mock).mockRejectedValue(
      new Error('Navigation error')
    );

    const { result } = renderHook(() => useSafeNavigation());

    await expect(
      act(async () => {
        await result.current.navigate('/error-route');
      })
    ).rejects.toThrow('Navigation error');

    // isNavigating should be reset even on error
    expect(result.current.isNavigating).toBe(false);
  });

  it('should handle undefined router', () => {
    (useRouter as jest.Mock).mockReturnValue(undefined);

    expect(() => {
      renderHook(() => useSafeNavigation());
    }).not.toThrow();
  });

  it('should handle empty segments', () => {
    (useSegments as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useCurrentRoute());

    expect(result.current).toBe('/');
  });
});

describe('Performance Tests', () => {
  it('should handle rapid navigation calls', async () => {
    (navigationService.navigate as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSafeNavigation());

    await act(async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        result.current.navigate(`/route${i}`)
      );
      await Promise.all(promises);
    });

    expect(navigationService.navigate).toHaveBeenCalledTimes(10);
  });

  it('should not cause memory leaks with many re-renders', () => {
    const { rerender } = renderHook(() => useSafeNavigation());

    for (let i = 0; i < 100; i++) {
      rerender();
    }

    // Should only initialize once
    expect(navigationService.initialize).toHaveBeenCalledTimes(1);
  });
});
