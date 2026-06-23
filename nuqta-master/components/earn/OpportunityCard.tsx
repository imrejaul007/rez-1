import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface OpportunityCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  reward: string;
  onPress: () => void;
  isNew?: boolean;
  category?: string;
}

function OpportunityCard({ 
  title, 
  description, 
  icon, 
  iconColor, 
  reward, 
  onPress,
  isNew = false,
  category
}: OpportunityCardProps) {
  return (
    <Pressable
      style={styles.opportunityCard}
      onPress={onPress}
      accessibilityLabel={`${isNew ? 'New! ' : ''}${title}. ${description}${category ? `. Category: ${category}` : ''}. Reward: ${reward}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to start earning with this opportunity"
    >
      {isNew && (
        <View style={styles.newBadge}>
          <ThemedText style={styles.newText}>NEW</ThemedText>
        </View>
      )}
      
      <View style={styles.opportunityIcon}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      
      <ThemedText style={styles.opportunityTitle}>{title}</ThemedText>
      <ThemedText style={styles.opportunityDescription}>{description}</ThemedText>
      
      {category && (
        <View style={styles.categoryBadge}>
          <ThemedText style={styles.categoryText}>{category}</ThemedText>
        </View>
      )}
      
      <View style={styles.rewardBadge}>
        <ThemedText style={styles.rewardText}>{reward}</ThemedText>
      </View>
      
      <View style={styles.actionButton}>
        <ThemedText style={styles.actionText}>Start Earning</ThemedText>
        <Ionicons name="arrow-forward" size={12} color={colors.brand.purpleLight} />
      </View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  opportunityCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 180,
    justifyContent: 'space-between',
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  opportunityIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 4,
    textAlign: 'center',
  },
  opportunityDescription: {
    fontSize: 12,
    color: colors.midGray,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  categoryBadge: {
    backgroundColor: colors.neutral[100],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    color: colors.slateGray,
    fontWeight: '500',
  },
  rewardBadge: {
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  rewardText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
});

export default React.memo(OpportunityCard);
