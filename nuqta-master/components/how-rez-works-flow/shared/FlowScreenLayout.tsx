import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface FlowScreenLayoutProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    noScroll?: boolean;
    headerAccent?: string;
}

const FlowScreenLayout: React.FC<FlowScreenLayoutProps> = ({
    title,
    subtitle,
    onBack,
    children,
    footer,
    noScroll = false,
    headerAccent = colors.successScale[700],
}) => {
    const insets = useSafeAreaInsets();

    const ContentWrapper = noScroll ? View : ScrollView;
    const contentProps = noScroll ? { style: styles.content } : {
        style: styles.scrollView,
        contentContainerStyle: styles.scrollContent,
        showsVerticalScrollIndicator: false
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Decorative background elements */}
            <View style={styles.decorativeContainer}>
                <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: `${headerAccent}08` }]} />
                <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: `${headerAccent}05` }]} />
            </View>

            {/* Header */}
            <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.header}
            >
                <LinearGradient
                    colors={[colors.background.primary, '#FAFAFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.headerGradient}
                >
                    {onBack && (
                        <Pressable
                            onPress={onBack}
                            style={styles.backButton}
                           
                        >
                            <View style={styles.backButtonInner}>
                                <Ionicons name="chevron-back" size={22} color={colors.neutral[700]} />
                            </View>
                        </Pressable>
                    )}
                    <View style={styles.titleContainer}>
                        <View style={styles.titleRow}>
                            <View style={[styles.accentBar, { backgroundColor: headerAccent }]} />
                            <Text style={styles.title}>{title}</Text>
                        </View>
                        {subtitle && (
                            <Animated.Text
                                entering={FadeInDown.delay(100).duration(300)}
                                style={styles.subtitle}
                            >
                                {subtitle}
                            </Animated.Text>
                        )}
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Content */}
            <ContentWrapper {...contentProps}>
                <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                    {children}
                </Animated.View>
            </ContentWrapper>

            {/* Footer */}
            {footer && (
                <Animated.View
                    entering={FadeIn.delay(200).duration(300)}
                    style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 80) + 16 }]}
                >
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)', 'rgba(255,255,255,1)']}
                        style={styles.footerGradient}
                    >
                        <View style={styles.footerContent}>
                            {footer}
                        </View>
                    </LinearGradient>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    decorativeContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    circle1: {
        width: 300,
        height: 300,
        top: -100,
        right: -100,
    },
    circle2: {
        width: 200,
        height: 200,
        bottom: 100,
        left: -80,
    },
    header: {
        zIndex: 10,
    },
    headerGradient: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    backButton: {
        marginRight: 14,
        marginTop: 2,
    },
    backButtonInner: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    titleContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    accentBar: {
        width: 4,
        height: 28,
        borderRadius: 2,
        marginRight: 12,
        marginTop: 4,
    },
    title: {
        flex: 1,
        fontSize: 24,
        fontWeight: '800',
        color: colors.neutral[900],
        lineHeight: 32,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: colors.neutral[500],
        marginTop: 8,
        marginLeft: 16,
        lineHeight: 22,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 200,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footerGradient: {
        paddingTop: 24,
    },
    footerContent: {
        backgroundColor: colors.background.primary,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
            },
            android: {
                elevation: 12,
            },
        }),
    },
});

export default React.memo(FlowScreenLayout);
