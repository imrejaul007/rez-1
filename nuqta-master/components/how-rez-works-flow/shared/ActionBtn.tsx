import React, { useEffect } from 'react';
import { Text, StyleSheet, Platform, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolate,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionBtnProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    icon?: keyof typeof Ionicons.glyphMap;
}

const ActionBtn: React.FC<ActionBtnProps> = ({
    title,
    onPress,
    variant = 'primary',
    icon,
}) => {
    const isPrimary = variant === 'primary';
    const gradientColors: [string, string, string] = isPrimary
        ? [colors.successScale[700], colors.successScale[400], colors.successScale[700]]
        : [colors.neutral[100], colors.background.primary, colors.neutral[100]];
    const textColor = isPrimary ? colors.background.primary : colors.neutral[700];

    const scale = useSharedValue(1);
    const shimmer = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        // Subtle pulse animation for primary button
        if (isPrimary) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
            // Shimmer effect
            shimmer.value = withRepeat(
                withTiming(1, { duration: 2500, easing: Easing.linear }),
                -1,
                false
            );
        }
    }, [isPrimary]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value * (isPrimary ? pulse.value : 1) },
        ],
    }));

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(shimmer.value, [0, 1], [-200, 400]) },
        ],
        opacity: 0.3,
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                styles.container,
                containerStyle,
                isPrimary && styles.primaryShadow,
            ]}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                {/* Shimmer overlay */}
                {isPrimary && (
                    <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                        <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shimmer}
                        />
                    </Animated.View>
                )}

                <View style={styles.content}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={20}
                            color={textColor}
                            style={styles.icon}
                        />
                    )}
                    <Text style={[styles.text, { color: textColor }]}>{title}</Text>
                    {isPrimary && (
                        <Ionicons
                            name="arrow-forward"
                            size={18}
                            color={textColor}
                            style={styles.arrowIcon}
                        />
                    )}
                </View>
            </LinearGradient>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    primaryShadow: {
        ...Platform.select({
            ios: {
                shadowColor: colors.successScale[700],
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    gradient: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 18,
        overflow: 'hidden',
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    shimmer: {
        width: 100,
        height: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: 8,
    },
    text: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    arrowIcon: {
        marginLeft: 8,
        opacity: 0.9,
    },
});

export default React.memo(ActionBtn);
