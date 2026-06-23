// @ts-nocheck
/**
 * EventHeader - Hero image, title, date, location overlay
 *
 * Renders the hero section with image background, category badge,
 * title, organizer, meta info (date/time/location), and action buttons.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EventItem } from '@/types/homepage.types';
import { CategoryTheme } from '@/constants/categoryThemes';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface EventHeaderProps {
  eventDetails: EventItem;
  categoryTheme: CategoryTheme;
  imageError: boolean;
  imageOpacity: Animated.Value;
  isFavorited: boolean;
  isLoadingFavorite: boolean;
  HORIZONTAL_PADDING: number;
  screenData: { width: number; height: number };
  onBack: () => void;
  onShare: () => void;
  onFavorite: () => void;
  onImageLoad: () => void;
  onImageError: () => void;
}

const EventHeader = React.memo(function EventHeader({
  eventDetails,
  categoryTheme,
  imageError,
  imageOpacity,
  isFavorited,
  isLoadingFavorite,
  HORIZONTAL_PADDING,
  screenData,
  onBack,
  onShare,
  onFavorite,
  onImageLoad,
  onImageError,
}: EventHeaderProps) {
  const heroHeight = Math.min(Math.max(screenData.height * 0.4, 320), 460);

  return (
    <View style={[styles.heroSection, { height: heroHeight }]}>
      {!imageError ? (
        <ImageBackground
          source={eventDetails.image}
          style={styles.heroBackground}
          contentFit="cover"
          onLoad={onImageLoad}
          onError={onImageError}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
            style={styles.heroOverlay}
          >
            {/* Header Actions */}
            <View style={[styles.header, { paddingHorizontal: HORIZONTAL_PADDING }]}>
              <Pressable style={styles.backButton} onPress={onBack}>
                <Ionicons name="chevron-back" size={24} color={colors.background.primary} />
              </Pressable>
              <View style={styles.headerActions}>
                <Pressable style={styles.actionButton} onPress={onShare}>
                  <Ionicons name="share-outline" size={20} color={colors.background.primary} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={onFavorite}
                  disabled={isLoadingFavorite}
                >
                  {isLoadingFavorite ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <Ionicons
                      name={isFavorited ? 'heart' : 'heart-outline'}
                      size={20}
                      color={isFavorited ? Colors.error : Colors.text.inverse}
                    />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Event Info */}
            <View style={[styles.heroContent, { paddingHorizontal: HORIZONTAL_PADDING }]}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryTheme.badgeBackground }]}>
                <Ionicons name={categoryTheme.icon as any} size={14} color={colors.background.primary} style={{ marginRight: 6 }} />
                <Text style={styles.categoryText}>{eventDetails.category}</Text>
              </View>
              <Text style={styles.heroTitle}>{eventDetails.title}</Text>
              <Text style={styles.heroSubtitle}>by {eventDetails.organizer}</Text>
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.background.primary} />
                  <Text style={styles.heroMetaText}>{eventDetails.date}</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.background.primary} />
                  <Text style={styles.heroMetaText}>{eventDetails.time}</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <Ionicons
                    name={eventDetails.isOnline ? 'globe-outline' : 'location-outline'}
                    size={16}
                    color={colors.background.primary}
                  />
                  <Text style={styles.heroMetaText}>{eventDetails.location}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.heroBackground, styles.imagePlaceholder]}>
          <LinearGradient
            colors={categoryTheme.gradientColors}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name={categoryTheme.icon as any} size={80} color="rgba(255,255,255,0.3)" />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
            style={styles.heroOverlay}
          >
            <View style={[styles.heroContent, { paddingHorizontal: HORIZONTAL_PADDING }]}>
              <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={categoryTheme.icon as any} size={14} color={colors.background.primary} style={{ marginRight: 6 }} />
                <Text style={styles.categoryText}>{eventDetails.category}</Text>
              </View>
              <Text style={styles.heroTitle}>{eventDetails.title}</Text>
              <Text style={styles.heroSubtitle}>by {eventDetails.organizer}</Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  heroSection: {
    position: 'relative',
    width: '100%',
    backgroundColor: colors.text.primary,
  },
  heroBackground: {
    flex: 1,
    width: '100%',
  },
  heroOverlay: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  categoryText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  heroSubtitle: {
    ...Typography.bodyLarge,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.base,
    fontWeight: '500',
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '500',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
});

export default EventHeader;
