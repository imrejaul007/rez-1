import React, { useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import FlowScreenLayout from '../../shared/FlowScreenLayout';
import ActionBtn from '../../shared/ActionBtn';
import { NavigationAction, BackAction } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const SaveAndEarnScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    const getCurrencySymbol = useGetCurrencySymbol();
    const currencySymbol = getCurrencySymbol();
    const discountScale = useSharedValue(0);
    const cashbackScale = useSharedValue(0);
    const coinsScale = useSharedValue(0);
    const totalOpacity = useSharedValue(0);

    useEffect(() => {
        discountScale.value = withDelay(100, withSpring(1, { damping: 12 }));
        cashbackScale.value = withDelay(300, withSpring(1, { damping: 12 }));
        coinsScale.value = withDelay(500, withSpring(1, { damping: 12 }));
        totalOpacity.value = withDelay(700, withSpring(1));
    }, []);

    const discountStyle = useAnimatedStyle(() => ({
        transform: [{ scale: discountScale.value }],
        opacity: discountScale.value,
    }));

    const cashbackStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cashbackScale.value }],
        opacity: cashbackScale.value,
    }));

    const coinsStyle = useAnimatedStyle(() => ({
        transform: [{ scale: coinsScale.value }],
        opacity: coinsScale.value,
    }));

    const totalStyle = useAnimatedStyle(() => ({
        opacity: totalOpacity.value,
        transform: [{ translateY: interpolate(totalOpacity.value, [0, 1], [20, 0], Extrapolation.CLAMP) }],
    }));

    return (
        <FlowScreenLayout
            title="You saved & earned!"
            subtitle="Here's what you got from this purchase"
            onBack={onBack}
            footer={<ActionBtn title="See Wallet" onPress={() => onNavigate('SOCIAL')} />}
        >
            <View style={styles.container}>
                {/* Discount Applied */}
                <Animated.View style={[styles.card, discountStyle]}>
                    <LinearGradient
                        colors={[colors.tint.amberLight, colors.warningScale[200]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        <View style={styles.cardIcon}>
                            <Ionicons name="pricetag" size={28} color={colors.warningScale[400]} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Discount Applied</Text>
                            <Text style={[styles.cardValue, { color: colors.brand.amberDeep }]}>- {currencySymbol}75 OFF</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color={colors.warningScale[400]} />
                    </LinearGradient>
                </Animated.View>

                {/* Cashback Earned */}
                <Animated.View style={[styles.card, cashbackStyle]}>
                    <LinearGradient
                        colors={[colors.linen, colors.lightPeach]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        <View style={styles.cardIcon}>
                            <Ionicons name="cash" size={28} color={colors.nileBlue} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Cashback Earned</Text>
                            <Text style={[styles.cardValue, { color: '#047857' }]}>+ {currencySymbol}50</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color={colors.nileBlue} />
                    </LinearGradient>
                </Animated.View>

                {/* Coins Added */}
                <Animated.View style={[styles.card, coinsStyle]}>
                    <LinearGradient
                        colors={[colors.tint.purple, '#DDD6FE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        <View style={styles.cardIcon}>
                            <Ionicons name="layers" size={28} color={colors.brand.purple} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>{BRAND.COIN_NAME} Added</Text>
                            <Text style={[styles.cardValue, { color: colors.brand.purpleDeep }]}>+ 35 Coins</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color={colors.brand.purple} />
                    </LinearGradient>
                </Animated.View>

                {/* Total Savings */}
                <Animated.View style={[styles.totalCard, totalStyle]}>
                    <LinearGradient
                        colors={[colors.neutral[800], colors.neutral[700]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.totalGradient}
                    >
                        <View style={styles.totalHeader}>
                            <Ionicons name="sparkles" size={20} color="#FCD34D" />
                            <Text style={styles.totalLabel}>TOTAL SAVINGS</Text>
                        </View>
                        <Text style={styles.totalValue}>{currencySymbol}125</Text>
                        <Text style={styles.totalSubtext}>+ 35 coins for future use</Text>
                    </LinearGradient>
                </Animated.View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
    },
    cardIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardLabel: {
        fontSize: 14,
        color: colors.neutral[600],
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    totalCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginTop: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    totalGradient: {
        padding: 28,
        borderRadius: 24,
        alignItems: 'center',
    },
    totalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    totalLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.neutral[400],
        letterSpacing: 2,
    },
    totalValue: {
        fontSize: 48,
        fontWeight: '900',
        color: colors.background.primary,
        marginBottom: 8,
    },
    totalSubtext: {
        fontSize: 15,
        color: colors.neutral[400],
    },
});

export default React.memo(SaveAndEarnScreen);
