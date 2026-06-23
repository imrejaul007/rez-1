/**
 * WebSocket Integration Tests
 */

import { MockWebSocket } from '../utils/testHelpers';

describe('WebSocket Integration Tests', () => {
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    mockSocket = new MockWebSocket();
  });

  it('should connect to WebSocket server', () => {
    mockSocket.connect();
    expect(mockSocket.connected).toBe(true);
  });

  it('should receive real-time cart updates', (done) => {
    mockSocket.on('cart:updated', (data) => {
      expect(data).toBeDefined();
      done();
    });

    mockSocket.connect();
    mockSocket.emit('cart:updated', { items: [], total: 0 });
  });

  it('should handle disconnection and reconnection', () => {
    mockSocket.connect();
    expect(mockSocket.connected).toBe(true);

    mockSocket.disconnect();
    expect(mockSocket.connected).toBe(false);

    mockSocket.connect();
    expect(mockSocket.connected).toBe(true);
  });

  it('should emit events to server', () => {
    const emitSpy = jest.spyOn(mockSocket, 'emit');
    mockSocket.emit('subscribe', { channel: 'notifications' });
    expect(emitSpy).toHaveBeenCalledWith('subscribe', { channel: 'notifications' });
  });
});
