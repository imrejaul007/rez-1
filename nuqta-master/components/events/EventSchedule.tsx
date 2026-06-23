/**
 * EventSchedule — Timeline / agenda section + sponsors list.
 *
 * Renders the schedule rows (time + title + description) and
 * the horizontal sponsors scroll, extracted from EventPage.tsx.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { EventItem } from '@/types/homepage.types';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface ScheduleItem {
  startTime?: string;
  title: string;
  description?: string;
}

interface Sponsor {
  name: string;
  logo?: string;
}

interface EventScheduleProps {
  realEventData: EventItem | null;
  HORIZONTAL_PADDING: number;
}

const EventSchedule = React.memo(function EventSchedule({
  realEventData,
  HORIZONTAL_PADDING,
}: EventScheduleProps) {
  const schedule = (realEventData as any)?.schedule as ScheduleItem[] | undefined;
  const sponsors = (realEventData as any)?.sponsors as Sponsor[] | undefined;

  const hasSchedule = schedule && schedule.length > 0;
  const hasSponsors = sponsors && sponsors.length > 0;

  if (!hasSchedule && !hasSponsors) return null;

  return (
    <>
      {/* Schedule Section */}
      {hasSchedule && (
        <View style={[styles.section, { marginHorizontal: HORIZONTAL_PADDING }]}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          {schedule!.map((item, index) => (
            <View
              key={index}
              style={[
                styles.scheduleRow,
                index < schedule!.length - 1 && styles.scheduleRowBorder,
              ]}
            >
              <View style={styles.scheduleTimeCol}>
                <Ionicons name="time-outline" size={18} color={Colors.brand.purpleLight} />
                <Text style={styles.scheduleTimeText}>{item.startTime || ''}</Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleItemTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.scheduleItemDesc}>{item.description}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sponsors Section */}
      {hasSponsors && (
        <View style={[styles.section, { marginHorizontal: HORIZONTAL_PADDING }]}>
          <Text style={styles.sectionTitle}>Sponsors</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sponsorsScroll}
          >
            {sponsors!.map((sponsor, index) => (
              <View key={index} style={styles.sponsorCard}>
                {sponsor.logo ? (
                  <CachedImage source={sponsor.logo} style={styles.sponsorLogo} />
                ) : (
                  <View style={styles.sponsorLogoPlaceholder}>
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={colors.neutral[400]}
                    />
                  </View>
                )}
                <Text style={styles.sponsorName}>{sponsor.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing['2xl'],
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  scheduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  scheduleTimeCol: {
    width: 44,
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  scheduleContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  scheduleItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  scheduleItemDesc: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  sponsorsScroll: {
    marginTop: 8,
  },
  sponsorCard: {
    alignItems: 'center',
    marginRight: Spacing.base,
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    minWidth: 80,
  },
  sponsorLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  sponsorLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sponsorName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
  },
});

export default EventSchedule;
