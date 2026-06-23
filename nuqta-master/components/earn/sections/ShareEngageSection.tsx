import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface SocialAction {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  coins: string;
  description: string;
  path: string;
}

interface ShareEngageSectionProps {
  socialActions: SocialAction[];
  navigateTo: (path: string) => void;
}

const ShareEngageSection = React.memo(function ShareEngageSection({
  socialActions,
  navigateTo,
}: ShareEngageSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="people" size={24} color={colors.brand.pink} />
        <Text style={styles.sectionTitle}>Share & Engage</Text>
        <Pressable
          style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={() => navigateTo('/earn/my-submissions')}
        >
          <Text style={{ fontSize: 12, color: colors.brand.pink, fontWeight: '600' }}>My Submissions</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand.pink} />
        </Pressable>
      </View>

      <View style={styles.socialGrid}>
        {socialActions.map((action, idx) => (
          <Pressable
            key={idx}
            style={styles.socialCard}
            onPress={() => navigateTo(action.path)}
          >
            <Ionicons name={action.icon} size={24} color={colors.brand.pink} />
            <Text style={styles.socialTitle}>{action.title}</Text>
            <Text style={styles.socialDescription}>{action.description}</Text>
            <Text style={styles.socialCoins}>+{action.coins} coins</Text>
          </Pressable>
        ))}
      </View>

      {/* Social Highlight */}
      <LinearGradient
        colors={['#FDF2F8', '#FAF5FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.socialHighlight}
      >
        <Text style={styles.socialHighlightText}>
          {`\u{1F465} `}<Text style={styles.socialHighlightBold}>Friends redeemed your shared deal</Text>{` \u2192 +50 ${BRAND.COIN_NAME}`}
        </Text>
      </LinearGradient>
    </View>
  );
});

export default ShareEngageSection;
