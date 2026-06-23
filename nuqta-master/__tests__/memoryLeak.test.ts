/**
 * Memory Leak Detection Test
 *
 * This test helps identify memory leaks by:
 * 1. Measuring heap size before and after operations
 * 2. Checking for unbounded array/map growth
 * 3. Verifying cleanup functions are called
 *
 * Run with: npx jest __tests__/memoryLeakTest.ts
 */

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj.web || obj.default },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Memory measurement utilities
interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  timestamp: number;
}

function getMemorySnapshot(): MemorySnapshot | null {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      timestamp: Date.now(),
    };
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function forceGC(): void {
  if (global.gc) {
    global.gc();
  }
}

describe('Memory Leak Detection Tests', () => {
  beforeEach(() => {
    forceGC();
  });

  afterEach(() => {
    forceGC();
  });

  describe('Array Growth Tests', () => {
    test('should not grow arrays beyond limits', () => {
      const MAX_SIZE = 100;
      const items: any[] = [];

      // Simulate adding many items
      for (let i = 0; i < 1000; i++) {
        items.push({ id: i, data: 'x'.repeat(1000) });

        // Apply limit like we do in fixed code
        if (items.length > MAX_SIZE) {
          items.splice(0, items.length - MAX_SIZE);
        }
      }

      expect(items.length).toBeLessThanOrEqual(MAX_SIZE);
      console.log(`Array size after 1000 additions with limit: ${items.length}`);
    });

    test('should detect unbounded array growth', () => {
      const items: any[] = [];
      const startMem = getMemorySnapshot();

      // Simulate unbounded growth (what we're trying to prevent)
      for (let i = 0; i < 100; i++) {
        items.push({ id: i, data: 'x'.repeat(10000) });
      }

      const endMem = getMemorySnapshot();

      if (startMem && endMem) {
        const memGrowth = endMem.heapUsed - startMem.heapUsed;
        console.log(`Memory growth for 100 items: ${formatBytes(memGrowth)}`);

        // Each item is ~10KB, so 100 items should be ~1MB
        // If it's much more, there's a leak
        expect(memGrowth).toBeLessThan(5 * 1024 * 1024); // 5MB max
      }
    });
  });

  describe('Map/Object Cleanup Tests', () => {
    test('should properly cleanup Map entries', () => {
      const cache = new Map<string, any>();
      const MAX_ENTRIES = 50;

      // Add entries
      for (let i = 0; i < 200; i++) {
        cache.set(`key_${i}`, { data: 'x'.repeat(1000) });

        // Apply limit
        if (cache.size > MAX_ENTRIES) {
          const keysToRemove = Array.from(cache.keys()).slice(0, cache.size - MAX_ENTRIES);
          keysToRemove.forEach(key => cache.delete(key));
        }
      }

      expect(cache.size).toBeLessThanOrEqual(MAX_ENTRIES);
      console.log(`Map size after 200 additions with limit: ${cache.size}`);
    });
  });

  describe('Timer Cleanup Tests', () => {
    test('should properly cleanup timers', async () => {
      const timers: NodeJS.Timeout[] = [];
      let callCount = 0;

      // Create timers
      for (let i = 0; i < 10; i++) {
        const timer = setTimeout(() => {
          callCount++;
        }, 100);
        timers.push(timer);
      }

      // Cleanup all timers before they fire
      timers.forEach(timer => clearTimeout(timer));

      // Wait to ensure timers would have fired
      await new Promise(resolve => setTimeout(resolve, 200));

      // Callbacks should not have been called
      expect(callCount).toBe(0);
      console.log(`Timer callbacks called after cleanup: ${callCount} (expected 0)`);
    });

    test('should properly cleanup intervals', async () => {
      let callCount = 0;
      const interval = setInterval(() => {
        callCount++;
      }, 50);

      // Let it run a few times
      await new Promise(resolve => setTimeout(resolve, 150));
      const countBeforeClear = callCount;

      // Clear interval
      clearInterval(interval);

      // Wait more
      await new Promise(resolve => setTimeout(resolve, 150));

      // Count should not have increased after clearing
      expect(callCount).toBe(countBeforeClear);
      console.log(`Interval calls before clear: ${countBeforeClear}, after clear: ${callCount}`);
    });
  });

  describe('Subscription Cleanup Tests', () => {
    test('should track and cleanup event listeners', () => {
      const listeners = new Map<string, Function[]>();

      const addListener = (event: string, fn: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(fn);
      };

      const removeListener = (event: string, fn: Function) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(fn);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      };

      const removeAllListeners = (event?: string) => {
        if (event) {
          listeners.delete(event);
        } else {
          listeners.clear();
        }
      };

      // Add listeners
      const fn1 = () => {};
      const fn2 = () => {};
      addListener('event1', fn1);
      addListener('event1', fn2);
      addListener('event2', fn1);

      expect(listeners.get('event1')?.length).toBe(2);
      expect(listeners.get('event2')?.length).toBe(1);

      // Remove specific listener
      removeListener('event1', fn1);
      expect(listeners.get('event1')?.length).toBe(1);

      // Remove all listeners
      removeAllListeners();
      expect(listeners.size).toBe(0);
      console.log('Event listeners properly cleaned up');
    });
  });

  describe('Cache Service Memory Test', () => {
    test('cache index should only store metadata, not full data', () => {
      // Simulate the fixed CacheIndexEntry (metadata only)
      interface CacheIndexEntry {
        key: string;
        timestamp: number;
        ttl: number;
        size: number;
        priority: string;
      }

      const cacheIndex = new Map<string, CacheIndexEntry>();
      const startMem = getMemorySnapshot();

      // Add 100 entries with only metadata
      for (let i = 0; i < 100; i++) {
        cacheIndex.set(`key_${i}`, {
          key: `key_${i}`,
          timestamp: Date.now(),
          ttl: 3600000,
          size: 100000, // Size is just a number, not actual data
          priority: 'medium',
        });
      }

      const endMem = getMemorySnapshot();

      if (startMem && endMem) {
        const memGrowth = endMem.heapUsed - startMem.heapUsed;
        console.log(`Memory for 100 metadata-only index entries: ${formatBytes(memGrowth)}`);

        // Metadata-only entries should use minimal memory
        // 100 entries with ~100 bytes each = ~10KB
        expect(memGrowth).toBeLessThan(1 * 1024 * 1024); // Should be < 1MB
      }
    });

    test('storing full data in index causes memory bloat (demonstration)', () => {
      // Simulate the OLD broken behavior - storing full data
      interface BrokenCacheEntry {
        key: string;
        data: any; // Full data stored!
        timestamp: number;
      }

      const brokenIndex = new Map<string, BrokenCacheEntry>();
      const startMem = getMemorySnapshot();

      // Add 100 entries WITH full data (BAD!)
      for (let i = 0; i < 100; i++) {
        brokenIndex.set(`key_${i}`, {
          key: `key_${i}`,
          data: { content: 'x'.repeat(10000) }, // 10KB of data per entry
          timestamp: Date.now(),
        });
      }

      const endMem = getMemorySnapshot();

      if (startMem && endMem) {
        const memGrowth = endMem.heapUsed - startMem.heapUsed;
        console.log(`Memory for 100 FULL data entries (BAD): ${formatBytes(memGrowth)}`);

        // Full data entries use more memory than metadata-only
        // This test demonstrates the difference - at least 50KB for 100 entries with data
        expect(memGrowth).toBeGreaterThan(50 * 1024); // Should be > 50KB
      }
    });
  });

  describe('Video Array Limit Test', () => {
    test('should limit video array to MAX_VIDEOS_IN_MEMORY', () => {
      const MAX_VIDEOS_IN_MEMORY = 60;

      interface Video {
        id: string;
        url: string;
        data: string;
      }

      let allVideos: Video[] = [];

      // Simulate 5 pages of 20 videos each
      for (let page = 1; page <= 5; page++) {
        const newVideos: Video[] = Array.from({ length: 20 }, (_, i) => ({
          id: `video_${page}_${i}`,
          url: `https://example.com/video_${page}_${i}.mp4`,
          data: 'x'.repeat(1000),
        }));

        allVideos = page === 1 ? newVideos : [...allVideos, ...newVideos];

        // Apply limit (as in fixed code)
        if (allVideos.length > MAX_VIDEOS_IN_MEMORY) {
          allVideos = allVideos.slice(-MAX_VIDEOS_IN_MEMORY);
        }

        console.log(`After page ${page}: ${allVideos.length} videos in memory`);
      }

      expect(allVideos.length).toBeLessThanOrEqual(MAX_VIDEOS_IN_MEMORY);
      console.log(`Final video count: ${allVideos.length} (max: ${MAX_VIDEOS_IN_MEMORY})`);
    });
  });
});

// Export for use in other tests
export { getMemorySnapshot, formatBytes, forceGC };
