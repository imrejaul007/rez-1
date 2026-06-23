import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BonusZoneCard from '@/components/earn/BonusZoneCard';
import { BonusZoneCampaign } from '@/services/bonusZoneApi';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface BonusZoneSectionProps {
  bonusCampaigns: BonusZoneCampaign[];
  currencySymbol: string;
  navigateTo: (path: string) => void;
}

const BonusZoneSection = React.memo(function BonusZoneSection({
  bonusCampaigns,
  currencySymbol,
  navigateTo,
}: BonusZoneSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="happy" size={24} color={colors.brand.orange} />
        <Text style={styles.sectionTitle}>Bonus Zone</Text>
        {bonusCampaigns.length > 5 && (
          <Pressable onPress={() => navigateTo('/bonus-zone')} style={{ marginLeft: 'auto' }}>
            <Text style={{ fontSize: 13, color: colors.brand.orange, fontWeight: '600' }}>View All</Text>
          </Pressable>
        )}
      </View>

      {bonusCampaigns.length > 0 ? bonusCampaigns.slice(0, 5).map((campaign) => (
        <BonusZoneCard
          key={campaign.slug}
          campaign={campaign}
          currencySymbol={currencySymbol}
        />
      )) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>No active bonus campaigns right now. Check back soon for cashback boosts, bank offers &amp; more!</Text>
        </View>
      )}
    </View>
  );
});

export default BonusZoneSection;
