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

const ProductLockScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Like it? Lock the price."
            subtitle="Not ready to buy? No problem."
            onBack={onBack}
            footer={<ActionBtn title="Lock Product" onPress={() => onNavigate('FINAL')} />}
        >
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={40} color={colors.brand.indigo} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.highlight}>Pay only 10% now</Text>
                    <Text style={styles.description}>
                        Lock the price and availability for a few hours. Decide later without the rush.
                    </Text>
                </View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.indigoMist,
        borderRadius: 24,
        padding: 32,
        marginTop: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: colors.brand.indigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    content: {
        alignItems: 'center',
    },
    highlight: {
        fontSize: 24,
        fontWeight: '800',
        color: '#312E81',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#4338CA',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default React.memo(ProductLockScreen);
