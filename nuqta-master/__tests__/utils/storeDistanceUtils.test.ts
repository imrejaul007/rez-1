/**
 * Tests for NearUStoreCard component behavior
 */

describe('NearUStoreCard - Distance Formatting', () => {
  // Replicate the distance formatting from NearUStoreCard.tsx
  const formatDistance = (km: number): string => {
    if (!Number.isFinite(km)) return '';
    if (km < 1) {
      const metres = Math.max(1, Math.round(km * 1000));
      return `${metres} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  describe('Distance Formatting', () => {
    it('should format sub-1km distances in meters', () => {
      expect(formatDistance(0.5)).toBe('500 m');
      expect(formatDistance(0.25)).toBe('250 m');
      expect(formatDistance(0.1)).toBe('100 m');
      expect(formatDistance(0.05)).toBe('50 m');
    });

    it('should format 1km+ distances in kilometers', () => {
      expect(formatDistance(1.0)).toBe('1.0 km');
      expect(formatDistance(2.5)).toBe('2.5 km');
      expect(formatDistance(10.0)).toBe('10.0 km');
      expect(formatDistance(15.75)).toBe('15.8 km');
    });

    it('should handle edge cases', () => {
      // Minimum 1 meter
      expect(formatDistance(0.0001)).toBe('1 m');
      // Exact 1km
      expect(formatDistance(1)).toBe('1.0 km');
    });

    it('should return empty string for non-finite values', () => {
      expect(formatDistance(NaN)).toBe('');
      expect(formatDistance(Infinity)).toBe('');
      expect(formatDistance(-Infinity)).toBe('');
    });
  });

  describe('First Letter Badge', () => {
    const firstLetter = (name: string): string => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return '?';
      const ch = trimmed.charAt(0);
      return ch.toUpperCase();
    };

    it('should return first letter uppercase', () => {
      expect(firstLetter('Pizza Palace')).toBe('P');
      expect(firstLetter('dominos')).toBe('D');
    });

    it('should handle empty strings', () => {
      expect(firstLetter('')).toBe('?');
      expect(firstLetter('   ')).toBe('?');
    });
  });
});

describe('NearUStoreCard - Accessibility', () => {
  // Test accessibility label building
  const buildAccessibilityLabel = (store: {
    name: string;
    category: string;
    distanceKm: number;
    etaMinutes?: number;
    isStudentDiscount: boolean;
    isOpen: boolean;
  }): string => {
    const parts: string[] = [store.name, store.category];

    if (store.distanceKm < 1) {
      parts.push(`${Math.round(store.distanceKm * 1000)} m away`);
    } else {
      parts.push(`${store.distanceKm.toFixed(1)} km away`);
    }

    if (store.etaMinutes) {
      parts.push(`ETA ${store.etaMinutes} min`);
    }
    if (store.isStudentDiscount) {
      parts.push('student discount');
    }
    if (!store.isOpen) {
      parts.push('closed');
    }
    return parts.join(', ');
  };

  it('should build complete accessibility label', () => {
    const store = {
      name: 'Pizza Palace',
      category: 'Pizza',
      distanceKm: 1.5,
      etaMinutes: 25,
      isStudentDiscount: true,
      isOpen: true,
    };

    const label = buildAccessibilityLabel(store);
    expect(label).toContain('Pizza Palace');
    expect(label).toContain('Pizza');
    expect(label).toContain('1.5 km away');
    expect(label).toContain('ETA 25 min');
    expect(label).toContain('student discount');
  });

  it('should indicate closed stores', () => {
    const store = {
      name: 'Closed Store',
      category: 'Food',
      distanceKm: 0.8,
      isStudentDiscount: false,
      isOpen: false,
    };

    const label = buildAccessibilityLabel(store);
    expect(label).toContain('closed');
  });
});
