import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface LeaderboardPreviewSectionProps {
  myRank: number | null;
  navigateTo: (path: string) => void;
}

const LeaderboardPreviewSection = React.memo(function LeaderboardPreviewSection({
  myRank,
  navigateTo,
}: LeaderboardPreviewSectionProps) {
  return (
    <View style={styles.section}>
      <LinearGradient
        colors={[colors.tint.blue, '#FAF5FF']}
        style={styles.leaderboardCard}
      >
        <Ionicons name="trophy" size={48} color={Colors.warning} />
        <Text style={styles.leaderboardTitle}>Weekly Leaderboard</Text>
        <Text style={styles.leaderboardText}>
          {myRank
            ? `You're ranked #${myRank} this week\nTop 100 win bonus coins!`
            : 'Complete activities to rank!\nTop 100 win bonus coins!'}
        </Text>
        <Pressable
          style={styles.leaderboardButton}
          onPress={() => navigateTo('/playandearn/leaderboard')}
        >
          <LinearGradient
            colors={[colors.lightMustard, colors.nileBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.leaderboardButtonGradient}
          >
            <Text style={styles.leaderboardButtonText}>View Leaderboard</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
});

export default LeaderboardPreviewSection;
