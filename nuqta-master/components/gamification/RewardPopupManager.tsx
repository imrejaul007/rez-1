/**
 * Reward Popup Manager
 *
 * Renders the reward unlocked popup globally.
 * This component should be placed in the app root layout.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRewardPopup } from '@/contexts/RewardPopupContext';
import RewardUnlockedPopup from './RewardUnlockedPopup';

export default function RewardPopupManager() {
  const { currentPopup, dismissPopup } = useRewardPopup();

  if (!currentPopup) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <RewardUnlockedPopup data={currentPopup} onDismiss={dismissPopup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998, // Below ToastManager but above other content
  },
});
