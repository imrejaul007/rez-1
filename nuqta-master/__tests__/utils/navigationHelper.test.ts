/**
 * Unit Tests for navigationHelper.ts
 */

import {
  getPlatform,
  isWeb,
  isMobile,
  isValidRoute,
  normalizeRoute,
  requiresAuth,
  sanitizeRoute,
  routesEqual,
  getParentRoute,
  isModalRoute,
  delay,
  throttle,
  debounce,
} from '@/utils/navigationHelper';
import { Platform } from 'react-native';

describe('navigationHelper', () => {
  describe('platform checks', () => {
    it('should return current platform', () => {
      const platform = getPlatform();
      expect(['ios', 'android', 'web']).toContain(platform);
    });

    it('should check if platform is web', () => {
      const result = isWeb();
      expect(typeof result).toBe('boolean');
    });

    it('should check if platform is mobile', () => {
      const result = isMobile();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('route validation', () => {
    it('should validate string routes', () => {
      expect(isValidRoute('/home')).toBe(true);
      expect(isValidRoute('/(tabs)')).toBe(true);
      expect(isValidRoute('')).toBe(false);
      expect(isValidRoute(null)).toBe(false);
    });

    it('should validate object routes', () => {
      expect(isValidRoute({ pathname: '/home' })).toBe(true);
      expect(isValidRoute({ pathname: '/home', params: { id: '123' } })).toBe(true);
      expect(isValidRoute({ notPathname: '/home' })).toBe(false);
    });

    it('should normalize routes to strings', () => {
      expect(normalizeRoute('/home' as any)).toBe('/home');
      expect(normalizeRoute({ pathname: '/home' } as any)).toBe('/home');
    });
  });

  describe('requiresAuth', () => {
    it('should return false for public routes', () => {
      expect(requiresAuth('/')).toBe(false);
      expect(requiresAuth('/sign-in')).toBe(false);
      expect(requiresAuth('/onboarding')).toBe(false);
      expect(requiresAuth('/(tabs)')).toBe(false);
    });

    it('should return true for protected routes', () => {
      expect(requiresAuth('/profile')).toBe(true);
      expect(requiresAuth('/wallet')).toBe(true);
      expect(requiresAuth('/orders')).toBe(true);
    });
  });

  describe('sanitizeRoute', () => {
    it('should remove double slashes', () => {
      expect(sanitizeRoute('//home//test//')).toBe('/home/test');
    });

    it('should ensure route starts with /', () => {
      expect(sanitizeRoute('home')).toBe('/home');
    });

    it('should remove trailing slash except for root', () => {
      expect(sanitizeRoute('/home/')).toBe('/home');
      expect(sanitizeRoute('/')).toBe('/');
    });
  });

  describe('routesEqual', () => {
    it('should compare routes correctly', () => {
      expect(routesEqual('/home' as any, '/home' as any)).toBe(true);
      expect(routesEqual('/home/' as any, '/home' as any)).toBe(true);
      expect(routesEqual('//home' as any, '/home' as any)).toBe(true);
      expect(routesEqual('/home' as any, '/profile' as any)).toBe(false);
    });
  });

  describe('getParentRoute', () => {
    it('should return parent route', () => {
      expect(getParentRoute('/home/profile/edit')).toBe('/home/profile');
      expect(getParentRoute('/home')).toBe(null);
      expect(getParentRoute('/')).toBe(null);
    });
  });

  describe('isModalRoute', () => {
    it('should detect modal routes', () => {
      expect(isModalRoute('/home/modal')).toBe(true);
      expect(isModalRoute('/profile?modal=true')).toBe(true);
      expect(isModalRoute('/home')).toBe(false);
    });
  });

  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      
      expect(fn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});
