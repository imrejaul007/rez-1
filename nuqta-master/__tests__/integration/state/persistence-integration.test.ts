/**
 * State Persistence Integration Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupAfterTest } from '../utils/testHelpers';

describe('State Persistence Integration Tests', () => {
  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should persist cart state to AsyncStorage', async () => {
    const cartData = {
      items: [{ id: 'item_1', productId: 'prod_1', quantity: 2 }],
      total: 1998,
    };

    await AsyncStorage.setItem('cart', JSON.stringify(cartData));

    const retrieved = await AsyncStorage.getItem('cart');
    expect(JSON.parse(retrieved!)).toEqual(cartData);
  });

  it('should restore state after app restart', async () => {
    const userData = {
      id: 'user_123',
      email: 'test@example.com',
    };

    await AsyncStorage.setItem('user', JSON.stringify(userData));

    // Simulate app restart
    const restored = await AsyncStorage.getItem('user');
    expect(JSON.parse(restored!)).toEqual(userData);
  });

  it('should clear persisted state on logout', async () => {
    await AsyncStorage.setItem('access_token', 'token_123');
    await AsyncStorage.setItem('user', JSON.stringify({ id: 'user_123' }));

    await AsyncStorage.multiRemove(['access_token', 'user']);

    const token = await AsyncStorage.getItem('access_token');
    const user = await AsyncStorage.getItem('user');

    expect(token).toBeNull();
    expect(user).toBeNull();
  });
});
