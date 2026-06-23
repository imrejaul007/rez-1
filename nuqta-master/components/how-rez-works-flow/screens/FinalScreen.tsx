import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
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
import FlowScreenLayout from '../shared/FlowScreenLayout';
import ActionBtn from '../shared/ActionBtn';
import { NavigationAction, BackAction } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const benefits = [
    { icon: 'heart', text: 'Automatic loyalty', desc: 'No cards, no check-ins', color: colors.brand.pink },
    { icon: 'trending-up', text: 'Tier benefits', desc: 'Level up, save more', color: colors.brand.purpleLight },
    { icon: 'gift', text: 'Birthday rewards', desc: 'Special treats on your day', color: colors.warningScale[400] },
    { icon: 'people', text: 'Referral bonuses', desc: 'Share & earn together', color: colors.successScale[400] },
];

// Loop indicator component
const LoopIndicator: React.FC = () => {
    const steps = ['Discover', 'Choose', 'Pay', 'Earn', 'Save'];
    const activeStep = useSharedValue(0);

    useEffect(() => {
        activeStep.value = withRepeat(
            withSequence(
                ...steps.map((_, i) =>
                    withDelay(i * 600, withTiming(i, { duration: 300 }))
                ),
                withDelay(steps.length * 600, withTiming(0, { duration: 0 }))
            ),
            -1,
            false
        );
    }, []);

    return (
        <View style={styles.loopContainer}>
            <View style={styles.loopSteps}>
                {steps.map((step, i) => (
                    <View key={i} style={styles.loopStepWrapper}>
                        <View style={[
                            styles.loopStep,
                            i === 0 && styles.loopStepActive,
                        ]}>
                            <Text style={[
                                styles.loopStepText,
                                i === 0 && styles.loopStepTextActive,
                            ]}>{step}</Text>
                        </View>
                        {i < steps.length - 1 && (
                            <Ionicons name="chevron-forward" size={14} color={colors.neutral[400]} style={styles.loopArrow} />
                        )}
                    </View>
                ))}
            </View>
            <View style={styles.loopRepeat}>
                <Ionicons name="repeat" size={16} color={colors.successScale[700]} />
                <Text style={styles.loopRepeatText}>Repeat & Save More</Text>
            </View>
        </View>
    );
};

const FinalScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    const router = useRouter();
    const heroScale = useSharedValue(0);
    const heroGlow = useSharedValue(0);

    useEffect(() => {
        heroScale.value = withSequence(
            withSpring(1.1, { damping: 8 }),
            withSpring(1, { damping: 12 })
        );
        heroGlow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500 }),
                withTiming(0.5, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const heroStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heroScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(heroGlow.value, [0.5, 1], [0.2, 0.5]),
        transform: [{ scale: interpolate(heroGlow.value, [0.5, 1], [1, 1.3]) }],
    }));

    const handleFinish = () => {
        router.replace('/');
    };

    return (
        <FlowScreenLayout
            title="You're all set!"
            subtitle="The more you use ReZ, the more you save"
            onBack={onBack}
            footer={<ActionBtn title="Start Using ReZ" onPress={handleFinish} icon="rocket" />}
            headerAccent={colors.infoScale[400]}
        >
            <View style={styles.container}>
                {/* Hero icon */}
                <View style={styles.heroWrapper}>
                    <Animated.View style={[styles.heroGlow, glowStyle]} />
                    <Animated.View style={[styles.heroIcon, heroStyle]}>
                        <LinearGradient
                            colors={[colors.infoScale[400], colors.brand.blue, '#1D4ED8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <Ionicons name="rocket" size={52} color={colors.background.primary} />
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* Loop indicator */}
                <Animated.View entering={FadeInUp.delay(300).springify()}>
                    <LoopIndicator />
                </Animated.View>

                {/* Benefits list */}
                <View style={styles.benefitsList}>
                    {benefits.map((benefit, index) => (
                        <Animated.View
                            key={index}
                            entering={FadeInUp.delay(400 + index * 100).springify()}
                            style={styles.benefitCard}
                        >
                            <LinearGradient
                                colors={[colors.background.primary, '#FAFAFA']}
                                style={styles.benefitGradient}
                            >
                                <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}15` }]}>
                                    <Ionicons name={benefit.icon as any} size={22} color={benefit.color} />
                                </View>
                                <View style={styles.benefitContent}>
                                    <Text style={styles.benefitText}>{benefit.text}</Text>
                                    <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                                </View>
                                <View style={styles.checkCircle}>
                                    <Ionicons name="checkmark" size={14} color={colors.background.primary} />
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    ))}
                </View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    heroWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    heroGlow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.infoScale[400],
    },
    heroIcon: {
        ...Platform.select({
            ios: {
                shadowColor: colors.infoScale[400],
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    heroGradient: {
        width: 110,
        height: 110,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loopContainer: {
        backgroundColor: colors.neutral[50],
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    loopSteps: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    loopStepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loopStep: {
        backgroundColor: colors.neutral[200],
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    loopStepActive: {
        backgroundColor: colors.successScale[700],
    },
    loopStepText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral[500],
    },
    loopStepTextActive: {
        color: colors.background.primary,
    },
    loopArrow: {
        marginHorizontal: 4,
    },
    loopRepeat: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    loopRepeatText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.successScale[700],
    },
    benefitsList: {
        width: '100%',
        gap: 12,
    },
    benefitCard: {
        borderRadius: 18,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    benefitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    benefitIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    benefitContent: {
        flex: 1,
    },
    benefitText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.neutral[800],
        marginBottom: 2,
    },
    benefitDesc: {
        fontSize: 13,
        color: colors.neutral[500],
    },
    checkCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.successScale[400],
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default React.memo(FinalScreen);
