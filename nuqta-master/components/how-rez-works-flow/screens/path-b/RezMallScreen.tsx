import React from 'react';
import { BRAND } from '@/constants/brand';
import { View, Text, StyleSheet } from 'react-native';
import FlowScreenLayout from '../../shared/FlowScreenLayout';
import ActionBtn from '../../shared/ActionBtn';
import { NavigationAction, BackAction } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const features = [
    { icon: 'star', text: 'Curated premium brands', color: '#D946EF' },
    { icon: 'pricetag', text: `Exclusive ${BRAND.APP_NAME} offers`, color: colors.brand.pink },
    { icon: 'wallet', text: 'Extra cashback on top', color: colors.nileBlue },
];

const RezMallScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Shop trusted brands with extra rewards"
            onBack={onBack}
            footer={<ActionBtn title="Shop Now" onPress={() => onNavigate('FINAL')} />}
        >
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="storefront" size={40} color={colors.brand.pink} />
                </View>
                <Text style={styles.cardTitle}>{BRAND.APP_NAME} Mall Experience</Text>

                <View style={styles.featuresContainer}>
                    {features.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <Ionicons name={feature.icon as any} size={20} color={feature.color} />
                            <Text style={styles.featureText}>{feature.text}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FDF2F8',
        borderRadius: 24,
        padding: 24,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#FBCFE8',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#831843',
        marginBottom: 20,
    },
    featuresContainer: {
        gap: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        color: colors.neutral[700],
        fontWeight: '500',
    },
});

export default React.memo(RezMallScreen);
