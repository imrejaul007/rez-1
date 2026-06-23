// @ts-nocheck
// components/ScratchCardOffer.tsx
import { colors } from '@/constants/theme';
import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import CachedImage from '@/components/ui/CachedImage';
import { ScratchCardOfferProps } from "@/types/profile";

const ScratchCardOffer: React.FC<ScratchCardOfferProps> = ({ 
  imageSource, 
  onPress, 
  title,
  description,
  isActive = true 
}) => {
  return (
    <Pressable
      style={[styles.container, !isActive && styles.inactiveContainer]}
      onPress={isActive ? onPress : undefined}
     
      disabled={!isActive}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Scratch card offer${title ? `: ${title}` : ''}${description ? `. ${description}` : ''}`}
      accessibilityHint={isActive ? "Double tap to view this scratch card offer" : "This offer has expired"}
      accessibilityState={{ disabled: !isActive }}
    >
      <CachedImage
        source={imageSource}
        style={[styles.image, !isActive && styles.inactiveImage]}
        contentFit="cover"
        transition={200}
        accessible={false}
      />
      {(title || description) && (
        <View style={styles.textContainer}>
          {title && (
            <Text
              style={styles.title}
              accessible={false}
            >
              {title}
            </Text>
          )}
          {description && (
            <Text
              style={styles.description}
              accessible={false}
            >
              {description}
            </Text>
          )}
        </View>
      )}
      {!isActive && (
        <View style={styles.overlay}>
          <Text
            style={styles.inactiveText}
            accessible={false}
          >
            Expired
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    aspectRatio: 5.5, // keep similar proportion to your screenshot
    marginVertical: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  inactiveContainer: {
    opacity: 0.6,
  },
  inactiveImage: {
    opacity: 0.5,
  },
  textContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 8,
  },
  title: {
    color: colors.darkGray,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  inactiveText: {
    color: colors.midGray,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(ScratchCardOffer);
