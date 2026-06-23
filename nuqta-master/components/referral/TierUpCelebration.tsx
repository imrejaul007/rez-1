/**
 * TierUpCelebration — Modal shown when user reaches a new referral tier
 * Uses ConfettiOverlay for celebration effect.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface TierUpCelebrationProps {
  visible: boolean;
  tierName: string;
  bonusCoins?: number;
  onDismiss: () => void;
}

function TierUpCelebration({ visible, tierName, bonusCoins, onDismiss }: TierUpCelebrationProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <ConfettiOverlay visible={visible} />
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.brand.purple, colors.brand.indigo]}
            style={styles.gradient}
          >
            {/* Badge */}
            <View style={styles.badgeCircle}>
              <Ionicons name="trophy" size={36} color="#F59E0B" />
            </View>

            <Text style={styles.congrats}>Congratulations!</Text>
            <Text style={styles.tierText}>You've reached</Text>
            <Text style={styles.tierName}>{tierName} Tier</Text>

            {bonusCoins && bonusCoins > 0 ? (
              <View style={styles.bonusRow}>
                <CachedImage
                  source={BRAND.COIN_IMAGE}
                  style={styles.coinImg}
                  contentFit="contain"
                />
                <Text style={styles.bonusText}>+{bonusCoins} {BRAND.COIN_NAME} bonus!</Text>
              </View>
            ) : null}

            <Text style={styles.subtitle}>
              Keep referring friends to unlock even greater rewards
            </Text>

            <Pressable style={styles.button} onPress={onDismiss}>
              <Text style={styles.buttonText}>Awesome!</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: { shadowColor: colors.brand.purple, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },
  gradient: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  congrats: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tierText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 4,
  },
  tierName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 2,
    marginBottom: 12,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  coinImg: {
    width: 22,
    height: 22,
    backgroundColor: 'transparent',
  },
  bonusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
});

export default React.memo(TierUpCelebration);
