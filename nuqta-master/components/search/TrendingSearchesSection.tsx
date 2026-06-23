import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrendingSearch } from '@/services/searchDiscoveryApi';
import { colors } from '@/constants/theme';

interface TrendingSearchesSectionProps {
  searches: TrendingSearch[];
  onPress: (query: string) => void;
}

function TrendingSearchesSection({
  searches,
  onPress,
}: TrendingSearchesSectionProps) {
  if (!searches || searches.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flame" size={20} color={colors.lightMustard} />
        <Text style={styles.headerText}>Trending on ReZ</Text>
      </View>

      <View style={styles.list}>
        {searches.map((search, index) => (
          <Pressable
            key={search._id || index}
            style={styles.item}
            onPress={() => onPress(search.query)}
           
          >
            <Ionicons name="trending-up-outline" size={18} color={colors.nileBlue} style={styles.itemIcon} />
            <Text style={styles.itemText} numberOfLines={1}>
              {search.query}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  list: {
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.08)',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
  },
});

export default React.memo(TrendingSearchesSection);
