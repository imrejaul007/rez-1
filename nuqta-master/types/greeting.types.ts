// Greeting types and interfaces

export interface GreetingData {
  message: string;
  timeOfDay: TimeOfDay;
  emoji: string;
  personalizedMessage: string;
  timezone: string;
  localTime: Date;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface GreetingConfig {
  userName?: string;
  timezone?: string;
  language?: 'en' | 'hi' | 'te' | 'ta' | 'bn';
  includeEmoji?: boolean;
  personalized?: boolean;
}

export interface GreetingState {
  currentGreeting: GreetingData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface GreetingContextType {
  state: GreetingState;
  updateGreeting: (config?: GreetingConfig) => Promise<void>;
  getGreetingForTime: (date: Date, config?: GreetingConfig) => GreetingData;
  clearError: () => void;
}

export interface GreetingVariations {
  morning: {
    messages: string[];
    emojis: string[];
  };
  afternoon: {
    messages: string[];
    emojis: string[];
  };
  evening: {
    messages: string[];
    emojis: string[];
  };
  night: {
    messages: string[];
    emojis: string[];
  };
}

export interface TimeBasedGreeting {
  timeOfDay: TimeOfDay;
  message: string;
  emoji: string;
  personalizedMessage: string;
}

// Greeting templates for different languages
export interface GreetingTemplates {
  en: GreetingVariations;
  hi: GreetingVariations;
  te: GreetingVariations;
  ta: GreetingVariations;
  bn: GreetingVariations;
}

// Greeting animation types
export interface GreetingAnimation {
  type: 'fade' | 'slide' | 'bounce' | 'none';
  duration: number;
  delay?: number;
}

export interface GreetingDisplayConfig {
  showEmoji: boolean;
  showTime: boolean;
  showLocation: boolean;
  animation: GreetingAnimation;
  maxLength: number;
}
