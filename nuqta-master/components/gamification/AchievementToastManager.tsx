import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AchievementToast from './AchievementToast';
import { useGamification } from '@/contexts/GamificationContext';
import { useRouter } from 'expo-router';

export default function AchievementToastManager() {
  const router = useRouter();
  const { state, actions } = useGamification();
  const [currentAchievement, setCurrentAchievement] = useState<any>(null);

  useEffect(() => {
    // Show the first unshown achievement from the queue
    const nextAchievement = state.achievementQueue.find((item) => !item.shown);

    if (nextAchievement && !currentAchievement) {
      setCurrentAchievement(nextAchievement);
    }
  }, [state.achievementQueue, currentAchievement]);

  const handleDismiss = () => {
    if (currentAchievement) {
      // Mark as shown
      actions.markAchievementAsShown(currentAchievement.achievement.id);
      setCurrentAchievement(null);
    }
  };

  const handlePress = () => {
    // Navigate to achievements page
    router.push('/profile/achievements' as any);
    handleDismiss();
  };

  if (!currentAchievement) return null;

  return (
    <View style={styles.container}>
      <AchievementToast
        achievement={currentAchievement.achievement}
        onDismiss={handleDismiss}
        onPress={handlePress}
        autoHideDuration={5000}
      />
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});
