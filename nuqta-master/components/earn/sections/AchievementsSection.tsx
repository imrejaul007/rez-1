import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { DisplayAchievement } from '@/hooks/usePlayAndEarnData';
import { earnStyles as styles } from './styles';

interface AchievementsSectionProps {
  achievements: DisplayAchievement[];
  loading: boolean;
  navigateTo: (path: string) => void;
}

const AchievementsSection = React.memo(function AchievementsSection({
  achievements,
  loading,
  navigateTo,
}: AchievementsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderWithLink}>
        <View>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.sectionSubtitle}>Unlock badges & coins</Text>
        </View>
        <Pressable onPress={() => navigateTo('/badges')}>
          <Text style={styles.viewAllLink}>{`View all \u2192`}</Text>
        </Pressable>
      </View>

      {achievements.length === 0 && !loading && (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>Complete activities to earn achievements!</Text>
        </View>
      )}

      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <View
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.unlocked && styles.achievementUnlocked,
              !achievement.unlocked && styles.achievementLocked,
            ]}
          >
            <View style={styles.achievementHeader}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              {achievement.unlocked && <Text>{'\u2705'}</Text>}
            </View>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementCoins}>+{achievement.coins} coins</Text>
            {!achievement.unlocked && achievement.progress !== undefined && (
              <View style={styles.achievementProgressContainer}>
                <View style={styles.achievementProgressBar}>
                  <View style={[styles.achievementProgressFill, { width: `${achievement.progress}%` }]} />
                </View>
                <Text style={styles.achievementProgressText}>{achievement.progress}% complete</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
});

export default AchievementsSection;
