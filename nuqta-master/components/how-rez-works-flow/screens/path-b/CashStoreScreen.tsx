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

const steps = [
    { text: 'Visit any brand or e-commerce site' },
    { text: `${BRAND.APP_NAME} tracks your purchase` },
    { text: 'Earn affiliate cashback' },
    { text: 'Buy brand coupons & vouchers' },
];

const CashStoreScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Shop anywhere. Still earn rewards."
            onBack={onBack}
            footer={<ActionBtn title="Go to Cash Store" onPress={() => onNavigate('B4')} />}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <Ionicons name="globe" size={32} color={colors.brand.orange} />
                    <Text style={styles.headerText}>Universal Savings</Text>
                </View>

                <View style={styles.list}>
                    {steps.map((step, index) => (
                        <View key={index} style={styles.item}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.brand.orange} />
                            <Text style={styles.itemText}>{step.text}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.tint.orange,
        borderRadius: 24,
        padding: 24,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#9A3412',
    },
    list: {
        gap: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemText: {
        fontSize: 16,
        color: colors.neutral[700],
    },
});

export default React.memo(CashStoreScreen);
