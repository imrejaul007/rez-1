import React from 'react';
import { Text, StyleSheet, View, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface OptionCardProps {
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    colors?: [string, string];
    iconColor?: string;
    index?: number;
}

const OptionCard: React.FC<OptionCardProps> = ({
    title,
    subtitle,
    icon,
    onPress,
    colors: gradientColors = [colors.neutral[100], colors.neutral[50]],
    iconColor = colors.infoScale[400],
    index = 0,
}) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateX: interpolate(pressed.value, [0, 1], [0, 2]) },
        ],
    }));

    const arrowStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(pressed.value, [0, 1], [0, 4]) },
        ],
        opacity: interpolate(pressed.value, [0, 1], [0.5, 1]),
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
        pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        pressed.value = withSpring(0, { damping: 15, stiffness: 400 });
    };

    return (
        <AnimatedPressable
            style={[styles.container, animatedStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Decorative accent line */}
                <View style={[styles.accentLine, { backgroundColor: iconColor }]} />

                <View style={[styles.iconContainer, { borderColor: `${iconColor}20` }]}>
                    <View style={[styles.iconInner, { backgroundColor: `${iconColor}15` }]}>
                        <Ionicons name={icon} size={28} color={iconColor} />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>

                <Animated.View style={[styles.arrowContainer, arrowStyle]}>
                    <View style={styles.arrowBg}>
                        <Ionicons name="chevron-forward" size={20} color={iconColor} />
                    </View>
                </Animated.View>
            </LinearGradient>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        borderRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingLeft: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
        overflow: 'hidden',
    },
    accentLine: {
        position: 'absolute',
        left: 0,
        top: 16,
        bottom: 16,
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    iconInner: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.neutral[800],
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: colors.neutral[500],
        lineHeight: 20,
    },
    arrowContainer: {
        marginLeft: 8,
    },
    arrowBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default React.memo(OptionCard);
