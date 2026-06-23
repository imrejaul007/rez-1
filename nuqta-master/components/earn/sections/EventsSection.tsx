import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface EventsSectionProps {
  eventCategories: any[];
  eventRewardConfig: any;
  navigateTo: (path: string) => void;
}

const EventsSection = React.memo(function EventsSection({
  eventCategories,
  eventRewardConfig,
  navigateTo,
}: EventsSectionProps) {
  return (
    <View style={styles.section}>
      <Pressable
        style={styles.eventsCard}
        onPress={() => navigateTo('/events')}
      >
        <LinearGradient
          colors={['#FAF5FF', '#FDF2F8', colors.tint.orange]}
          style={styles.eventsGradient}
        >
          <View style={styles.eventsHeader}>
            <View style={styles.eventsIconContainer}>
              <Ionicons name="ticket" size={28} color={colors.brand.purpleMedium} />
            </View>
            <View style={styles.eventsHeaderText}>
              <Text style={styles.eventsTitle}>Earn at Events</Text>
              <Text style={styles.eventsSubtitle}>College fests, markets, concerts & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
          </View>

          <View style={styles.eventsTypes}>
            {(eventCategories.length > 0
              ? eventCategories.slice(0, 4).map((cat: any) => ({
                  icon: cat.icon || '\u{1F3AA}',
                  label: cat.name,
                  slug: cat.slug,
                }))
              : [
                  { icon: '\u{1F3AA}', label: 'All Events', slug: '' },
                  { icon: '\u{1F3B5}', label: 'Music', slug: '' },
                  { icon: '\u{1F354}', label: 'Food', slug: '' },
                  { icon: '\u26BD', label: 'Sports', slug: '' },
                ]
            ).map((type: any, idx: number) => (
              <Pressable
                key={idx}
                style={styles.eventType}
                onPress={(e) => {
                  e.stopPropagation();
                  navigateTo(type.slug ? `/events/${type.slug}` : '/events');
                }}
              >
                <Text style={styles.eventTypeIcon}>{type.icon}</Text>
                <Text style={styles.eventTypeLabel}>{type.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.eventsFooter}>
            <Text style={styles.eventsFooterText}>
              {eventRewardConfig
                ? `\u{1F4B0} Ways to earn: ${eventRewardConfig.rewards.map((r: any) => r.description).join(' \u2022 ')}`
                : '\u{1F4B0} Ways to earn: Entry \u2022 Purchases \u2022 Sharing \u2022 Voting \u2022 Participation'}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
});

export default EventsSection;
