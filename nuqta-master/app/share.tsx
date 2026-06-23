// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Share Experience Page
 * Allows users to share their experiences with stores/products
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getImagePicker } from '@/utils/lazyImports';
import { Share } from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primaryGreen: Colors.gold,
  primaryGold: Colors.warning,
  textPrimary: Colors.text.primary,
  textSecondary: Colors.text.tertiary,
  white: Colors.background.primary,
  background: Colors.background.secondary,
  border: Colors.border.default,
};

function SharePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [caption, setCaption] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const isMounted = useIsMounted();

  const handleAddImage = async () => {
    try {
      const ImagePicker = await getImagePicker();
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        platformAlertSimple('Permission Required', 'Please grant access to your photos to add images');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - selectedImages.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        if (!isMounted()) return;
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to pick images. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleShare = async () => {
    if (!caption.trim() && selectedImages.length === 0) {
      platformAlertSimple('Required', 'Please add a caption or at least one image');
      return;
    }

    setIsSharing(true);
    try {
      const shareText = `Check out my experience!${rating > 0 ? `\nRating: ${rating}/5` : ''}\n\n${caption || 'Great experience!'}`;
      
      if (Platform.OS === 'web') {
        // On web, use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: 'My Experience',
            text: shareText,
          });
        } else if (navigator.clipboard?.writeText) {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareText);
          platformAlertSimple('Copied!', 'Content copied to clipboard');
        } else {
          platformAlertSimple('Share', 'Sharing is not supported on this browser');
        }
      } else {
        // On native platforms, use React Native Share API
        const result = await Share.share({
          message: shareText,
          title: 'My Experience',
        });
        
        if (result.action === Share.sharedAction) {
          platformAlertSimple('Success', 'Your experience has been shared!');
        }
      }
      
      // Navigate back after successful share
      setTimeout(() => {
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      }, 500);
    } catch (error: any) {
      // User cancelled or error occurred - don't show error for cancellation
      if (error.message !== 'User did not share' && !error.message.includes('cancel')) {
        platformAlertSimple('Error', 'Failed to share. Please try again.');
      }
    } finally {
      if (!isMounted()) return;
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Share Your Experience</Text>
        <Pressable 
          onPress={handleShare} 
          style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.shareButtonText}>Share</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Rewards Banner */}
        <View style={styles.rewardsBanner}>
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.15)', 'rgba(251, 191, 36, 0.15)']}
            style={styles.rewardsGradient}
          >
            <Ionicons name="gift" size={24} color={COLORS.primaryGold} />
            <View style={styles.rewardsText}>
              <Text style={styles.rewardsTitle}>Earn 50 ${BRAND.COIN_NAME}!</Text>
              <Text style={styles.rewardsSubtitle}>Share your experience and get rewarded</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={COLORS.primaryGold}
                  style={styles.star}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Write a caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Share your thoughts about this experience..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            value={caption}
            onChangeText={setCaption}
            textAlignVertical="top"
          />
        </View>

        {/* Add Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <View style={styles.photosGrid}>
            <Pressable style={styles.addPhotoButton} onPress={handleAddImage}>
              <Ionicons name="camera-outline" size={32} color={COLORS.textSecondary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </Pressable>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.photoContainer}>
                <CachedImage source={image} style={styles.photo} />
                <Pressable
                  style={styles.removePhoto}
                  onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.white} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Share Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share to</Text>
          <View style={styles.shareOptions}>
            {[
              { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
              { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
              { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
              { id: 'twitter', name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
            ].map((platform) => (
              <Pressable key={platform.id} style={styles.shareOption}>
                <View style={[styles.shareOptionIcon, { backgroundColor: platform.color + '20' }]}>
                  <Ionicons name={platform.icon as any} size={24} color={platform.color} />
                </View>
                <Text style={styles.shareOptionText}>{platform.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for a great post</Text>
          <View style={styles.tipsList}>
            {[
              'Add clear, well-lit photos',
              'Mention what you loved',
              'Be honest and helpful',
              'Tag the store for visibility',
            ].map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryGreen} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  shareButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  shareButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    ...Typography.body,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  rewardsBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  rewardsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  rewardsText: {
    flex: 1,
  },
  rewardsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  rewardsSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  star: {
    marginHorizontal: Spacing.xs,
  },
  captionInput: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Typography.body,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
    marginTop: Spacing.xs,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareOption: {
    alignItems: 'center',
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shareOptionText: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
  },
  tipsSection: {
    margin: Spacing.base,
    padding: Spacing.base,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
  },
  tipsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default withErrorBoundary(SharePage, 'Share');
