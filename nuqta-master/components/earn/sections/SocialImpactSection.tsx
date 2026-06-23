import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface SocialImpactSectionProps {
  socialImpactPreview: Array<{ icon: string; label: string; coins: number }>;
  navigateTo: (path: string) => void;
}

const SocialImpactSection = React.memo(function SocialImpactSection({
  socialImpactPreview,
  navigateTo,
}: SocialImpactSectionProps) {
  const activities = socialImpactPreview.length > 0 ? socialImpactPreview : [
    { icon: '\u{1FA78}', label: 'Blood Donation', coins: 200 },
    { icon: '\u{1F333}', label: 'Tree Plantation', coins: 150 },
    { icon: '\u{1F3D6}\uFE0F', label: 'Beach Cleanup', coins: 120 },
    { icon: '\u{1F372}', label: 'NGO Volunteer', coins: 100 },
  ];

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.impactCard}
        onPress={() => navigateTo('/social-impact')}
      >
        <LinearGradient
          colors={[colors.linen, colors.tint.blue, colors.linen]}
          style={styles.impactGradient}
        >
          <View style={styles.impactHeader}>
            <LinearGradient
              colors={[colors.lightMustard, colors.infoScale[400]]}
              style={styles.impactIcon}
            >
              <Ionicons name="heart" size={28} color={Colors.text.inverse} />
            </LinearGradient>
            <View style={styles.impactHeaderText}>
              <View style={styles.impactTitleRow}>
                <Text style={styles.impactTitle}>Social Impact</Text>
                <View style={styles.impactBadge}>
                  <Text style={styles.impactBadgeText}>Powerful Differentiator</Text>
                </View>
              </View>
              <Text style={styles.impactSubtitle}>Earn while making a difference</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
          </View>

          <View style={styles.impactActivities}>
            {activities.map((activity, idx) => (
              <View key={idx} style={styles.impactActivity}>
                <Text style={styles.impactActivityIcon}>{activity.icon}</Text>
                <Text style={styles.impactActivityLabel}>{activity.label}</Text>
                <Text style={styles.impactActivityCoins}>+{activity.coins}</Text>
              </View>
            ))}
          </View>

          <LinearGradient
            colors={[colors.linen, colors.tint.blueLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.impactFooter}
          >
            <Text style={styles.impactFooterText}>
              {`\u{1F4B0} Earn ${BRAND.COIN_NAME} + \u{1F3EA} Branded Coins from sponsors`}
            </Text>
          </LinearGradient>
        </LinearGradient>
      </Pressable>
    </View>
  );
});

export default SocialImpactSection;
