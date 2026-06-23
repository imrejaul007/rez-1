/**
 * SmartCompareBanner Component
 * Price comparison feature banner
 * Adapted from Rez_v-2-main smart compare pattern
 */

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface SmartCompareBannerProps {
  categorySlug?: string;
  onCompare?: (query: string) => void;
}

const SmartCompareBanner: React.FC<SmartCompareBannerProps> = ({
  categorySlug,
  onCompare,
}) => {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState('');

  const handleCompare = () => {
    if (productUrl.trim()) {
      if (onCompare) {
        onCompare(productUrl);
      } else {
        router.push({
          pathname: '/compare',
          params: { url: productUrl, category: categorySlug },
        } as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.infoScale[400], '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brainIcon}>
            <Text style={styles.brainEmoji}>🧠</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Smart Compare</Text>
            <Text style={styles.subtitle}>Compare prices across Myntra, Ajio, Amazon & more</Text>
          </View>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Paste product URL or name..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={productUrl}
            onChangeText={setProductUrl}
            onSubmitEditing={handleCompare}
            returnKeyType="search"
          />
          <Pressable
            style={styles.compareButton}
            onPress={handleCompare}
           
          >
            <Text style={styles.buttonText}>Compare</Text>
          </Pressable>
        </View>

        {/* Stores */}
        <View style={styles.storesRow}>
          <Text style={styles.storesLabel}>Works with:</Text>
          <View style={styles.storeLogos}>
            {['🛒', '🛍️', '📦', '🏪', '🎯'].map((emoji, i) => (
              <View key={i} style={styles.storeLogo}>
                <Text style={styles.storeEmoji}>{emoji}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.infoScale[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
      },
    }),
  },
  gradient: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brainIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brainEmoji: {
    fontSize: 22,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.background.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  compareButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.infoScale[400],
  },
  storesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storesLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  storeLogos: {
    flexDirection: 'row',
    gap: 6,
  },
  storeLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeEmoji: {
    fontSize: 14,
  },
});

export default memo(SmartCompareBanner);
