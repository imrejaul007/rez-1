import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { DisplayChallenge } from '@/hooks/usePlayAndEarnData';
import { earnStyles as styles } from './styles';

interface ChallengesSectionProps {
  challenges: DisplayChallenge[];
  loading: boolean;
  navigateTo: (path: string) => void;
}

const ChallengesSection = React.memo(function ChallengesSection({
  challenges,
  loading,
  navigateTo,
}: ChallengesSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderWithLink}>
        <View>
          <Text style={styles.sectionTitle}>Active Challenges</Text>
          <Text style={styles.sectionSubtitle}>Complete to earn bonus coins</Text>
        </View>
        <Pressable onPress={() => navigateTo('/missions')}>
          <Text style={styles.viewAllLink}>{`View all \u2192`}</Text>
        </Pressable>
      </View>

      {challenges.length === 0 && !loading && (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>No active challenges. Check back soon!</Text>
        </View>
      )}

      {challenges.map((challenge) => (
        <Pressable
          key={challenge.id}
          style={styles.challengeCard}
          onPress={() => navigateTo(`/challenges/${challenge.id}`)}
        >
          <View style={styles.challengeHeader}>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
              <View>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeTime}>{challenge.timeLeft}</Text>
              </View>
            </View>
            <View style={styles.challengeReward}>
              <Text style={styles.challengeCoins}>+{challenge.reward} coins</Text>
              {challenge.isJoined ? (
                <Text style={styles.challengeProgress}>{challenge.progress}%</Text>
              ) : (
                <View style={{ backgroundColor: Colors.info, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm }}>
                  <Text style={{ color: Colors.text.inverse, fontSize: 11, fontWeight: '600' }}>Join</Text>
                </View>
              )}
            </View>
          </View>
          {challenge.isJoined && (
            <View style={styles.challengeProgressBar}>
              <View style={[styles.challengeProgressFill, { width: `${challenge.progress}%` }]} />
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
});

export default ChallengesSection;
