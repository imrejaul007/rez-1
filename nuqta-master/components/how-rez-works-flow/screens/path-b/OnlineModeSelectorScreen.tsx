import React from 'react';
import { BRAND } from '@/constants/brand';
import FlowScreenLayout from '../../shared/FlowScreenLayout';
import OptionCard from '../../shared/OptionCard';
import { NavigationAction, BackAction } from '../../types';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const OnlineModeSelectorScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="How do you want to shop online?"
            subtitle={`${BRAND.APP_NAME} gives you rewards on almost everything online.`}
            onBack={onBack}
        >
            <OptionCard
                title={`${BRAND.APP_NAME} Mall`}
                subtitle="Curated brands + extra rewards"
                icon="bag-handle"
                iconColor={colors.brand.pink}
                colors={['#FDF2F8', colors.pinkMist]}
                onPress={() => onNavigate('B2')}
            />

            <OptionCard
                title="Cash Store"
                subtitle="Any website + affiliate cashback"
                icon="globe-outline"
                iconColor={colors.brand.orange}
                colors={[colors.tint.orange, '#FFEDD5']}
                onPress={() => onNavigate('B3')}
            />
        </FlowScreenLayout>
    );
};

export default React.memo(OnlineModeSelectorScreen);
