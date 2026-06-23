import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickAction } from '@/services/quickActionsApi';
import { Colors } from '@/constants/DesignSystem';
import { earnStyles as styles } from './styles';

interface QuickEarnSectionProps {
  quickActions: QuickAction[];
  navigateTo: (path: string) => void;
}

const QuickEarnSection = React.memo(function QuickEarnSection({
  quickActions,
  navigateTo,
}: QuickEarnSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flash" size={24} color={Colors.warning} />
        <Text style={styles.sectionTitle}>Earn Now</Text>
      </View>

      <View style={styles.quickEarnGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action._id}
            style={styles.quickEarnCard}
            onPress={() => navigateTo(action.deepLinkPath)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${action.iconColor}20` }]}>
              <Ionicons name={(action.icon as keyof typeof Ionicons.glyphMap) || 'flash'} size={24} color={action.iconColor} />
            </View>
            <Text style={styles.quickEarnTitle}>{action.title}</Text>
            <Text style={styles.quickEarnReward}>{action.subtitle}</Text>
            {action.achievementProgress && (
              <View style={{ marginTop: 4, width: '100%' }}>
                <View style={{ height: 3, backgroundColor: Colors.border.default, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 3, backgroundColor: action.iconColor, borderRadius: 2, width: `${Math.min(action.achievementProgress.progress, 100)}%` }} />
                </View>
                <Text style={{ fontSize: 9, color: Colors.text.tertiary, marginTop: 2 }}>{action.achievementProgress.progress}%</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
});

export default QuickEarnSection;
