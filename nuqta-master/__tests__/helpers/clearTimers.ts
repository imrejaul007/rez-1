/**
 * Clears all pending timers (setTimeout, setInterval) created during a test.
 * Add to afterEach to eliminate "Jest did not exit one second after the test run has completed" warnings.
 */
export function clearAllTimers() {
  // @ts-ignore - access internal jest timer queue
  const jestTimers = require('jest');
  if (jestTimers && jestTimers.getTimerCount) {
    jestTimers.clearAllTimers();
  }
}
