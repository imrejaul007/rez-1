import React from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { CategoryTileProps, CategoryColor } from '@/types/earnPage.types';
import { CATEGORY_GRADIENTS, CATEGORY_SOLID_COLORS, EARN_COLORS } from '@/constants/EarnPageColors';
import { colors } from '@/constants/theme';

function CategoryTile({ 
  category, 
  onPress, 
  size = 'medium' 
}: CategoryTileProps) {
  const gradient = CATEGORY_GRADIENTS[category.color] || [colors.brand.green, '#00A85C', colors.brand.teal];
  const solidColor = CATEGORY_SOLID_COLORS[category.color] || colors.brand.green;
  
  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          container: { height: 80 },
          iconSize: 20,
          fontSize: 11,
          padding: 12,
        };
      case 'large':
        return {
          container: { height: 120 },
          iconSize: 28,
          fontSize: 15,
          padding: 20,
        };
      default: // medium
        return {
          container: { height: 100 },
          iconSize: 24,
          fontSize: 13,
          padding: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles(size);

  return (
    <Pressable
      style={[styles.container, sizeStyles.container]}
      onPress={onPress}
     
      accessibilityLabel={`${category.name} category${category.projectCount > 0 ? `. ${category.projectCount} project${category.projectCount !== 1 ? 's' : ''} available` : ''}`}
      accessibilityRole="button"
      accessibilityHint={category.isActive ? `Double tap to view ${category.name} projects` : 'Coming soon'}
      accessibilityState={{ disabled: !category.isActive }}
    >
      <LinearGradient
        colors={Array.isArray(gradient) && gradient.length > 0 ? gradient : [colors.brand.green, '#00A85C', colors.brand.teal]}
        style={[styles.gradient, { padding: sizeStyles.padding }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={category.icon as any} 
              size={sizeStyles.iconSize} 
              color={colors.background.primary} 
            />
          </View>
          
          <ThemedText 
            style={[
              styles.categoryName, 
              { fontSize: sizeStyles.fontSize }
            ]} 
            numberOfLines={2}
          >
            {category.name}
          </ThemedText>
          
          {category.projectCount > 0 && (
            <View style={styles.projectCount}>
              <ThemedText style={styles.projectCountText}>
                {category.projectCount}
              </ThemedText>
            </View>
          )}
        </View>
        
        {!category.isActive && (
          <View style={styles.inactiveOverlay}>
            <ThemedText style={styles.inactiveText}>Coming Soon</ThemedText>
          </View>
        )}
      </LinearGradient>
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 192, 106, 0.2)',
      },
    }),
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  categoryName: {
    color: colors.background.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
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
        textShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  projectCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 200, 87, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  projectCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default React.memo(CategoryTile);
