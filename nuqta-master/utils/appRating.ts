import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const RATING_STORAGE_KEY = '@app_rating_state';
const POSITIVE_ACTIONS_KEY = '@positive_actions_count';
const ACTIONS_THRESHOLD = 3;
const MIN_DAYS_BETWEEN_PROMPTS = 90;

interface RatingState {
  lastPromptDate: string | null;
  hasRated: boolean;
}

async function getRatingState(): Promise<RatingState> {
  try {
    const raw = await AsyncStorage.getItem(RATING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { lastPromptDate: null, hasRated: false };
  } catch {
    return { lastPromptDate: null, hasRated: false };
  }
}

async function setRatingState(state: RatingState): Promise<void> {
  await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Track a positive user action (order completed, reward earned, etc.)
 * Automatically prompts for review after reaching the threshold.
 */
export async function trackPositiveAction(): Promise<void> {
  try {
    const countStr = await AsyncStorage.getItem(POSITIVE_ACTIONS_KEY);
    const count = (parseInt(countStr || '0', 10) || 0) + 1;
    await AsyncStorage.setItem(POSITIVE_ACTIONS_KEY, String(count));

    if (count >= ACTIONS_THRESHOLD) {
      await maybeRequestReview();
    }
  } catch {
    // Silent fail
  }
}

/**
 * Request an app store review if conditions are met:
 * - User hasn't already rated
 * - At least 90 days since last prompt
 * - Platform supports store review
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    const state = await getRatingState();
    if (state.hasRated) return;

    if (state.lastPromptDate) {
      const daysSince = (Date.now() - new Date(state.lastPromptDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return;
    }

    await StoreReview.requestReview();
    await setRatingState({ ...state, lastPromptDate: new Date().toISOString() });
    await AsyncStorage.setItem(POSITIVE_ACTIONS_KEY, '0');
  } catch {
    // Silent fail — review prompt is non-critical
  }
}
