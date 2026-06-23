// Button state management for StoreActionButtons

import { ButtonState, StoreActionButtonsState, ButtonActionResult } from '@/types/store-actions';

/**
 * Button State Definitions:
 * - enabled: Button is clickable and ready for interaction
 * - disabled: Button is not clickable (grayed out)
 * - loading: Button shows loading spinner and is temporarily disabled
 */

export class ButtonStateManager {
  private state: StoreActionButtonsState;
  private setState: (state: StoreActionButtonsState) => void;

  constructor(
    initialState: StoreActionButtonsState,
    setState: (state: StoreActionButtonsState) => void
  ) {
    this.state = initialState;
    this.setState = setState;
  }

  /**
   * Set loading state for a specific button
   */
  setLoading(buttonId: 'buy' | 'lock' | 'booking', isLoading: boolean) {
    const newState = {
      ...this.state,
      loadingStates: {
        ...this.state.loadingStates,
        [buttonId]: isLoading,
      },
    };
    
    // Clear active button if not loading
    if (!isLoading && this.state.activeButton === buttonId) {
      newState.activeButton = null;
    } else if (isLoading) {
      newState.activeButton = buttonId;
    }
    
    this.state = newState;
    this.setState(newState);
  }

  /**
   * Set error state for a specific button
   */
  setError(buttonId: 'buy' | 'lock' | 'booking', error: string | null) {
    const newState = {
      ...this.state,
      errorStates: {
        ...this.state.errorStates,
        [buttonId]: error,
      },
    };
    
    this.state = newState;
    this.setState(newState);
  }

  /**
   * Clear all errors
   */
  clearAllErrors() {
    const newState = {
      ...this.state,
      errorStates: {
        buy: null,
        lock: null,
        booking: null,
      },
    };
    
    this.state = newState;
    this.setState(newState);
  }

  /**
   * Reset all states to default
   */
  reset() {
    const newState = {
      activeButton: null,
      loadingStates: {
        buy: false,
        lock: false,
        booking: false,
      },
      errorStates: {
        buy: null,
        lock: null,
        booking: null,
      },
    };
    
    this.state = newState;
    this.setState(newState);
  }

  /**
   * Check if any button is currently loading
   */
  hasAnyLoading(): boolean {
    return Object.values(this.state.loadingStates).some(loading => loading);
  }

  /**
   * Check if any button has an error
   */
  hasAnyError(): boolean {
    return Object.values(this.state.errorStates).some(error => error !== null);
  }

  /**
   * Get current state
   */
  getCurrentState(): StoreActionButtonsState {
    return this.state;
  }
}

/**
 * Default initial state
 */
export const createInitialButtonState = (): StoreActionButtonsState => ({
  activeButton: null,
  loadingStates: {
    buy: false,
    lock: false,
    booking: false,
  },
  errorStates: {
    buy: null,
    lock: null,
    booking: null,
  },
});

/**
 * Button interaction handler with state management
 */
export const createButtonHandler = (
  buttonId: 'buy' | 'lock' | 'booking',
  originalHandler: () => void | Promise<void>,
  stateManager: ButtonStateManager
) => {
  return async () => {
    try {
      // Clear any existing error
      stateManager.setError(buttonId, null);
      
      // Set loading state
      stateManager.setLoading(buttonId, true);
      
      // Execute the handler
      await originalHandler();
      
      // Success - clear loading
      stateManager.setLoading(buttonId, false);
      
    } catch (error) {
      // Error occurred
      stateManager.setLoading(buttonId, false);
      stateManager.setError(buttonId, error instanceof Error ? error.message : 'An error occurred');
      
    }
  };
};

/**
 * Button state utilities
 */
export const ButtonStateUtils = {
  /**
   * Determine if button should be disabled
   */
  shouldDisable: (
    isExplicitlyDisabled: boolean = false,
    isLoading: boolean = false,
    hasError: boolean = false,
    anyButtonLoading: boolean = false
  ): boolean => {
    return isExplicitlyDisabled || isLoading || anyButtonLoading;
  },

  /**
   * Get button opacity based on state
   */
  getButtonOpacity: (
    isEnabled: boolean,
    isLoading: boolean,
    hasError: boolean
  ): number => {
    if (!isEnabled && !isLoading) return 0.5;
    if (isLoading) return 0.8;
    if (hasError) return 0.7;
    return 1.0;
  },

  /**
   * Get appropriate feedback message for button action
   */
  getFeedbackMessage: (
    buttonId: 'buy' | 'lock' | 'booking',
    result: ButtonActionResult
  ): string => {
    const buttonName = buttonId.charAt(0).toUpperCase() + buttonId.slice(1);
    
    if (result.success) {
      switch (buttonId) {
        case 'buy':
          return result.message || 'Item added to cart successfully!';
        case 'lock':
          return result.message || 'Product locked successfully!';
        case 'booking':
          return result.message || 'Booking initiated successfully!';
        default:
          return `${buttonName} action completed successfully!`;
      }
    } else {
      return result.error || `${buttonName} action failed. Please try again.`;
    }
  },

  /**
   * Validate button interaction conditions
   */
  validateButtonInteraction: (
    buttonId: 'buy' | 'lock' | 'booking',
    currentState: StoreActionButtonsState
  ): { isValid: boolean; reason?: string } => {
    // Check if this button is already loading
    if (currentState.loadingStates[buttonId]) {
      return { isValid: false, reason: `${buttonId} action is already in progress` };
    }

    // Check if any other button is loading
    const otherButtonsLoading = Object.entries(currentState.loadingStates)
      .filter(([key]) => key !== buttonId)
      .some(([, isLoading]) => isLoading);

    if (otherButtonsLoading) {
      return { isValid: false, reason: 'Please wait for the current action to complete' };
    }

    return { isValid: true };
  },
};
