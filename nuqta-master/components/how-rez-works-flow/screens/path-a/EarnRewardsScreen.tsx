import React, { useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
    FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import FlowScreenLayout from '../../shared/FlowScreenLayout';
import ActionBtn from '../../shared/ActionBtn';
import { NavigationAction, BackAction } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

// Floating coin component for celebration effect
const FloatingCoin: React.FC<{ delay: number; startX: number }> = ({ delay, startX }) => {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(startX);
    const opacity = useSharedValue(0);
    const rotate = useSharedValue(0);

    useEffect(() => {
        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(1500, withTiming(0, { duration: 300 }))
        ));
        translateY.value = withDelay(delay, withTiming(-150, {
            duration: 2000,
            easing: Easing.out(Easing.cubic),
        }));
        rotate.value = withDelay(delay, withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            2,
            false
        ));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { rotate: `${rotate.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.floatingCoin, style]}>
            <Ionicons name="star" size={16} color={colors.warningScale[400]} />
        </Animated.View>
    );
};

const EarnRewardsScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    const getCurrencySymbol = useGetCurrencySymbol();
    const currencySymbol = getCurrencySymbol();
    const scale = useSharedValue(0);
    const glow = useSharedValue(0);

    useEffect(() => {
        scale.value = withSequence(
            withSpring(1.15, { damping: 8 }),
            withSpring(1, { damping: 12 })
        );
        glow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0.5, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(glow.value, [0.5, 1], [0.3, 0.6]),
        transform: [{ scale: interpolate(glow.value, [0.5, 1], [1, 1.2]) }],
    }));

    return (
        <FlowScreenLayout
            title="You earned rewards!"
            onBack={onBack}
            footer={<ActionBtn title="View Wallet" onPress={() => onNavigate('A4')} />}
            headerAccent={colors.nileBlue}
        >
            <View style={styles.container}>
                {/* Floating celebration coins */}
                <View style={styles.celebrationContainer}>
                    {[-40, -20, 0, 20, 40].map((x, i) => (
                        <FloatingCoin key={i} delay={i * 100} startX={x} />
                    ))}
                </View>

                {/* Main reward icon */}
                <View style={styles.iconWrapper}>
                    <Animated.View style={[styles.glowRing, glowStyle]} />
                    <Animated.View style={[styles.iconContainer, iconStyle]}>
                        <LinearGradient
                            colors={[colors.lightMustard, colors.nileBlue]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradient}
                        >
                            <Ionicons name="wallet" size={64} color={colors.background.primary} />
                        </LinearGradient>
                        <View style={styles.coinBadge}>
                            <LinearGradient
                                colors={[colors.warningScale[400], colors.warningScale[400]]}
                                style={styles.badgeGradient}
                            >
                                <Ionicons name="checkmark" size={20} color={colors.background.primary} />
                            </LinearGradient>
                        </View>
                    </Animated.View>
                </View>

                {/* Celebration text */}
                <Animated.View
                    entering={FadeInUp.delay(400).springify()}
                    style={styles.celebrationText}
                >
                    <Text style={styles.congratsEmoji}>🎉</Text>
                    <Text style={styles.congratsText}>Congratulations!</Text>
                </Animated.View>

                {/* Rewards card */}
                <Animated.View
                    entering={FadeInUp.delay(500).springify()}
                    style={styles.rewardsCard}
                >
                    <LinearGradient
                        colors={[colors.background.primary, colors.neutral[50]]}
                        style={styles.rewardsGradient}
                    >
                        {/* Cashback row */}
                        <View style={styles.rewardRow}>
                            <View style={[styles.rewardIcon, { backgroundColor: colors.linen }]}>
                                <Ionicons name="cash" size={24} color={colors.nileBlue} />
                            </View>
                            <View style={styles.rewardInfo}>
                                <Text style={styles.rewardLabel}>Cashback</Text>
                                <Text style={[styles.rewardValue, { color: colors.nileBlue }]}>+ {currencySymbol}50</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Coins row */}
                        <View style={styles.rewardRow}>
                            <View style={[styles.rewardIcon, { backgroundColor: colors.tint.amberLight }]}>
                                <Ionicons name="layers" size={24} color={colors.warningScale[400]} />
                            </View>
                            <View style={styles.rewardInfo}>
                                <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
                                <Text style={[styles.rewardValue, { color: colors.warningScale[400] }]}>+ 40</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 20,
    },
    celebrationContainer: {
        position: 'absolute',
        top: 80,
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    floatingCoin: {
        position: 'absolute',
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    glowRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.lightMustard,
    },
    iconContainer: {
        width: 130,
        height: 130,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: colors.nileBlue,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    iconGradient: {
        width: 130,
        height: 130,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        borderRadius: 20,
        borderWidth: 4,
        borderColor: colors.background.primary,
        overflow: 'hidden',
    },
    badgeGradient: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    celebrationText: {
        alignItems: 'center',
        marginBottom: 28,
    },
    congratsEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    congratsText: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.neutral[800],
        letterSpacing: -0.5,
    },
    rewardsCard: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    rewardsGradient: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    rewardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    rewardIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rewardInfo: {
        flex: 1,
    },
    rewardLabel: {
        fontSize: 14,
        color: colors.neutral[500],
        marginBottom: 4,
    },
    rewardValue: {
        fontSize: 28,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral[100],
        marginVertical: 16,
    },
});

export default React.memo(EarnRewardsScreen);
