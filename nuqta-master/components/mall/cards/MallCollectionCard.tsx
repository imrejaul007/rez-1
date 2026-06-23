/**
 * MallCollectionCard Component
 *
 * Card component for displaying curated collection with background image
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MallCollection } from '../../../types/mall.types';
import { colors } from '@/constants/theme';

interface MallCollectionCardProps {
  collection: MallCollection;
  onPress: (collection: MallCollection) => void;
  width?: number;
  height?: number;
}

// Helper to check if string is a valid image URL
const isValidImageUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
};

const MallCollectionCard: React.FC<MallCollectionCardProps> = ({
  collection,
  onPress,
  width = 160,
  height = 180,
}) => {
  const hasValidImage = isValidImageUrl(collection.image);

  // If no valid image, render with gradient only
  if (!hasValidImage) {
    return (
      <Pressable
        style={[styles.container, { width, height }]}
        onPress={() => onPress(collection)}
       
      >
        <LinearGradient
          colors={[colors.nileBlue, colors.brand.nileBlueLight]}
          style={styles.fallbackGradient}
        >
          <View style={styles.content}>
            <Text style={styles.collectionName} numberOfLines={2}>
              {collection.name}
            </Text>
            {collection.brandCount > 0 && (
              <Text style={styles.brandCount}>
                {collection.brandCount} brands
              </Text>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.container, { width, height }]}
      onPress={() => onPress(collection)}
     
    >
      <ImageBackground
        source={{ uri: collection.image }}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Text style={styles.collectionName} numberOfLines={2}>
              {collection.name}
            </Text>
            {collection.brandCount > 0 && (
              <Text style={styles.brandCount}>
                {collection.brandCount} brands
              </Text>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    borderRadius: 16,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    borderRadius: 16,
  },
  fallbackGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    borderRadius: 16,
  },
  content: {
    gap: 4,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  brandCount: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default memo(MallCollectionCard);
