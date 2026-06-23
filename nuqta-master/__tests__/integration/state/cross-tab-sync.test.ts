/**
 * Cross-Tab Synchronization Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupAfterTest } from '../utils/testHelpers';

describe('Cross-Tab Sync Tests', () => {
  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should sync cart across multiple tabs', async () => {
    const cartData = { items: [{ id: 'item_1' }], total: 1000 };

    await AsyncStorage.setItem('cart', JSON.stringify(cartData));

    // Simulate another tab reading
    const retrieved = await AsyncStorage.getItem('cart');
    expect(JSON.parse(retrieved!)).toEqual(cartData);
  });

  it('should sync auth state across tabs', async () => {
    await AsyncStorage.setItem('access_token', 'token_123');

    // Both tabs should see the same token
    const token = await AsyncStorage.getItem('access_token');
    expect(token).toBe('token_123');
  });

  it('should handle logout across all tabs', async () => {
    await AsyncStorage.setItem('access_token', 'token_123');
    await AsyncStorage.setItem('user', JSON.stringify({ id: 'user_123' }));

    // Logout in one tab
    await AsyncStorage.multiRemove(['access_token', 'user']);

    // Other tabs should reflect logout
    const token = await AsyncStorage.getItem('access_token');
    expect(token).toBeNull();
  });
});
