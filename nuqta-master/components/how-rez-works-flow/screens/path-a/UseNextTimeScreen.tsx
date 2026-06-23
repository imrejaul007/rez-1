import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FlowScreenLayout from '../../shared/FlowScreenLayout';
import ActionBtn from '../../shared/ActionBtn';
import { NavigationAction, BackAction } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const UseNextTimeScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    const getCurrencySymbol = useGetCurrencySymbol();
    const currencySymbol = getCurrencySymbol();
    return (
        <FlowScreenLayout
            title="Use rewards next time"
            subtitle={`The more you use ${BRAND.APP_NAME}, the more you save.`}
            onBack={onBack}
            footer={<ActionBtn title="Continue Shopping" onPress={() => onNavigate('FINAL')} />}
        >
            <View style={styles.billCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Next Bill Example</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Bill Amount</Text>
                    <Text style={styles.value}>{currencySymbol}500</Text>
                </View>

                <View style={[styles.row, styles.discountRow]}>
                    <View style={styles.discountLabel}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.nileBlue} />
                        <Text style={styles.discountText}>{`Use 100 ${BRAND.COIN_NAME}`}</Text>
                    </View>
                    <Text style={styles.discountValue}>- {currencySymbol}100</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <Text style={styles.totalLabel}>You Pay</Text>
                    <Text style={styles.totalValue}>{currencySymbol}400</Text>
                </View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    billCard: {
        marginTop: 24,
        backgroundColor: colors.background.primary,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        marginBottom: 20,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        color: colors.neutral[700],
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral[800],
    },
    discountRow: {
        backgroundColor: colors.linen,
        padding: 12,
        borderRadius: 12,
        marginHorizontal: -12,
    },
    discountLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    discountText: {
        fontSize: 15,
        color: colors.nileBlue,
        fontWeight: '500',
    },
    discountValue: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.nileBlue,
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral[200],
        marginVertical: 12,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.neutral[800],
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.neutral[800],
    },
});

export default React.memo(UseNextTimeScreen);
