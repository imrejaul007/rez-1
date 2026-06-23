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

const items = [
    { label: 'Where coins came from', icon: 'log-in-outline' },
    { label: 'When they expire', icon: 'hourglass-outline' },
    { label: 'Where you can use them', icon: 'storefront-outline' },
];

const TransparencyScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Full transparency"
            subtitle="You control your data and your rewards."
            onBack={onBack}
            footer={<ActionBtn title="Use Coins Now" onPress={() => onNavigate('FINAL')} />}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <Ionicons name="shield-checkmark" size={48} color={colors.successScale[700]} />
                </View>

                <View style={styles.list}>
                    {items.map((item, index) => (
                        <View key={index} style={styles.item}>
                            <Ionicons name={item.icon as any} size={24} color={colors.successScale[700]} />
                            <Text style={styles.itemText}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.successScale[50],
        borderRadius: 24,
        padding: 32,
        marginTop: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.successScale[200],
    },
    header: {
        marginBottom: 32,
    },
    list: {
        width: '100%',
        gap: 20,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    itemText: {
        fontSize: 18,
        color: '#065F46',
        fontWeight: '600',
    },
});

export default React.memo(TransparencyScreen);
