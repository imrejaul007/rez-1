/**
 * LoyaltyHubSection Component
 * Displays user's loyalty stats for a category with navigation to My Visits
 */

import React, { memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface LoyaltyHubSectionProps {
    stats: {
        ordersCount: number;
        brandsCount: number;
    };
    categoryName?: string;
}

const LoyaltyHubSection: React.FC<LoyaltyHubSectionProps> = ({
    stats,
    categoryName = 'this category',
}) => {
    const router = useRouter();

    const handlePress = () => {
        router.push('/my-visits' as any);
    };

    // Don't show if no stats available
    if (stats.ordersCount === 0 && stats.brandsCount === 0) {
        return null;
    }

    return (
        <Pressable
            style={styles.container}
            onPress={handlePress}
           
            accessibilityLabel="View your loyalty rewards"
            accessibilityRole="button"
        >
            <LinearGradient
                colors={[colors.lightMustard, colors.brand.goldRich]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={styles.icon}>🏆</Text>
                        <Text style={styles.title}>Your Loyalty Hub</Text>
                    </View>
                    <View style={styles.arrowContainer}>
                        <Ionicons name="chevron-forward" size={20} color={colors.background.primary} />
                    </View>
                </View>

                <Text style={styles.subtitle}>
                    Track your rewards in {categoryName}
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.ordersCount}</Text>
                        <Text style={styles.statLabel}>Total Visits</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.brand.goldBright }]}>
                            {stats.brandsCount}
                        </Text>
                        <Text style={styles.statLabel}>Active Brands</Text>
                    </View>
                </View>

                <View style={styles.ctaRow}>
                    <Text style={styles.ctaText}>View all rewards</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
                </View>
            </LinearGradient>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: colors.lightMustard,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
            web: {
                boxShadow: '0 4px 12px rgba(255, 205, 87, 0.3)',
            },
        }),
    },
    gradient: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    icon: {
        fontSize: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.background.primary,
        letterSpacing: -0.3,
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.background.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 16,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    ctaText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.background.primary,
    },
});

export default memo(LoyaltyHubSection);
