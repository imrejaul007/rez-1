import React, { useEffect } from 'react';
import { BRAND } from '@/constants/brand';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    FadeInUp,
    FadeIn,
} from 'react-native-reanimated';
import FlowScreenLayout from '../shared/FlowScreenLayout';
import ActionBtn from '../shared/ActionBtn';
import { NavigationAction, BackAction } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const promises = [
    {
        icon: 'eye-off',
        title: 'No hidden rules',
        subtitle: 'What you see is what you get',
    },
    {
        icon: 'notifications-off',
        title: 'No forced ads',
        subtitle: 'Only relevant offers for you',
    },
    {
        icon: 'wallet',
        title: 'Full wallet transparency',
        subtitle: 'Track every coin, every reward',
    },
    {
        icon: 'shield-checkmark',
        title: 'You control your data',
        subtitle: 'Privacy-first, always',
    },
];

const TrustControlScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    const shieldScale = useSharedValue(0.5);
    const shieldOpacity = useSharedValue(0);

    useEffect(() => {
        shieldScale.value = withSequence(
            withSpring(1.1, { damping: 10 }),
            withSpring(1, { damping: 15 })
        );
        shieldOpacity.value = withSpring(1);
    }, []);

    const shieldStyle = useAnimatedStyle(() => ({
        transform: [{ scale: shieldScale.value }],
        opacity: shieldOpacity.value,
    }));

    return (
        <FlowScreenLayout
            title={`${BRAND.APP_NAME} Promise`}
            subtitle="Our commitment to you"
            onBack={onBack}
            footer={<ActionBtn title={`Start Using ${BRAND.APP_NAME}`} onPress={() => onNavigate('FINAL')} />}
        >
            <View style={styles.container}>
                {/* Shield Hero */}
                <Animated.View style={[styles.shieldContainer, shieldStyle]}>
                    <LinearGradient
                        colors={[colors.successScale[700], '#047857']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.shieldGradient}
                    >
                        <Ionicons name="shield-checkmark" size={56} color={colors.background.primary} />
                    </LinearGradient>
                    <View style={styles.shieldBadge}>
                        <Ionicons name="checkmark" size={18} color={colors.background.primary} />
                    </View>
                </Animated.View>

                {/* Promise Cards */}
                <View style={styles.promisesContainer}>
                    {promises.map((promise, index) => (
                        <Animated.View
                            key={index}
                            entering={FadeInUp.delay(200 + index * 100).springify()}
                            style={styles.promiseCard}
                        >
                            <LinearGradient
                                colors={[colors.background.primary, colors.neutral[50]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.promiseGradient}
                            >
                                <View style={styles.checkCircle}>
                                    <Ionicons name="checkmark" size={14} color={colors.background.primary} />
                                </View>
                                <View style={styles.promiseIcon}>
                                    <Ionicons name={promise.icon as any} size={22} color={colors.successScale[700]} />
                                </View>
                                <View style={styles.promiseContent}>
                                    <Text style={styles.promiseTitle}>{promise.title}</Text>
                                    <Text style={styles.promiseSubtitle}>{promise.subtitle}</Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    ))}
                </View>

                {/* Trust Badge */}
                <Animated.View
                    entering={FadeIn.delay(800)}
                    style={styles.trustBadge}
                >
                    <LinearGradient
                        colors={[colors.successScale[50], colors.successScale[100]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.trustGradient}
                    >
                        <View style={styles.trustContent}>
                            <Ionicons name="heart" size={20} color={colors.successScale[700]} />
                            <Text style={styles.trustText}>
                                Trusted by 10,000+ users across India
                            </Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        alignItems: 'center',
    },
    shieldContainer: {
        marginBottom: 32,
        position: 'relative',
    },
    shieldGradient: {
        width: 100,
        height: 100,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.successScale[700],
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.35,
                shadowRadius: 20,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    shieldBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.successScale[400],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background.primary,
    },
    promisesContainer: {
        width: '100%',
        gap: 12,
    },
    promiseCard: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    promiseGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.successScale[400],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    promiseIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.tint.greenLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    promiseContent: {
        flex: 1,
    },
    promiseTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.neutral[800],
        marginBottom: 2,
    },
    promiseSubtitle: {
        fontSize: 13,
        color: colors.neutral[500],
    },
    trustBadge: {
        marginTop: 28,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    trustGradient: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.successScale[200],
    },
    trustContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    trustText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#047857',
    },
});

export default React.memo(TrustControlScreen);
