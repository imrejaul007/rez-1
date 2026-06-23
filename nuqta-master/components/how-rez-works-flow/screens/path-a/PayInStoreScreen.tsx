import React from 'react';
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
    { icon: 'qr-code-outline', text: 'Scan ReZ QR at the counter' },
    { icon: 'keypad-outline', text: 'Enter bill amount' },
    { icon: 'wallet-outline', text: 'Apply coins (optional)' },
    { icon: 'card-outline', text: 'Pay via UPI / Card / Wallet' },
];

const PayInStoreScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Pay like you always do"
            subtitle="Just like UPI — but with rewards built in."
            onBack={onBack}
            footer={<ActionBtn title="Pay & Earn" onPress={() => onNavigate('A3')} />}
        >
            <View style={styles.stepsContainer}>
                {steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                        <View style={styles.stepIconContainer}>
                            <Ionicons name={step.icon as any} size={24} color={colors.infoScale[400]} />
                            {index < steps.length - 1 && <View style={styles.connector} />}
                        </View>
                        <View style={styles.stepTextContainer}>
                            <Text style={styles.stepText}>{step.text}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    stepsContainer: {
        marginTop: 24,
        backgroundColor: colors.tint.coolGray,
        padding: 24,
        borderRadius: 24,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 8, // Spacing handled by connector height mostly
    },
    stepIconContainer: {
        alignItems: 'center',
        marginRight: 16,
        width: 32,
    },
    connector: {
        width: 2,
        height: 32,
        backgroundColor: colors.tint.blueLight,
        marginVertical: 4,
    },
    stepTextContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 2,
    },
    stepText: {
        fontSize: 16,
        color: colors.neutral[700],
        fontWeight: '500',
        lineHeight: 24,
    },
});

export default React.memo(PayInStoreScreen);
