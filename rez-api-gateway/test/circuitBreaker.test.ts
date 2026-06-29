/**
 * Circuit Breaker Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  circuitBreaker,
  getCircuitBreaker,
  getCircuitStates,
  resetCircuit,
  resetAllCircuits,
  CircuitOpenError,
  type CircuitBreakerState,
} from '../src/utils/circuitBreaker';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Reset all circuits before each test
    resetAllCircuits();
  });

  describe('circuitBreaker', () => {
    it('should execute successfully when service is healthy', async () => {
      const result = await circuitBreaker('test-service', async () => {
        return { data: 'success' };
      });

      expect(result).toEqual({ data: 'success' });

      const states = getCircuitStates();
      expect(states['test-service']).toBeDefined();
      expect(states['test-service'].state).toBe('CLOSED');
      expect(states['test-service'].successes).toBe(1);
      expect(states['test-service'].failures).toBe(0);
    });

    it('should track failures and open circuit after threshold', async () => {
      // First, register the circuit
      getCircuitBreaker({
        serviceName: 'failing-service',
        config: { threshold: 3, timeout: 10000 },
      });

      // Execute failing requests
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker('failing-service', async () => {
            throw new Error('Service error');
          });
        } catch (e) {
          // Expected
        }
      }

      const states = getCircuitStates();
      expect(states['failing-service'].state).toBe('OPEN');
      expect(states['failing-service'].failures).toBe(3);
    });

    it('should throw CircuitOpenError when circuit is open', async () => {
      // Register and open the circuit
      getCircuitBreaker({
        serviceName: 'open-service',
        config: { threshold: 1, timeout: 60000 },
      });

      // First call fails and opens the circuit
      await expect(
        circuitBreaker('open-service', async () => {
          throw new Error('Service error');
        })
      ).rejects.toThrow('Service error');

      // Second call should throw CircuitOpenError
      await expect(
        circuitBreaker('open-service', async () => {
          return { data: 'should not reach' };
        })
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should allow requests after timeout in half-open state', async () => {
      // Register with very short timeout for testing
      getCircuitBreaker({
        serviceName: 'recovery-service',
        config: { threshold: 1, timeout: 100, halfOpenRequests: 1 },
      });

      // First call fails
      await expect(
        circuitBreaker('recovery-service', async () => {
          throw new Error('Service error');
        })
      ).rejects.toThrow();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should succeed in half-open state
      const result = await circuitBreaker('recovery-service', async () => {
        return { data: 'recovered' };
      });

      expect(result).toEqual({ data: 'recovered' });

      const states = getCircuitStates();
      expect(states['recovery-service'].state).toBe('CLOSED');
    });

    it('should calculate average response time', async () => {
      getCircuitBreaker({ serviceName: 'timing-service' });

      await circuitBreaker('timing-service', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      const states = getCircuitStates();
      expect(states['timing-service'].averageResponseTime).toBeGreaterThan(0);
    });

    it('should track total requests', async () => {
      getCircuitBreaker({ serviceName: 'counter-service' });

      await circuitBreaker('counter-service', async () => 'first');
      await circuitBreaker('counter-service', async () => 'second');
      await circuitBreaker('counter-service', async () => 'third');

      const states = getCircuitStates();
      expect(states['counter-service'].totalRequests).toBe(3);
    });
  });

  describe('getCircuitStates', () => {
    it('should return all registered circuits', async () => {
      getCircuitBreaker({ serviceName: 'service-a' });
      getCircuitBreaker({ serviceName: 'service-b' });
      getCircuitBreaker({ serviceName: 'service-c' });

      const states = getCircuitStates();

      expect(Object.keys(states)).toContain('service-a');
      expect(Object.keys(states)).toContain('service-b');
      expect(Object.keys(states)).toContain('service-c');
    });

    it('should return empty object when no circuits registered', () => {
      const states = getCircuitStates();
      expect(Object.keys(states).length).toBe(0);
    });
  });

  describe('resetCircuit', () => {
    it('should reset a specific circuit to CLOSED state', async () => {
      // Open a circuit
      getCircuitBreaker({
        serviceName: 'to-reset',
        config: { threshold: 1, timeout: 60000 },
      });

      await expect(
        circuitBreaker('to-reset', async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow();

      let states = getCircuitStates();
      expect(states['to-reset'].state).toBe('OPEN');

      // Reset the circuit
      const reset = resetCircuit('to-reset');
      expect(reset).toBe(true);

      states = getCircuitStates();
      expect(states['to-reset'].state).toBe('CLOSED');
      expect(states['to-reset'].failures).toBe(0);
    });

    it('should return false for non-existent circuit', () => {
      const reset = resetCircuit('non-existent');
      expect(reset).toBe(false);
    });
  });

  describe('resetAllCircuits', () => {
    it('should reset all circuits to CLOSED state', async () => {
      // Open multiple circuits
      for (const name of ['reset-1', 'reset-2', 'reset-3']) {
        getCircuitBreaker({
          serviceName: name,
          config: { threshold: 1, timeout: 60000 },
        });

        await expect(
          circuitBreaker(name, async () => {
            throw new Error('fail');
          })
        ).rejects.toThrow();
      }

      let states = getCircuitStates();
      expect(states['reset-1'].state).toBe('OPEN');
      expect(states['reset-2'].state).toBe('OPEN');
      expect(states['reset-3'].state).toBe('OPEN');

      // Reset all
      resetAllCircuits();

      states = getCircuitStates();
      expect(states['reset-1'].state).toBe('CLOSED');
      expect(states['reset-2'].state).toBe('CLOSED');
      expect(states['reset-3'].state).toBe('CLOSED');
    });
  });

  describe('CircuitOpenError', () => {
    it('should have correct properties', () => {
      const error = new CircuitOpenError('test-service', 'OPEN', 5000);

      expect(error.name).toBe('CircuitOpenError');
      expect(error.serviceName).toBe('test-service');
      expect(error.circuitState).toBe('OPEN');
      expect(error.retryAfter).toBe(5000);
      expect(error.message).toContain('test-service');
      expect(error.message).toContain('OPEN');
    });
  });
});

describe('Circuit Breaker State Machine', () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  it('should transition from CLOSED -> OPEN when threshold exceeded', async () => {
    getCircuitBreaker({
      serviceName: 'state-machine-test',
      config: { threshold: 2, timeout: 10000 },
    });

    // Two failures should open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker('state-machine-test', async () => {
          throw new Error('fail');
        });
      } catch (e) {}
    }

    const states = getCircuitStates();
    expect(states['state-machine-test'].state).toBe('OPEN');
  });

  it('should transition from OPEN -> HALF_OPEN after timeout', async () => {
    getCircuitBreaker({
      serviceName: 'half-open-test',
      config: { threshold: 1, timeout: 100 },
    });

    // Open the circuit
    try {
      await circuitBreaker('half-open-test', async () => {
        throw new Error('fail');
      });
    } catch (e) {}

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Next call should transition to HALF_OPEN
    await circuitBreaker('half-open-test', async () => 'half-open');

    const states = getCircuitStates();
    expect(states['half-open-test'].state).toBe('HALF_OPEN');
  });

  it('should transition from HALF_OPEN -> CLOSED after successful requests', async () => {
    getCircuitBreaker({
      serviceName: 'close-test',
      config: { threshold: 1, timeout: 50, halfOpenRequests: 2 },
    });

    // Open the circuit
    try {
      await circuitBreaker('close-test', async () => {
        throw new Error('fail');
      });
    } catch (e) {}

    // Wait and trigger half-open
    await new Promise(resolve => setTimeout(resolve, 100));
    await circuitBreaker('close-test', async () => 'success1');
    await circuitBreaker('close-test', async () => 'success2');

    const states = getCircuitStates();
    expect(states['close-test'].state).toBe('CLOSED');
  });

  it('should transition from HALF_OPEN -> OPEN on failure', async () => {
    getCircuitBreaker({
      serviceName: 'half-open-fail-test',
      config: { threshold: 1, timeout: 50, halfOpenRequests: 1 },
    });

    // Open the circuit
    try {
      await circuitBreaker('half-open-fail-test', async () => {
        throw new Error('fail');
      });
    } catch (e) {}

    // Wait and trigger half-open with failure
    await new Promise(resolve => setTimeout(resolve, 100));
    await expect(
      circuitBreaker('half-open-fail-test', async () => {
        throw new Error('still failing');
      })
    ).rejects.toThrow();

    const states = getCircuitStates();
    expect(states['half-open-fail-test'].state).toBe('OPEN');
  });
});
