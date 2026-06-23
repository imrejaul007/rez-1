import React from 'react';
import { BRAND } from '@/constants/brand';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import FlowScreenLayout from '../shared/FlowScreenLayout';
import OptionCard from '../shared/OptionCard';
import { NavigationAction } from '../types';
import { colors } from '@/constants/theme';

interface RootScreenProps {
    onNavigate: NavigationAction;
}

const options = [
    {
        title: 'Visit a nearby store',
        subtitle: 'Find stores & pay via QR',
        icon: 'storefront' as const,
        iconColor: colors.nileBlue,
        colors: [colors.linen, colors.linen] as [string, string],
        screen: 'A1' as const,
    },
    {
        title: 'Order online / delivery',
        subtitle: `${BRAND.APP_NAME} Mall & Cash Store`,
        icon: 'cart' as const,
        iconColor: colors.infoScale[400],
        colors: [colors.tint.blue, colors.tint.blueLight] as [string, string],
        screen: 'B1' as const,
    },
    {
        title: 'Browse offers & deals',
        subtitle: 'Nearby offers & Today\'s deals',
        icon: 'pricetag' as const,
        iconColor: colors.brand.purple,
        colors: [colors.tint.purpleLight, colors.tint.purple] as [string, string],
        screen: 'C1' as const,
    },
    {
        title: `Understand ${BRAND.APP_NAME} Wallet`,
        subtitle: 'Coins, rewards & transparency',
        icon: 'wallet' as const,
        iconColor: colors.warningScale[400],
        colors: [colors.tint.amber, colors.tint.amberLight] as [string, string],
        screen: 'D1' as const,
    },
];

const RootScreen: React.FC<RootScreenProps> = ({ onNavigate }) => {
    const router = useRouter();

    return (
        <FlowScreenLayout
            title="How do you want to shop today?"
            subtitle={`Choose your path. ${BRAND.APP_NAME} adapts to you.`}
            onBack={() => router.back()}
            headerAccent={colors.nileBlue}
        >
            {/* Welcome banner */}
            <Animated.View
                entering={FadeInUp.delay(50).springify()}
                style={styles.welcomeBanner}
            >
                <LinearGradient
                    colors={[colors.nileBlue, '#14303f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bannerGradient}
                >
                    <View style={styles.bannerIcon}>
                        <Ionicons name="sparkles" size={20} color={colors.background.primary} />
                    </View>
                    <Text style={styles.bannerText}>
                        {`Discover how ${BRAND.APP_NAME} saves you money on every purchase`}
                    </Text>
                </LinearGradient>
            </Animated.View>

            {/* Options */}
            {options.map((option, index) => (
                <Animated.View
                    key={index}
                    entering={FadeInUp.delay(100 + index * 80).springify()}
                >
                    <OptionCard
                        title={option.title}
                        subtitle={option.subtitle}
                        icon={option.icon}
                        iconColor={option.iconColor}
                        colors={option.colors}
                        onPress={() => onNavigate(option.screen)}
                        index={index}
                    />
                </Animated.View>
            ))}
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    welcomeBanner: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: colors.nileBlue,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    bannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    bannerIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bannerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: colors.background.primary,
        lineHeight: 20,
    },
});

export default React.memo(RootScreen);
