import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BRAND } from '@/constants/brand';
import { ValueCard } from '@/services/valueCardsApi';
import { earnStyles as styles } from './styles';

interface WhyRezSectionProps {
  valueCards: ValueCard[];
  navigateTo: (path: string) => void;
}

const WhyRezSection = React.memo(function WhyRezSection({
  valueCards,
  navigateTo,
}: WhyRezSectionProps) {
  const cards = valueCards.length > 0 ? valueCards : [
    { _id: 'f1', emoji: '\u{1F4B0}', title: 'Merchant-Funded', subtitle: 'Real savings, not\ndiscounts', sortOrder: 1 },
    { _id: 'f2', emoji: '\u26A1', title: 'Instant Rewards', subtitle: 'No waiting periods', sortOrder: 2 },
    { _id: 'f3', emoji: '\u{1F3AF}', title: 'Triple Stack', subtitle: 'Cashback + Coins +\nLoyalty', sortOrder: 3 },
    { _id: 'f4', emoji: '\u{1F504}', title: 'High Frequency', subtitle: 'Earn daily,\neverywhere', sortOrder: 4 },
  ] as ValueCard[];

  return (
    <View style={styles.section}>
      <View style={styles.whyRezCard}>
        <Text style={styles.whyRezTitle}>{`Why ${BRAND.APP_NAME} Pays You More`}</Text>
        <View style={styles.whyRezGrid}>
          {cards.map((card) => (
            <Pressable
              key={card._id}
              style={styles.whyRezItem}
              onPress={() => card.deepLinkPath && navigateTo(card.deepLinkPath)}
            >
              <Text style={styles.whyRezEmoji}>{card.emoji}</Text>
              <Text style={styles.whyRezItemTitle}>{card.title}</Text>
              <Text style={styles.whyRezItemSubtitle}>{card.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
});

export default WhyRezSection;
